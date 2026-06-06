from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Sovelluksen asetukset, luetaan ympäristömuuttujista / .env-tiedostosta."""

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/rekisteri"
    api_title: str = "Dynaaminen rekisterinhallinta API"
    api_version: str = "0.1.0"
    debug: bool = False
    # Sallitut frontend-osoitteet. Voidaan antaa ympäristömuuttujana
    # pilkulla erotettuna, esim:
    #   CORS_ORIGINS=https://frontend.up.railway.app,http://localhost:5173
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
