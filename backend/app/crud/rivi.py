from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.rekisteri import Arvo, Masterrivi, Rivi, Sarake
from app.schemas.rivi import ArvoIn


def _nyt() -> datetime:
    return datetime.now(timezone.utc)


def _luo_arvot(rivi: Rivi, arvot: list[ArvoIn]) -> None:
    """Liittää arvot riviin. Tyhjät (ei tekstiä eikä viittausta) ohitetaan."""
    for a in arvot:
        if a.arvo_text is None and a.viittaus_masterrivi_id is None:
            continue
        rivi.arvot.append(
            Arvo(
                sarake_id=a.sarake_id,
                arvo_text=a.arvo_text,
                viittaus_masterrivi_id=a.viittaus_masterrivi_id,
            )
        )


def list_aktiiviset_rivit(db: Session, taulu_id: int) -> list[Rivi]:
    """Taulun aktiiviset (voimassa olevat) rivit arvoineen."""
    stmt = (
        select(Rivi)
        .options(selectinload(Rivi.arvot))
        .where(
            Rivi.taulu_id == taulu_id,
            Rivi.tila == "aktiivinen",
            Rivi.voimassa_loppu.is_(None),
        )
        .order_by(Rivi.masterrivi_id)
    )
    return list(db.scalars(stmt).all())


def get_aktiivinen_rivi(db: Session, masterrivi_id: int) -> Rivi | None:
    """Masterrivin tämänhetkinen aktiivinen versio."""
    stmt = (
        select(Rivi)
        .options(selectinload(Rivi.arvot))
        .where(
            Rivi.masterrivi_id == masterrivi_id,
            Rivi.tila == "aktiivinen",
            Rivi.voimassa_loppu.is_(None),
        )
    )
    return db.scalar(stmt)


def get_historia(db: Session, masterrivi_id: int) -> list[Rivi]:
    stmt = (
        select(Rivi)
        .where(Rivi.masterrivi_id == masterrivi_id)
        .order_by(Rivi.voimassa_alku.desc())
    )
    return list(db.scalars(stmt).all())


def luo_tietue(db: Session, taulu_id: int, arvot: list[ArvoIn], voimassa_alku=None) -> Rivi:
    """Luo uusi tietue: masterrivi + ensimmäinen rivi + arvot."""
    master = Masterrivi(taulu_id=taulu_id)
    db.add(master)
    db.flush()  # saadaan master.id

    rivi = Rivi(
        masterrivi_id=master.id,
        taulu_id=taulu_id,
        voimassa_alku=voimassa_alku or _nyt(),
        tila="aktiivinen",
    )
    _luo_arvot(rivi, arvot)
    db.add(rivi)
    db.commit()
    db.refresh(rivi)
    return rivi


def luo_uusi_versio(db: Session, vanha: Rivi, arvot: list[ArvoIn], voimassa_alku=None) -> Rivi:
    """Sulkee vanhan version ja luo uuden samalle masterriville."""
    hetki = voimassa_alku or _nyt()

    # Sulje vanha versio
    vanha.voimassa_loppu = hetki
    vanha.tila = "korvattu"

    # Luo uusi versio
    uusi = Rivi(
        masterrivi_id=vanha.masterrivi_id,
        taulu_id=vanha.taulu_id,
        voimassa_alku=hetki,
        tila="aktiivinen",
    )
    _luo_arvot(uusi, arvot)
    db.add(uusi)
    db.commit()
    db.refresh(uusi)
    return uusi


def poista_tietue(db: Session, rivi: Rivi) -> None:
    """Pehmeä poisto: sulkee aktiivisen version, ei tuhoa historiaa."""
    rivi.voimassa_loppu = _nyt()
    rivi.tila = "poistettu"
    db.commit()


def get_sarakkeet(db: Session, taulu_id: int) -> list[Sarake]:
    return list(
        db.scalars(
            select(Sarake).where(Sarake.taulu_id == taulu_id).order_by(Sarake.jarjestys)
        ).all()
    )
