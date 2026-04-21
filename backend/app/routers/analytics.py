from __future__ import annotations

from collections import defaultdict
from datetime import date
from statistics import mean
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.market_indicators import (
    calculate_opportunity_score,
    classify_buy_signal,
    load_indicator_snapshots,
)

router = APIRouter(prefix="/api")

DEFAULT_ANALYTICS_MIN_PRICE = 50.0


def parse_group_ids(group_id: str | None) -> list[int] | None:
    if not group_id:
        return None
    values = [int(value) for value in group_id.split(",") if value.strip()]
    return values or None


def parse_csv_values(raw_value: str | None) -> list[str] | None:
    if not raw_value:
        return None
    values = [value.strip() for value in raw_value.split(",") if value.strip()]
    return values or None


def parse_release_year(published_on: str | None) -> int | None:
    if not published_on:
        return None
    year_text = published_on[:4]
    return int(year_text) if year_text.isdigit() else None


def matches_release_filters(
    published_on: str | None,
    release_year_start: int | None,
    release_year_end: int | None,
) -> bool:
    if release_year_start is None and release_year_end is None:
        return True
    release_year = parse_release_year(published_on)
    if release_year is None:
        return False
    if release_year_start is not None and release_year < release_year_start:
        return False
    if release_year_end is not None and release_year > release_year_end:
        return False
    return True


def matches_group_filter(group_id: int, group_ids: list[int] | None) -> bool:
    return group_ids is None or group_id in group_ids


def matches_value_filter(value: str | None, allowed_values: list[str] | None) -> bool:
    if allowed_values is None:
        return True
    return value in allowed_values


def month_floor(value: date) -> date:
    return date(value.year, value.month, 1)


