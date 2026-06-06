from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.rekisteri import Sarake, Taulu
from app.schemas.rekisteri import SarakeCreate, SarakeUpdate, TauluCreate, TauluUpdate


# ─── Taulu ────────────────────────────────────────────────────────────────────

def get_taulu(db: Session, taulu_id: int) -> Taulu | None:
    return db.get(Taulu, taulu_id)


def get_taulu_with_sarakkeet(db: Session, taulu_id: int) -> Taulu | None:
    return db.scalar(
        select(Taulu).options(selectinload(Taulu.sarakkeet)).where(Taulu.id == taulu_id)
    )


def get_taulu_by_nimi(db: Session, nimi: str) -> Taulu | None:
    return db.scalar(select(Taulu).where(Taulu.nimi == nimi))


def list_taulut(db: Session, skip: int = 0, limit: int = 100) -> list[Taulu]:
    return list(db.scalars(select(Taulu).order_by(Taulu.nimi).offset(skip).limit(limit)).all())


def create_taulu(db: Session, data: TauluCreate) -> Taulu:
    taulu = Taulu(nimi=data.nimi, kuvaus=data.kuvaus)
    db.add(taulu)
    db.commit()
    db.refresh(taulu)
    return taulu


def update_taulu(db: Session, taulu: Taulu, data: TauluUpdate) -> Taulu:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(taulu, field, value)
    db.commit()
    db.refresh(taulu)
    return taulu


def delete_taulu(db: Session, taulu: Taulu) -> None:
    db.delete(taulu)
    db.commit()


# ─── Sarake ───────────────────────────────────────────────────────────────────

def get_sarake(db: Session, sarake_id: int) -> Sarake | None:
    return db.get(Sarake, sarake_id)


def get_sarake_by_nimi(db: Session, taulu_id: int, nimi: str) -> Sarake | None:
    return db.scalar(
        select(Sarake).where(Sarake.taulu_id == taulu_id, Sarake.nimi == nimi)
    )


def list_sarakkeet(db: Session, taulu_id: int) -> list[Sarake]:
    return list(
        db.scalars(
            select(Sarake).where(Sarake.taulu_id == taulu_id).order_by(Sarake.jarjestys)
        ).all()
    )


def create_sarake(db: Session, taulu_id: int, data: SarakeCreate) -> Sarake:
    sarake = Sarake(taulu_id=taulu_id, **data.model_dump())
    db.add(sarake)
    db.commit()
    db.refresh(sarake)
    return sarake


def update_sarake(db: Session, sarake: Sarake, data: SarakeUpdate) -> Sarake:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sarake, field, value)
    db.commit()
    db.refresh(sarake)
    return sarake


def delete_sarake(db: Session, sarake: Sarake) -> None:
    db.delete(sarake)
    db.commit()
