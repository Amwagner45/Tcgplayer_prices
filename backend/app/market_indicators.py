from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.models import PriceHistory


def _round(value: float | None, digits: int = 4) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def _get_value(row: Any, *names: str) -> Any:
    for name in names:
        if isinstance(row, dict) and name in row:
            return row[name]
        if hasattr(row, name):
            return getattr(row, name)
    return None


def compute_sma(values: list[float], period: int) -> list[float | None]:
    output: list[float | None] = [None] * len(values)
    if period <= 0:
        return output

    running_total = 0.0
    for index, value in enumerate(values):
        running_total += value
        if index >= period:
            running_total -= values[index - period]
        if index >= period - 1:
            output[index] = running_total / period
    return output


def compute_ema(values: list[float], period: int) -> list[float | None]:
    output: list[float | None] = [None] * len(values)
    if period <= 0 or len(values) < period:
        return output

    multiplier = 2 / (period + 1)
    seed = sum(values[:period]) / period
    output[period - 1] = seed
    previous = seed

    for index in range(period, len(values)):
        previous = (values[index] - previous) * multiplier + previous
        output[index] = previous
    return output


def compute_optional_ema(values: list[float | None], period: int) -> list[float | None]:
    compact_values = [value for value in values if value is not None]
    compact_ema = compute_ema(compact_values, period)
    output: list[float | None] = [None] * len(values)

    compact_index = 0
    for index, value in enumerate(values):
        if value is None:
            continue
        output[index] = compact_ema[compact_index]
        compact_index += 1
    return output


def _pct_distance(price: float | None, baseline: float | None) -> float | None:
    if price is None or baseline in (None, 0):
        return None
    return (price - baseline) / baseline * 100


def classify_sma_trend(snapshot: dict[str, Any]) -> str:
    market_price = snapshot.get("marketPrice")
    sma20 = snapshot.get("sma20")
    sma50 = snapshot.get("sma50")
    sma200 = snapshot.get("sma200")

    if market_price is None:
        return "neutral"
    if sma20 and sma50 and sma200:
        if market_price > sma20 > sma50 > sma200:
            return "bullish"
        if market_price < sma20 < sma50 < sma200:
            return "bearish"
        if market_price >= sma20 and sma20 >= sma50:
            return "recovering"
        if market_price <= sma20 and sma20 >= sma50:
            return "pullback"
    if sma20:
        return "recovering" if market_price >= sma20 else "weak"
    return "neutral"


def classify_macd_trend(snapshot: dict[str, Any]) -> str:
    macd = snapshot.get("macd")
    signal = snapshot.get("macdSignal")
    histogram = snapshot.get("macdHistogram")

    if macd is None or signal is None or histogram is None:
        return "neutral"
    if macd > signal and histogram > 0:
        return "bullish"
    if macd < signal and histogram < 0:
        return "bearish"
    return "neutral"


def calculate_opportunity_score(
    *,
    range_position: float | None,
    potential_gain_pct: float | None,
    pct_change_30d: float | None,
    snapshot: dict[str, Any],
) -> float | None:
    if range_position is None and potential_gain_pct is None and not snapshot:
        return None

    score = 0.0

    if range_position is not None:
        score += max(0.0, 1.0 - min(range_position, 1.0)) * 35
    if potential_gain_pct is not None:
        score += min(max(potential_gain_pct, 0.0), 250.0) / 250.0 * 25
    if pct_change_30d is not None and pct_change_30d < 0:
        score += min(abs(pct_change_30d), 30.0) / 30.0 * 15

    if snapshot:
        sma_trend = snapshot.get("smaTrend")
        macd_trend = snapshot.get("macdTrend")
        price_vs_sma20 = snapshot.get("priceVsSma20Pct")

        if sma_trend in {"bullish", "recovering", "pullback"}:
            score += 10
        if macd_trend == "bullish":
            score += 10
        elif macd_trend == "neutral":
            score += 4
        if price_vs_sma20 is not None and -5 <= price_vs_sma20 <= 10:
            score += 5

    return round(min(score, 100.0), 1)


def classify_buy_signal(
    score: float | None,
    snapshot: dict[str, Any],
    range_position: float | None,
) -> str:
    if score is None:
        return "No signal"
    if score >= 75 and snapshot.get("macdTrend") == "bullish":
        return "Strong buy setup"
    if score >= 60 and snapshot.get("smaTrend") in {"bullish", "recovering"}:
        return "Momentum watch"
    if range_position is not None and range_position <= 0.25:
        return "Near low, wait"
    return "Monitor"


