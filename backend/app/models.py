from datetime import datetime, date
from sqlalchemy import (
    String,
    Integer,
    Float,
    DateTime,
    Date,
    ForeignKey,
    Index,
    Sequence,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)

    groups: Mapped[list["Group"]] = relationship(back_populates="category")
    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Group(Base):
    __tablename__ = "groups"

    group_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    abbreviation: Mapped[str] = mapped_column(String, nullable=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.category_id"), nullable=False
    )
    published_on: Mapped[str | None] = mapped_column(String, nullable=True)

    category: Mapped["Category"] = relationship(back_populates="groups")
    products: Mapped[list["Product"]] = relationship(back_populates="group")


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    clean_name: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.category_id"), nullable=False
    )
    group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("groups.group_id"), nullable=False
    )
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    rarity: Mapped[str | None] = mapped_column(String, nullable=True)
    card_number: Mapped[str | None] = mapped_column(String, nullable=True)
    card_type: Mapped[str | None] = mapped_column(String, nullable=True)

    category: Mapped["Category"] = relationship(back_populates="products")
    group: Mapped["Group"] = relationship(back_populates="products")
    prices: Mapped[list["Price"]] = relationship(
        back_populates="product",
        primaryjoin="Product.product_id == foreign(Price.product_id)",
    )

    __table_args__ = (
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_group_id", "group_id"),
        Index("ix_products_rarity", "rarity"),
    )


class Price(Base):
    __tablename__ = "prices"

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sub_type_name: Mapped[str] = mapped_column(String, primary_key=True)
    low_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    mid_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    high_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    direct_low_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    product: Mapped["Product"] = relationship(
        back_populates="prices",
        primaryjoin="Price.product_id == Product.product_id",
        foreign_keys="[Price.product_id]",
    )

    __table_args__ = (Index("ix_prices_market_price", "market_price"),)


class PriceHistory(Base):
    __tablename__ = "price_history"

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sub_type_name: Mapped[str] = mapped_column(String, primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    low_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    mid_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    high_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    direct_low_price: Mapped[float | None] = mapped_column(Float, nullable=True)

    __table_args__ = (
        Index("ix_price_history_product_date", "product_id", "date"),
        Index("ix_price_history_date", "date"),
    )


class PriceSummary(Base):
    __tablename__ = "price_summary"

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sub_type_name: Mapped[str] = mapped_column(String, primary_key=True)
    market_price_30d_ago: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_price_90d_ago: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_price_1yr_ago: Mapped[float | None] = mapped_column(Float, nullable=True)
    pct_change_30d: Mapped[float | None] = mapped_column(Float, nullable=True)
    pct_change_90d: Mapped[float | None] = mapped_column(Float, nullable=True)
    pct_change_1yr: Mapped[float | None] = mapped_column(Float, nullable=True)
    all_time_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    all_time_low_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    all_time_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    all_time_high_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class SkippedArchiveDate(Base):
    __tablename__ = "skipped_archive_dates"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    reason: Mapped[str] = mapped_column(String, nullable=False)


watchlist_id_seq = Sequence("watchlists_id_seq")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id: Mapped[int] = mapped_column(
        Integer,
        watchlist_id_seq,
        server_default=watchlist_id_seq.next_value(),
        primary_key=True,
        autoincrement=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["WatchlistItem"]] = relationship(
        back_populates="watchlist", cascade="all, delete-orphan"
    )


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    watchlist_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("watchlists.id"), primary_key=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.product_id"), primary_key=True
    )
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    watchlist: Mapped["Watchlist"] = relationship(back_populates="items")


saved_filter_id_seq = Sequence("saved_filters_id_seq")


class SavedFilter(Base):
    __tablename__ = "saved_filters"

    id: Mapped[int] = mapped_column(
        Integer,
        saved_filter_id_seq,
        server_default=saved_filter_id_seq.next_value(),
        primary_key=True,
        autoincrement=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    filter_json: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
