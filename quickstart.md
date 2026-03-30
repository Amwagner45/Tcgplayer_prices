## Running
- Backend: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev` (port 5173)
- Fetch data (unified — backfills archives + today's live): `cd backend && python -m scripts.fetch_prices`
- Old fetch (today only, deprecated): `cd backend && python -m scripts.fetch_today`