def build_indicator_series(
    rows: Iterable[Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    points: list[dict[str, Any]] = []
    compact_prices: list[float] = []
    compact_indices: list[int] = []

    for row in rows:
        point = {
            "date": _get_value(row, "date").isoformat(),
            "marketPrice": _get_value(row, "market_price", "marketPrice"),
            "midPrice": _get_value(row, "mid_price", "midPrice"),
            "lowPrice": _get_value(row, "low_price", "lowPrice"),
            "sma20": None,
            "sma50": None,
            "sma200": None,
            "macd": None,
            "macdSignal": None,
            "macdHistogram": None,
        }
        points.append(point)

        if point["marketPrice"] is not None:
            compact_prices.append(float(point["marketPrice"]))
            compact_indices.append(len(points) - 1)

    snapshot = {
        "marketPrice": None,
        "sma20": None,
        "sma50": None,
        "sma200": None,
        "macd": None,
        "macdSignal": None,
        "macdHistogram": None,
        "priceVsSma20Pct": None,
        "priceVsSma50Pct": None,
        "priceVsSma200Pct": None,
        "smaTrend": "neutral",
        "macdTrend": "neutral",
    }

    if not compact_prices:
        return points, snapshot

    sma20 = compute_sma(compact_prices, 20)
    sma50 = compute_sma(compact_prices, 50)
    sma200 = compute_sma(compact_prices, 200)
    ema12 = compute_ema(compact_prices, 12)
    ema26 = compute_ema(compact_prices, 26)

    macd_values: list[float | None] = [None] * len(compact_prices)
    for index in range(len(compact_prices)):
        if ema12[index] is not None and ema26[index] is not None:
            macd_values[index] = ema12[index] - ema26[index]
    macd_signal = compute_optional_ema(macd_values, 9)

    for compact_index, point_index in enumerate(compact_indices):
        macd = macd_values[compact_index]
        signal = macd_signal[compact_index]
        histogram = None
        if macd is not None and signal is not None:
            histogram = macd - signal

        points[point_index]["sma20"] = _round(sma20[compact_index], 2)
        points[point_index]["sma50"] = _round(sma50[compact_index], 2)
        points[point_index]["sma200"] = _round(sma200[compact_index], 2)
        points[point_index]["macd"] = _round(macd)
        points[point_index]["macdSignal"] = _round(signal)
        points[point_index]["macdHistogram"] = _round(histogram)

    latest_point = points[compact_indices[-1]]
    snapshot.update(
        {
            "marketPrice": latest_point["marketPrice"],
            "sma20": latest_point["sma20"],
            "sma50": latest_point["sma50"],
            "sma200": latest_point["sma200"],
            "macd": latest_point["macd"],
            "macdSignal": latest_point["macdSignal"],
            "macdHistogram": latest_point["macdHistogram"],
        }
    )
    snapshot["priceVsSma20Pct"] = _round(
        _pct_distance(snapshot["marketPrice"], snapshot["sma20"]), 2
    )
    snapshot["priceVsSma50Pct"] = _round(
        _pct_distance(snapshot["marketPrice"], snapshot["sma50"]), 2
    )
    snapshot["priceVsSma200Pct"] = _round(
        _pct_distance(snapshot["marketPrice"], snapshot["sma200"]), 2
    )
    snapshot["smaTrend"] = classify_sma_trend(snapshot)
    snapshot["macdTrend"] = classify_macd_trend(snapshot)
    return points, snapshot


def load_indicator_snapshots(
    db: Session,
    items: Iterable[Any],
    lookback_days: int = 365,
) -> dict[tuple[int, str], dict[str, Any]]:
    keys = {
        (
            _get_value(item, "product_id", "productId"),
            _get_value(item, "sub_type_name", "subTypeName"),
        )
        for item in items
    }
    keys.discard((None, None))
    if not keys:
        return {}

    product_ids = {product_id for product_id, _ in keys}
    sub_types = {sub_type for _, sub_type in keys}
    since = date.today() - timedelta(days=max(lookback_days, 260))

    rows = (
        db.query(
            PriceHistory.product_id,
            PriceHistory.sub_type_name,
            PriceHistory.date,
            PriceHistory.market_price,
        )
        .filter(
            PriceHistory.product_id.in_(product_ids),
            PriceHistory.sub_type_name.in_(sub_types),
            PriceHistory.date >= since,
            PriceHistory.market_price.isnot(None),
        )
        .order_by(
            PriceHistory.product_id.asc(),
            PriceHistory.sub_type_name.asc(),
            PriceHistory.date.asc(),
        )
        .all()
    )

    grouped_rows: dict[tuple[int, str], list[Any]] = {key: [] for key in keys}
    for row in rows:
        key = (row.product_id, row.sub_type_name)
        if key in grouped_rows:
            grouped_rows[key].append(row)

    snapshots: dict[tuple[int, str], dict[str, Any]] = {}
    for key, key_rows in grouped_rows.items():
        _, snapshot = build_indicator_series(key_rows)
        snapshots[key] = snapshot
    return snapshots
