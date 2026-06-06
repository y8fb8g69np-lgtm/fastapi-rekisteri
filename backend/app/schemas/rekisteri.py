from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Sallitut tietotyypit sarakkeelle
Tietotyyppi = Literal["text", "integer", "decimal", "date", "boolean", "viittaus"]


# ─── Sarake ───────────────────────────────────────────────────────────────────

class SarakeBase(BaseModel):
    nimi: str = Field(..., min_length=1, max_length=100)
    tietotyyppi: Tietotyyppi = "text"
    pakollinen: bool = False
    jarjestys: int = 0
    kuvaus: str | None = None
    viittaus_taulu_id: int | None = None
    viittausnakyvyys: int = 0

    @model_validator(mode="after")
    def _tarkista_viittaus(self):
        if self.tietotyyppi == "viittaus" and self.viittaus_taulu_id is None:
            raise ValueError("Viittaustyyppinen sarake vaatii viittaus_taulu_id:n")
        if self.tietotyyppi != "viittaus" and self.viittaus_taulu_id is not None:
            raise ValueError("viittaus_taulu_id sallitaan vain viittaustyyppiselle sarakkeelle")
        return self


class SarakeCreate(SarakeBase):
    pass


class SarakeUpdate(BaseModel):
    """Kaikki kentät valinnaisia — vain annetut päivitetään."""

    nimi: str | None = Field(None, min_length=1, max_length=100)
    tietotyyppi: Tietotyyppi | None = None
    pakollinen: bool | None = None
    jarjestys: int | None = None
    kuvaus: str | None = None
    viittaus_taulu_id: int | None = None
    viittausnakyvyys: int | None = None


class SarakeRead(SarakeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    taulu_id: int
    luotu_aika: datetime


# ─── Taulu ────────────────────────────────────────────────────────────────────

class TauluBase(BaseModel):
    nimi: str = Field(..., min_length=1, max_length=100)
    kuvaus: str | None = None


class TauluCreate(TauluBase):
    pass


class TauluUpdate(BaseModel):
    nimi: str | None = Field(None, min_length=1, max_length=100)
    kuvaus: str | None = None


class TauluRead(TauluBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    luotu_aika: datetime


class TauluReadWithSarakkeet(TauluRead):
    """Taulu sarakkeineen — kätevä detail-näkymälle."""

    sarakkeet: list[SarakeRead] = []
