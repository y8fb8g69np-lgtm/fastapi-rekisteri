from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Sovelluksen asetukset, luetaan ympäristömuuttujista / .env-tiedostosta."""

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/rekisteri"
    api_title: str = "Dynaaminen rekisterinhallinta API"
    api_version: str = "0.1.0"
    debug: bool = False
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()