"""
Migrate the TCG Price database from SQLite to DuckDB.

Backs up the SQLite database, creates a DuckDB schema via SQLAlchemy,
and copies all data using DuckDB's native SQLite reader.

Prerequisites:
    pip install duckdb duckdb-engine

Usage:
    cd backend
    python -m scripts.migrate_to_duckdb
"""

import os
import sys
import shutil
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_PATH = os.path.join(BACKEND_DIR, "tcgprices.db")
DUCKDB_PATH = os.path.join(BACKEND_DIR, "tcgprices.duckdb")
BACKUP_PATH = os.path.join(BACKEND_DIR, "tcgprices.db.backup")

# Copy order: parent tables before children (respects foreign keys)
TABLES = [
    "categories",
    "groups",
    "products",
    "prices",
    "price_history",
    "price_summary",
    "skipped_archive_dates",
    "watchlists",
    "watchlist_items",
    "saved_filters",
]


def main():
    import duckdb

    if not os.path.exists(SQLITE_PATH):
        print(f"ERROR: SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    if os.path.exists(DUCKDB_PATH):
        print(f"ERROR: DuckDB database already exists at {DUCKDB_PATH}")
        print("Delete it first if you want to re-run migration.")
        sys.exit(1)

    # ── Step 1: Backup SQLite ──
    print("Step 1: Backing up SQLite database...")
    shutil.copy2(SQLITE_PATH, BACKUP_PATH)
    print(f"  Backup saved to: {BACKUP_PATH}")

    # ── Step 2: Create DuckDB schema via SQLAlchemy ──
    print("\nStep 2: Creating DuckDB schema...")
    from app.database import Base, engine

    # Import all models so they register with Base.metadata
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    engine.dispose()
    print(f"  Schema created at: {DUCKDB_PATH}")

    # ── Step 3: Copy data from SQLite ──
    print("\nStep 3: Copying data from SQLite to DuckDB...")
    start = time.time()

    con = duckdb.connect(DUCKDB_PATH)
    con.execute("INSTALL sqlite; LOAD sqlite;")

    # Normalize path for DuckDB ATTACH (forward slashes)
    sqlite_normalized = SQLITE_PATH.replace("\\", "/")
    con.execute(f"ATTACH '{sqlite_normalized}' AS src (TYPE sqlite, READ_ONLY)")

    total_rows = 0
    for table in TABLES:
        try:
            count = con.execute(f"SELECT COUNT(*) FROM src.{table}").fetchone()[0]
            if count > 0:
                con.execute(f"INSERT INTO {table} SELECT * FROM src.{table}")
            total_rows += count
            print(f"  {table}: {count:,} rows")
        except Exception as e:
            print(f"  {table}: SKIPPED ({e})")

    con.execute("DETACH src")

    # ── Step 4: Fix auto-increment sequences ──
    print("\nStep 4: Fixing auto-increment sequences...")
    seq_tables = {
        "watchlists_id_seq": ("watchlists", "id"),
        "saved_filters_id_seq": ("saved_filters", "id"),
    }
    for seq_name, (table, col) in seq_tables.items():
        try:
            max_val = con.execute(
                f"SELECT COALESCE(MAX({col}), 0) FROM {table}"
            ).fetchone()[0]
            if max_val > 0:
                con.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH {max_val + 1}")
                print(f"  {seq_name}: restart at {max_val + 1}")
            else:
                print(f"  {seq_name}: table empty, no fix needed")
        except Exception as e:
            print(f"  {seq_name}: {e}")

    # ── Step 5: Create indexes ──
    print("\nStep 5: Creating indexes...")
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_products_category_id ON products(category_id)",
        "CREATE INDEX IF NOT EXISTS ix_products_group_id ON products(group_id)",
        "CREATE INDEX IF NOT EXISTS ix_products_rarity ON products(rarity)",
        "CREATE INDEX IF NOT EXISTS ix_prices_market_price ON prices(market_price)",
        "CREATE INDEX IF NOT EXISTS ix_price_history_product_date ON price_history(product_id, date)",
        "CREATE INDEX IF NOT EXISTS ix_price_history_date ON price_history(date)",
    ]
    for idx_sql in indexes:
        try:
            con.execute(idx_sql)
            idx_name = idx_sql.split("IF NOT EXISTS ")[1].split(" ON")[0]
            print(f"  {idx_name}: OK")
        except Exception as e:
            print(f"  Index error: {e}")

    # ── Step 6: Verify ──
    print("\nStep 6: Verifying row counts...")
    con.execute(f"ATTACH '{sqlite_normalized}' AS verify_src (TYPE sqlite, READ_ONLY)")
    all_ok = True
    for table in TABLES:
        try:
            duck_count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            sqlite_count = con.execute(
                f"SELECT COUNT(*) FROM verify_src.{table}"
            ).fetchone()[0]
            status = "OK" if duck_count == sqlite_count else "MISMATCH"
            if status == "MISMATCH":
                all_ok = False
            print(
                f"  {table}: DuckDB={duck_count:,} SQLite={sqlite_count:,} [{status}]"
            )
        except Exception as e:
            print(f"  {table}: verification error ({e})")
            all_ok = False

    con.execute("DETACH verify_src")
    con.close()

    elapsed = time.time() - start
    print(f"\n{'=' * 50}")
    if all_ok:
        print(f"Migration complete! ({elapsed:.1f}s, {total_rows:,} total rows)")
    else:
        print(f"Migration completed with WARNINGS. Check mismatches above.")
    print(f"  DuckDB database: {DUCKDB_PATH}")
    print(f"  SQLite backup:   {BACKUP_PATH}")
    print(f"\nYou can now start the backend normally.")


if __name__ == "__main__":
    main()
