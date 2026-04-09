# TCGPlayer Price Dashboard

A full-stack price tracking dashboard for trading card games. Tracks daily prices from [tcgcsv.com](https://tcgcsv.com) for Pokemon, Flesh and Blood, and One Piece, with historical charts, deal-finding tools, and watchlists.

## Features

- **Browse** — Search, filter, and sort cards across all three games
- **Price History** — Interactive charts with 30/90/365-day and all-time views
- **Opportunities** — Find undervalued cards ranked by potential gain vs. all-time high
- **Watchlists** — Save cards to track and compare
- **Saved Filters** — Store and recall complex filter combinations
- **Price Summary** — 30/90/365-day % change, all-time low/high with dates, range position

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19, TypeScript, Vite, Material UI 7, Recharts, React Query |
| Backend  | FastAPI, SQLAlchemy, Python 3.10+ |
| Database | DuckDB (columnar/analytical) |
| Data     | tcgcsv.com daily archives (2024-02-08 → present) + live API |

## Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Tcgplayer_prices
```

### 2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Fetch price data

This downloads ~2 years of daily archive data from tcgcsv.com and builds the database. The initial run takes a while; subsequent runs only fetch new dates.

```bash
cd backend
python -m scripts.fetch_prices
```

This will:
- Backfill historical archives (2024-02-08 → yesterday)
- Fetch today's live prices
- Rebuild the price summary table (30/90/365-day changes, ATL/ATH)

The database file (`tcgprices.duckdb`) is created automatically in `backend/`.

## Running

### Start the backend (port 8000)

```bash
./start_backend.sh
```

Or manually:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Start the frontend (port 5173)

```bash
./start_frontend.sh
```

Or manually:

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Update prices

```bash
./fetch_prices.sh
```

This stops the backend server, fetches new data, then restarts the server. DuckDB only allows single-process access, so the server must be stopped during data fetches.

## API Docs

With the backend running, visit **http://localhost:8000/docs** for the interactive Swagger UI.

## Project Structure

```
backend/
  app/
    main.py          # FastAPI app + CORS + routers
    database.py      # DuckDB engine + session config
    models.py        # SQLAlchemy models (Category, Product, Price, etc.)
    routers/
      products.py    # /api/products, /api/products/{id}/history
      stats.py       # /api/stats, /api/sets, /api/rarities, /api/variants
      watchlists.py  # /api/watchlists CRUD
      saved_filters.py
  scripts/
    fetch_prices.py  # Archive backfill + live fetch + summary rebuild
  services/
    tcgcsv_client.py # tcgcsv.com API client
frontend/
  src/
    components/
      Dashboard.tsx       # Main layout with Browse/Opportunities/Watchlists tabs
      CardTable.tsx       # Sortable card table
      CardDetailModal.tsx # Price history chart modal
      FilterPanel.tsx     # Search, game, set, rarity, variant, price filters
      OpportunitiesPanel.tsx
      StatsBar.tsx
    hooks/
      useProducts.ts     # React Query data fetching
    services/
      api.ts             # Axios API client
    types/
      index.ts           # TypeScript interfaces
```

## Notes

- **DuckDB single-process lock** — Only one process can access the database at a time. Stop the server before running fetch scripts (the `fetch_prices.sh` script handles this automatically).
- **Initial data load** — The first `fetch_prices` run downloads ~2 years of daily archives. This is a one-time operation; future runs are incremental.
- **Database not in git** — The `.duckdb` file is gitignored. Each clone needs to run `fetch_prices` to build its own database.
