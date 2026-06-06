from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ─── Arvon esitys rajapinnassa ────────────────────────────────────────────────

class ArvoIn(BaseModel):
    """Yhden solun arvo syötteessä. Anna joko teksti tai viittaus (ei molempia)."""

    sarake_id: int
    arvo_text: str | None = None
    viittaus_masterrivi_id: int | None = None


class ArvoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sarake_id: int
    arvo_text: str | None = None
    viittaus_masterrivi_id: int | None = None


# ─── Rivi (tietueen versio) ───────────────────────────────────────────────────

class RiviCreate(BaseModel):
    """Uusi tietue. voimassa_alku oletuksena nyt."""

    arvot: list[ArvoIn] = Field(default_factory=list)
    voimassa_alku: datetime | None = None


class RiviUpdate(BaseModel):
    """Uusi versio olemassa olevalle tietueelle (masterriville)."""

    arvot: list[ArvoIn] = Field(default_factory=list)
    voimassa_alku: datetime | None = None


class RiviOut(BaseModel):
    """Tietueen aktiivinen versio arvoineen."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    masterrivi_id: int
    taulu_id: int
    voimassa_alku: datetime
    voimassa_loppu: datetime | None
    tila: str
    arvot: list[ArvoOut] = []


class RiviHistoriaOut(BaseModel):
    """Yksi versio historianäkymässä (ilman arvoja, kevyt)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    voimassa_alku: datetime
    voimassa_loppu: datetime | None
    tila: str