def shift_month(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def month_label(value: date) -> str:
    return value.strftime("%Y-%m")


def round_or_none(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def calculate_range_position(
    current_price: float | None,
    low_price: float | None,
    high_price: float | None,
) -> float | None:
    if (
        current_price is None
        or low_price is None
        or high_price is None
        or high_price <= low_price
    ):
        return None
    position = (current_price - low_price) / (high_price - low_price)
    return round(max(0.0, min(1.0, position)), 4)


def calculate_rebound_potential(
    current_price: float | None,
    high_price: float | None,
) -> float | None:
    if current_price in (None, 0) or high_price is None:
        return None
    return round((high_price - current_price) / current_price * 100, 2)


def calculate_monthly_opportunity_score(
    month_end_price: float | None,
    month_low_price: float | None,
    month_high_price: float | None,
    monthly_return_pct: float | None,
) -> float | None:
    range_position = calculate_range_position(
        month_end_price, month_low_price, month_high_price
    )
    rebound_potential = calculate_rebound_potential(month_end_price, month_high_price)

    if (
        range_position is None
        and rebound_potential is None
        and monthly_return_pct is None
    ):
        return None

    score = 0.0
    if range_position is not None:
        score += (1.0 - range_position) * 60
    if rebound_potential is not None:
        score += min(max(rebound_potential, 0.0), 120.0) / 120.0 * 30
    if monthly_return_pct is not None and monthly_return_pct < 0:
        score += min(abs(monthly_return_pct), 25.0) / 25.0 * 10
    return round(min(score, 100.0), 1)


def fetch_monthly_market_rows(
    db: Session,
    *,
    category_id: int | None,
    group_ids: list[int] | None,
    rarities: list[str] | None,
    sub_types: list[str] | None,
    release_year_start: int | None,
    release_year_end: int | None,
    min_price: float,
    months: int,
) -> list[dict[str, Any]]:
    latest_complete_month = shift_month(month_floor(date.today()), -1)
    since_month = shift_month(latest_complete_month, -(months - 1))
    until_month = month_floor(date.today())

    sql = text(
        """
        WITH filtered AS (
            SELECT
                ph.product_id,
                ph.sub_type_name,
                ph.date,
                ph.market_price,
                p.name,
                p.image_url,
                p.rarity,
                p.card_number,
                p.url,
                p.category_id,
                c.display_name AS category_name,
                p.group_id,
                g.name AS group_name,
                g.published_on
            FROM price_history ph
            JOIN products p ON p.product_id = ph.product_id
            JOIN groups g ON g.group_id = p.group_id
            JOIN categories c ON c.category_id = p.category_id
            WHERE ph.market_price IS NOT NULL
              AND ph.date >= :since_month
              AND ph.date < :until_month
              AND (:category_id IS NULL OR p.category_id = :category_id)
        ),
        ranked AS (
            SELECT
                *,
                date_trunc('month', date) AS month_start,
                row_number() OVER (
                    PARTITION BY product_id, sub_type_name, date_trunc('month', date)
                    ORDER BY date ASC
                ) AS rn_asc,
                row_number() OVER (
                    PARTITION BY product_id, sub_type_name, date_trunc('month', date)
                    ORDER BY date DESC
                ) AS rn_desc
            FROM filtered
        )
        SELECT
            product_id,
            sub_type_name,
            name,
            image_url,
            rarity,
            card_number,
            url,
            category_id,
            category_name,
            group_id,
            group_name,
            published_on,
            CAST(month_start AS DATE) AS month_start,
            max(CASE WHEN rn_asc = 1 THEN market_price END) AS month_start_price,
            max(CASE WHEN rn_desc = 1 THEN market_price END) AS month_end_price,
            min(market_price) AS month_low_price,
            max(market_price) AS month_high_price,
            count(*) AS observations
        FROM ranked
        GROUP BY
            product_id,
            sub_type_name,
            name,
            image_url,
            rarity,
            card_number,
            url,
            category_id,
            category_name,
            group_id,
            group_name,
            published_on,
            month_start
        HAVING max(CASE WHEN rn_desc = 1 THEN market_price END) >= :min_price
           AND count(*) >= 2
        ORDER BY month_start ASC, product_id ASC, sub_type_name ASC
        """
    )

    rows = db.execute(
        sql,
        {
            "since_month": since_month,
            "until_month": until_month,
            "category_id": category_id,
            "min_price": min_price,
        },
    ).mappings()

    items: list[dict[str, Any]] = []
    for row in rows:
        month_start_price = row["month_start_price"]
        month_end_price = row["month_end_price"]
        month_low_price = row["month_low_price"]
        month_high_price = row["month_high_price"]
        monthly_return_pct = None
        if (
            month_start_price is not None
            and month_start_price > 0
            and month_end_price is not None
        ):
            monthly_return_pct = round(
                (month_end_price - month_start_price) / month_start_price * 100, 2
            )

        items.append(
            {
                "productId": row["product_id"],
                "subTypeName": row["sub_type_name"],
                "name": row["name"],
                "imageUrl": row["image_url"],
                "rarity": row["rarity"],
                "cardNumber": row["card_number"],
                "url": row["url"],
                "categoryId": row["category_id"],
                "categoryName": row["category_name"],
                "groupId": row["group_id"],
                "groupName": row["group_name"],
                "publishedOn": row["published_on"],
                "releaseYear": parse_release_year(row["published_on"]),
                "month": month_label(row["month_start"]),
                "monthStartPrice": round_or_none(month_start_price),
                "monthEndPrice": round_or_none(month_end_price),
                "monthLowPrice": round_or_none(month_low_price),
                "monthHighPrice": round_or_none(month_high_price),
                "monthlyReturnPct": monthly_return_pct,
                "monthlyRangePosition": calculate_range_position(
                    month_end_price, month_low_price, month_high_price
                ),
                "reboundPotentialPct": calculate_rebound_potential(
                    month_end_price, month_high_price
                ),
                "monthlyOpportunityScore": calculate_monthly_opportunity_score(
                    month_end_price,
                    month_low_price,
                    month_high_price,
                    monthly_return_pct,
                ),
                "observations": row["observations"],
            }
        )
    return [
        item
        for item in items
        if matches_group_filter(item["groupId"], group_ids)
        and matches_value_filter(item["rarity"], rarities)
        and matches_value_filter(item["subTypeName"], sub_types)
        and matches_release_filters(
            item["publishedOn"],
            release_year_start,
            release_year_end,
        )
    ]


def fetch_current_card_rows(
    db: Session,
    *,
    category_id: int | None,
    group_ids: list[int] | None,
    rarities: list[str] | None,
    sub_types: list[str] | None,
    release_year_start: int | None,
    release_year_end: int | None,
    min_price: float,
) -> list[dict[str, Any]]:
    sql = text(
        """
        SELECT
            p.product_id,
            pr.sub_type_name,
            p.name,
            p.clean_name,
            p.image_url,
            p.rarity,
            p.card_number,
            p.card_type,
            p.url,
            p.category_id,
            c.display_name AS category_name,
            p.group_id,
            g.name AS group_name,
            g.published_on,
            pr.low_price,
            pr.mid_price,
            pr.high_price,
            pr.market_price,
            pr.direct_low_price,
            ps.pct_change_30d,
            ps.pct_change_90d,
            ps.pct_change_1yr,
            ps.all_time_low,
            ps.all_time_low_date,
            ps.all_time_high,
            ps.all_time_high_date
        FROM prices pr
        JOIN products p ON p.product_id = pr.product_id
        JOIN groups g ON g.group_id = p.group_id
        JOIN categories c ON c.category_id = p.category_id
        LEFT JOIN price_summary ps
            ON ps.product_id = pr.product_id
           AND ps.sub_type_name = pr.sub_type_name
        WHERE pr.market_price IS NOT NULL
          AND pr.market_price >= :min_price
          AND (:category_id IS NULL OR p.category_id = :category_id)
        ORDER BY pr.market_price DESC, p.name ASC, pr.sub_type_name ASC
        """
    )

    rows = (
        db.execute(
            sql,
            {
                "min_price": min_price,
                "category_id": category_id,
            },
        )
        .mappings()
        .all()
    )

    rows = [
        row
        for row in rows
        if matches_group_filter(row["group_id"], group_ids)
        and matches_value_filter(row["rarity"], rarities)
        and matches_value_filter(row["sub_type_name"], sub_types)
        and matches_release_filters(
            row["published_on"],
            release_year_start,
            release_year_end,
        )
    ]

    indicator_snapshots = load_indicator_snapshots(db, [dict(row) for row in rows])
    items: list[dict[str, Any]] = []
    for row in rows:
        snapshot = indicator_snapshots.get(
            (row["product_id"], row["sub_type_name"]),
            {},
        )
        range_position = calculate_range_position(
            row["market_price"], row["all_time_low"], row["all_time_high"]
        )
        potential_gain = calculate_rebound_potential(
            row["market_price"], row["all_time_high"]
        )
        pct_change_30d = round_or_none(row["pct_change_30d"])
        opportunity_score = calculate_opportunity_score(
            range_position=range_position,
            potential_gain_pct=potential_gain,
            pct_change_30d=pct_change_30d,
            snapshot=snapshot,
        )

        composite_score = round(
            ((pct_change_30d or 0) * 0.35)
            + ((round_or_none(row["pct_change_90d"]) or 0) * 0.25)
            + ((round_or_none(row["pct_change_1yr"]) or 0) * 0.15)
            + ((opportunity_score or 0) * 0.25),
            2,
        )

        items.append(
            {
                "productId": row["product_id"],
                "subTypeName": row["sub_type_name"],
                "name": row["name"],
                "cleanName": row["clean_name"],
                "imageUrl": row["image_url"],
                "rarity": row["rarity"],
                "cardNumber": row["card_number"],
                "cardType": row["card_type"],
                "url": row["url"],
                "categoryId": row["category_id"],
                "categoryName": row["category_name"],
                "groupId": row["group_id"],
                "groupName": row["group_name"],
                "publishedOn": row["published_on"],
                "releaseYear": parse_release_year(row["published_on"]),
                "lowPrice": round_or_none(row["low_price"]),
                "midPrice": round_or_none(row["mid_price"]),
                "highPrice": round_or_none(row["high_price"]),
                "marketPrice": round_or_none(row["market_price"]),
                "directLowPrice": round_or_none(row["direct_low_price"]),
                "pctChange30d": pct_change_30d,
                "pctChange90d": round_or_none(row["pct_change_90d"]),
                "pctChange1yr": round_or_none(row["pct_change_1yr"]),
                "allTimeLow": round_or_none(row["all_time_low"]),
                "allTimeLowDate": (
                    row["all_time_low_date"].isoformat()
                    if row["all_time_low_date"] is not None
                    else None
                ),
                "allTimeHigh": round_or_none(row["all_time_high"]),
                "allTimeHighDate": (
                    row["all_time_high_date"].isoformat()
                    if row["all_time_high_date"] is not None
                    else None
                ),
                "rangePosition": range_position,
                "potentialGain": potential_gain,
                "sma20": snapshot.get("sma20"),
                "sma50": snapshot.get("sma50"),
                "sma200": snapshot.get("sma200"),
                "macd": snapshot.get("macd"),
                "macdSignal": snapshot.get("macdSignal"),
                "macdHistogram": snapshot.get("macdHistogram"),
                "priceVsSma20Pct": snapshot.get("priceVsSma20Pct"),
                "priceVsSma50Pct": snapshot.get("priceVsSma50Pct"),
                "priceVsSma200Pct": snapshot.get("priceVsSma200Pct"),
                "smaTrend": snapshot.get("smaTrend"),
                "macdTrend": snapshot.get("macdTrend"),
                "opportunityScore": opportunity_score,
                "buySignal": classify_buy_signal(
                    opportunity_score,
                    snapshot,
                    range_position,
                ),
                "compositeScore": composite_score,
            }
        )
    return items


def build_rank_map(
    items: list[dict[str, Any]],
    value_getter,
    *,
    reverse: bool = True,
) -> dict[tuple[int, str], int]:
    ranked = [item for item in items if value_getter(item) is not None]
    ranked.sort(key=value_getter, reverse=reverse)
    return {
        (item["productId"], item["subTypeName"]): index + 1
        for index, item in enumerate(ranked)
    }


@router.get("/analytics/monthly")
def get_monthly_analytics(
    category_id: int | None = Query(None),
    group_id: str | None = Query(None),
    rarity: str | None = Query(None),
    sub_type: str | None = Query(None),
    release_year_start: int | None = Query(None),
    release_year_end: int | None = Query(None),
    min_price: float = Query(DEFAULT_ANALYTICS_MIN_PRICE, ge=1),
    months: int = Query(6, ge=2, le=24),
    limit: int = Query(10, ge=3, le=25),
    db: Session = Depends(get_db),
):
    monthly_rows = fetch_monthly_market_rows(
        db,
        category_id=category_id,
        group_ids=parse_group_ids(group_id),
        rarities=parse_csv_values(rarity),
        sub_types=parse_csv_values(sub_type),
        release_year_start=release_year_start,
        release_year_end=release_year_end,
        min_price=min_price,
        months=months,
    )
    if not monthly_rows:
        return {
            "minPriceApplied": min_price,
            "latestMonth": None,
            "qualifiedCards": 0,
            "topPerformers": [],
            "topOpportunities": [],
            "recurringCards": [],
            "monthHighlights": [],
        }

    by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in monthly_rows:
        by_month[row["month"]].append(row)

    performer_appearances: dict[tuple[int, str], int] = defaultdict(int)
    opportunity_appearances: dict[tuple[int, str], int] = defaultdict(int)
    month_highlights: list[dict[str, Any]] = []

    for month in sorted(by_month):
        month_items = by_month[month]
        performers = [
            item for item in month_items if item["monthlyReturnPct"] is not None
        ]
        performers.sort(key=lambda item: item["monthlyReturnPct"], reverse=True)
        opportunities = [
            item for item in month_items if item["monthlyOpportunityScore"] is not None
        ]
        opportunities.sort(
            key=lambda item: item["monthlyOpportunityScore"], reverse=True
        )

        for entry in performers[:limit]:
            performer_appearances[(entry["productId"], entry["subTypeName"])] += 1
        for entry in opportunities[:limit]:
            opportunity_appearances[(entry["productId"], entry["subTypeName"])] += 1

        month_highlights.append(
            {
                "month": month,
                "qualifiedCards": len(month_items),
                "averageMonthlyReturn": round_or_none(
                    mean(
                        [
                            item["monthlyReturnPct"]
                            for item in performers
                            if item["monthlyReturnPct"] is not None
                        ]
                    )
                    if performers
                    else None
                ),
                "topPerformerName": performers[0]["name"] if performers else None,
                "topPerformerReturn": (
                    performers[0]["monthlyReturnPct"] if performers else None
                ),
                "topOpportunityName": (
                    opportunities[0]["name"] if opportunities else None
                ),
                "topOpportunityScore": (
                    opportunities[0]["monthlyOpportunityScore"]
                    if opportunities
                    else None
                ),
            }
        )

    latest_month = sorted(by_month)[-1]
    latest_items = by_month[latest_month]

    latest_performers = [
        item for item in latest_items if item["monthlyReturnPct"] is not None
    ]
    latest_performers.sort(key=lambda item: item["monthlyReturnPct"], reverse=True)

    latest_opportunities = [
        item for item in latest_items if item["monthlyOpportunityScore"] is not None
    ]
    latest_opportunities.sort(
        key=lambda item: item["monthlyOpportunityScore"], reverse=True
    )

    recurring_lookup: dict[tuple[int, str], dict[str, Any]] = {}
    for item in monthly_rows:
        key = (item["productId"], item["subTypeName"])
        total_appearances = performer_appearances[key] + opportunity_appearances[key]
        if total_appearances <= 1:
            continue
        current = recurring_lookup.get(key)
        if current is None or item["month"] == latest_month:
            recurring_lookup[key] = {
                **item,
                "performerAppearances": performer_appearances[key],
                "opportunityAppearances": opportunity_appearances[key],
                "totalAppearances": total_appearances,
            }

    recurring_cards = sorted(
        recurring_lookup.values(),
        key=lambda item: (
            item["totalAppearances"],
            item["performerAppearances"],
            item["opportunityAppearances"],
            item["monthlyReturnPct"] or -999,
        ),
        reverse=True,
    )[:limit]

    return {
        "minPriceApplied": min_price,
        "latestMonth": latest_month,
        "qualifiedCards": len(latest_items),
        "topPerformers": [
            {
                **item,
                "appearanceCount": performer_appearances[
                    (item["productId"], item["subTypeName"])
                ],
            }
            for item in latest_performers[:limit]
        ],
        "topOpportunities": [
            {
                **item,
                "appearanceCount": opportunity_appearances[
                    (item["productId"], item["subTypeName"])
                ],
            }
            for item in latest_opportunities[:limit]
        ],
        "recurringCards": recurring_cards,
        "monthHighlights": month_highlights,
    }


@router.get("/analytics/sets")
def get_set_analytics(
    category_id: int | None = Query(None),
    group_id: str | None = Query(None),
    rarity: str | None = Query(None),
    sub_type: str | None = Query(None),
    release_year_start: int | None = Query(None),
    release_year_end: int | None = Query(None),
    min_price: float = Query(DEFAULT_ANALYTICS_MIN_PRICE, ge=1),
    months: int = Query(6, ge=3, le=24),
    limit: int = Query(18, ge=5, le=40),
    db: Session = Depends(get_db),
):
    current_cards = fetch_current_card_rows(
        db,
        category_id=category_id,
        group_ids=parse_group_ids(group_id),
        rarities=parse_csv_values(rarity),
        sub_types=parse_csv_values(sub_type),
        release_year_start=release_year_start,
        release_year_end=release_year_end,
        min_price=min_price,
    )
    monthly_rows = fetch_monthly_market_rows(
        db,
        category_id=category_id,
        group_ids=parse_group_ids(group_id),
        rarities=parse_csv_values(rarity),
        sub_types=parse_csv_values(sub_type),
        release_year_start=release_year_start,
        release_year_end=release_year_end,
        min_price=min_price,
        months=months,
    )

    current_by_set: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for card in current_cards:
        current_by_set[card["groupId"]].append(card)

    monthly_by_set_month: dict[tuple[int, str], list[dict[str, Any]]] = defaultdict(
        list
    )
    for row in monthly_rows:
        monthly_by_set_month[(row["groupId"], row["month"])] += [row]

    summaries: list[dict[str, Any]] = []
    for group_id, cards in current_by_set.items():
        cards_sorted_by_return = sorted(
            [card for card in cards if card["pctChange30d"] is not None],
            key=lambda card: card["pctChange30d"],
            reverse=True,
        )
        cards_sorted_by_opportunity = sorted(
            [card for card in cards if card["opportunityScore"] is not None],
            key=lambda card: card["opportunityScore"],
            reverse=True,
        )
        summaries.append(
            {
                "groupId": group_id,
                "groupName": cards[0]["groupName"],
                "categoryId": cards[0]["categoryId"],
                "categoryName": cards[0]["categoryName"],
                "publishedOn": cards[0]["publishedOn"],
                "releaseYear": cards[0]["releaseYear"],
                "trackedCards": len(cards),
                "avgMarketPrice": round_or_none(
                    mean([card["marketPrice"] for card in cards if card["marketPrice"]])
                ),
                "avg30dChange": round_or_none(
                    mean(
                        [
                            card["pctChange30d"]
                            for card in cards
                            if card["pctChange30d"] is not None
                        ]
                    )
                    if any(card["pctChange30d"] is not None for card in cards)
                    else None
                ),
                "avg90dChange": round_or_none(
                    mean(
                        [
                            card["pctChange90d"]
                            for card in cards
                            if card["pctChange90d"] is not None
                        ]
                    )
                    if any(card["pctChange90d"] is not None for card in cards)
                    else None
                ),
                "avgOpportunityScore": round_or_none(
                    (
                        mean(
                            [
                                card["opportunityScore"]
                                for card in cards
                                if card["opportunityScore"] is not None
                            ]
                        )
                        if any(card["opportunityScore"] is not None for card in cards)
                        else None
                    ),
                    1,
                ),
                "opportunityCount": len(
                    [
                        card
                        for card in cards
                        if card["opportunityScore"] is not None
                        and card["opportunityScore"] >= 60
                    ]
                ),
                "bestPerformer": (
                    {
                        "productId": cards_sorted_by_return[0]["productId"],
                        "name": cards_sorted_by_return[0]["name"],
                        "pctChange30d": cards_sorted_by_return[0]["pctChange30d"],
                    }
                    if cards_sorted_by_return
                    else None
                ),
                "bestOpportunity": (
                    {
                        "productId": cards_sorted_by_opportunity[0]["productId"],
                        "name": cards_sorted_by_opportunity[0]["name"],
                        "opportunityScore": cards_sorted_by_opportunity[0][
                            "opportunityScore"
                        ],
                    }
                    if cards_sorted_by_opportunity
                    else None
                ),
            }
        )

    summaries.sort(
        key=lambda item: (
            item["avgOpportunityScore"] or -1,
            item["trackedCards"],
            item["avg30dChange"] or -999,
        ),
        reverse=True,
    )

    featured_ids = {summary["groupId"] for summary in summaries[: min(limit, 6)]}
    featured_history: list[dict[str, Any]] = []
    for (group_id, month), rows in sorted(
        monthly_by_set_month.items(), key=lambda item: item[0][1]
    ):
        if group_id not in featured_ids:
            continue
        returns = [
            row["monthlyReturnPct"]
            for row in rows
            if row["monthlyReturnPct"] is not None
        ]
        opportunity_rows = [
            row for row in rows if row["monthlyOpportunityScore"] is not None
        ]
        featured_history.append(
            {
                "groupId": group_id,
                "groupName": rows[0]["groupName"],
                "month": month,
                "qualifiedCards": len(rows),
                "averageMonthlyReturn": round_or_none(
                    mean(returns) if returns else None
                ),
                "averageMonthEndPrice": round_or_none(
                    mean(
                        [
                            row["monthEndPrice"]
                            for row in rows
                            if row["monthEndPrice"] is not None
                        ]
                    )
                ),
                "opportunityCards": len(
                    [
                        row
                        for row in opportunity_rows
                        if row["monthlyOpportunityScore"] is not None
                        and row["monthlyOpportunityScore"] >= 60
                    ]
                ),
            }
        )

    return {
        "minPriceApplied": min_price,
        "setCount": len(summaries),
        "sets": summaries[:limit],
        "featuredHistory": featured_history,
    }


@router.get("/analytics/sets/{group_id}/history")
def get_set_history(
    group_id: int,
    rarity: str | None = Query(None),
    sub_type: str | None = Query(None),
    min_price: float = Query(DEFAULT_ANALYTICS_MIN_PRICE, ge=1),
    months: int = Query(12, ge=3, le=36),
    db: Session = Depends(get_db),
):
    current_cards = [
        card
        for card in fetch_current_card_rows(
            db,
            category_id=None,
            group_ids=None,
            rarities=parse_csv_values(rarity),
            sub_types=parse_csv_values(sub_type),
            release_year_start=None,
            release_year_end=None,
            min_price=min_price,
        )
        if card["groupId"] == group_id
    ]
    monthly_rows = [
        row
        for row in fetch_monthly_market_rows(
            db,
            category_id=None,
            group_ids=None,
            rarities=parse_csv_values(rarity),
            sub_types=parse_csv_values(sub_type),
            release_year_start=None,
            release_year_end=None,
            min_price=min_price,
            months=months,
        )
        if row["groupId"] == group_id
    ]

    if not current_cards and not monthly_rows:
        return {
            "groupId": group_id,
            "groupName": None,
            "minPriceApplied": min_price,
            "history": [],
            "cards": [],
        }

    by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in monthly_rows:
        by_month[row["month"]].append(row)

    history: list[dict[str, Any]] = []
    for month in sorted(by_month):
        rows = by_month[month]
        returns = [
            row["monthlyReturnPct"]
            for row in rows
            if row["monthlyReturnPct"] is not None
        ]
        strongest_card = sorted(
            [row for row in rows if row["monthlyReturnPct"] is not None],
            key=lambda row: row["monthlyReturnPct"],
            reverse=True,
        )
        history.append(
            {
                "month": month,
                "qualifiedCards": len(rows),
                "averageMonthlyReturn": round_or_none(
                    mean(returns) if returns else None
                ),
                "averageMonthEndPrice": round_or_none(
                    mean(
                        [
                            row["monthEndPrice"]
                            for row in rows
                            if row["monthEndPrice"] is not None
                        ]
                    )
                ),
                "opportunityCards": len(
                    [
                        row
                        for row in rows
                        if row["monthlyOpportunityScore"] is not None
                        and row["monthlyOpportunityScore"] >= 60
                    ]
                ),
                "leaderCardName": strongest_card[0]["name"] if strongest_card else None,
                "leaderCardReturn": (
                    strongest_card[0]["monthlyReturnPct"] if strongest_card else None
                ),
            }
        )

    cards = sorted(
        current_cards,
        key=lambda card: (
            card["opportunityScore"] or -1,
            card["pctChange30d"] or -999,
        ),
        reverse=True,
    )[:12]

    return {
        "groupId": group_id,
        "groupName": (
            current_cards[0]["groupName"]
            if current_cards
            else monthly_rows[0]["groupName"]
        ),
        "categoryName": (
            current_cards[0]["categoryName"]
            if current_cards
            else monthly_rows[0]["categoryName"]
        ),
        "minPriceApplied": min_price,
        "history": history,
        "cards": cards,
    }


@router.get("/analytics/leaderboard")
def get_leaderboard(
    category_id: int | None = Query(None),
    group_id: str | None = Query(None),
    rarity: str | None = Query(None),
    sub_type: str | None = Query(None),
    release_year_start: int | None = Query(None),
    release_year_end: int | None = Query(None),
    min_price: float = Query(DEFAULT_ANALYTICS_MIN_PRICE, ge=1),
    months: int = Query(6, ge=3, le=24),
    limit: int = Query(30, ge=10, le=100),
    metric: str = Query("composite"),
    db: Session = Depends(get_db),
):
    current_cards = fetch_current_card_rows(
        db,
        category_id=category_id,
        group_ids=parse_group_ids(group_id),
        rarities=parse_csv_values(rarity),
        sub_types=parse_csv_values(sub_type),
        release_year_start=release_year_start,
        release_year_end=release_year_end,
        min_price=min_price,
    )
    monthly_rows = fetch_monthly_market_rows(
        db,
        category_id=category_id,
        group_ids=parse_group_ids(group_id),
        rarities=parse_csv_values(rarity),
        sub_types=parse_csv_values(sub_type),
        release_year_start=release_year_start,
        release_year_end=release_year_end,
        min_price=min_price,
        months=months,
    )

    metric_getters = {
        "30d": lambda item: item["pctChange30d"],
        "90d": lambda item: item["pctChange90d"],
        "1yr": lambda item: item["pctChange1yr"],
        "opportunity": lambda item: item["opportunityScore"],
        "composite": lambda item: item["compositeScore"],
    }
    selected_metric = metric if metric in metric_getters else "composite"

    rank_30d = build_rank_map(current_cards, metric_getters["30d"])
    rank_90d = build_rank_map(current_cards, metric_getters["90d"])
    rank_1yr = build_rank_map(current_cards, metric_getters["1yr"])
    rank_opportunity = build_rank_map(current_cards, metric_getters["opportunity"])
    current_rank = build_rank_map(current_cards, metric_getters[selected_metric])

    month_rank_maps: dict[str, dict[tuple[int, str], int]] = {}
    by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in monthly_rows:
        by_month[row["month"]].append(row)

    for month, rows in by_month.items():
        ranked_rows = [row for row in rows if row["monthlyReturnPct"] is not None]
        ranked_rows.sort(key=lambda row: row["monthlyReturnPct"], reverse=True)
        month_rank_maps[month] = {
            (row["productId"], row["subTypeName"]): index + 1
            for index, row in enumerate(ranked_rows)
        }

    sorted_months = sorted(by_month)
    latest_month = sorted_months[-1] if sorted_months else None
    previous_month = sorted_months[-2] if len(sorted_months) > 1 else None

    current_cards.sort(
        key=lambda item: (
            metric_getters[selected_metric](item) is not None,
            metric_getters[selected_metric](item) or -999999,
        ),
        reverse=True,
    )

    leaderboard_rows: list[dict[str, Any]] = []
    for card in current_cards[:limit]:
        key = (card["productId"], card["subTypeName"])
        history = [
            {
                "month": month,
                "rank": month_rank_maps.get(month, {}).get(key),
                "monthlyReturnPct": next(
                    (
                        row["monthlyReturnPct"]
                        for row in by_month[month]
                        if row["productId"] == card["productId"]
                        and row["subTypeName"] == card["subTypeName"]
                    ),
                    None,
                ),
            }
            for month in sorted_months
        ]
        appearance_count = len(
            [
                point
                for point in history
                if point["rank"] is not None and point["rank"] <= limit
            ]
        )
        latest_rank = (
            month_rank_maps.get(latest_month, {}).get(key) if latest_month else None
        )
        previous_rank = (
            month_rank_maps.get(previous_month, {}).get(key) if previous_month else None
        )

        leaderboard_rows.append(
            {
                **card,
                "currentRank": current_rank.get(key),
                "rank30d": rank_30d.get(key),
                "rank90d": rank_90d.get(key),
                "rank1yr": rank_1yr.get(key),
                "rankOpportunity": rank_opportunity.get(key),
                "latestMonthlyRank": latest_rank,
                "previousMonthlyRank": previous_rank,
                "rankDelta": (
                    previous_rank - latest_rank
                    if previous_rank is not None and latest_rank is not None
                    else None
                ),
                "appearanceCount": appearance_count,
                "rankHistory": history,
            }
        )

    return {
        "metric": selected_metric,
        "minPriceApplied": min_price,
        "latestMonth": latest_month,
        "rows": leaderboard_rows,
    }
