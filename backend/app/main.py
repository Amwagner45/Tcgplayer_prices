from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import analytics, products, saved_filters, scripts, stats, watchlists

app = FastAPI(title="TCGPlayer Price Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(analytics.router)
app.include_router(stats.router)
app.include_router(watchlists.router)
app.include_router(saved_filters.router)
app.include_router(scripts.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"message": "TCGPlayer Price Dashboard API", "docs": "/docs"}
