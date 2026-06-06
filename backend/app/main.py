from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db.session import Base, engine
from app.models import user as _user_model  # noqa: F401  (rekisteröi mallin Baseen)
from app.models import rekisteri as _rekisteri_model  # noqa: F401  (rekisteröi mallit Baseen)
from app.routers import rekisteri, rivi, users

settings = get_settings()


def _kevyt_migraatio() -> None:
    """Lisää uudet sarakkeet olemassa oleviin tauluihin.
    create_all luo vain puuttuvat taulut, ei sarakkeita, joten tämä
    täydentää sen. Turvallinen ajaa toistuvasti (IF NOT EXISTS)."""
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE sarake ADD COLUMN IF NOT EXISTS "
            "viittausnakyvyys INTEGER NOT NULL DEFAULT 0"
        ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Kehityskäyttöön: luo taulut automaattisesti.
    # Tuotannossa käytä Alembic-migraatioita (ks. README).
    Base.metadata.create_all(bind=engine)
    _kevyt_migraatio()
    yield


app = FastAPI(title=settings.api_title, version=settings.api_version, lifespan=lifespan)

# CORS — salli frontendin kutsut. Kehityksessä Vite pyörii portissa 5173.
# Tuotannossa korvaa allow_origins omalla domainilla.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Yleiset"])
def juuri():
    return {"sovellus": settings.api_title, "versio": settings.api_version, "docs": "/docs"}


@app.get("/health", tags=["Yleiset"])
def terveys():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(rekisteri.router)
app.include_router(rivi.router)
