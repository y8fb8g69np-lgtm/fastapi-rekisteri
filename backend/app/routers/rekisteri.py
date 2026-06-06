from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import rekisteri as crud
from app.db.session import get_db
from app.schemas.rekisteri import (
    SarakeCreate,
    SarakeRead,
    SarakeUpdate,
    TauluCreate,
    TauluRead,
    TauluReadWithSarakkeet,
    TauluUpdate,
)

router = APIRouter(prefix="/taulut", tags=["Taulut"])


# ─── Taulu ────────────────────────────────────────────────────────────────────

@router.post("", response_model=TauluRead, status_code=status.HTTP_201_CREATED)
def luo_taulu(data: TauluCreate, db: Session = Depends(get_db)):
    if crud.get_taulu_by_nimi(db, data.nimi):
        raise HTTPException(status.HTTP_409_CONFLICT, "Taulun nimi on jo käytössä")
    return crud.create_taulu(db, data)


@router.get("", response_model=list[TauluRead])
def listaa_taulut(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_taulut(db, skip=skip, limit=limit)


@router.get("/{taulu_id}", response_model=TauluReadWithSarakkeet)
def hae_taulu(taulu_id: int, db: Session = Depends(get_db)):
    taulu = crud.get_taulu_with_sarakkeet(db, taulu_id)
    if not taulu:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    return taulu


@router.patch("/{taulu_id}", response_model=TauluRead)
def paivita_taulu(taulu_id: int, data: TauluUpdate, db: Session = Depends(get_db)):
    taulu = crud.get_taulu(db, taulu_id)
    if not taulu:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    if data.nimi and data.nimi != taulu.nimi and crud.get_taulu_by_nimi(db, data.nimi):
        raise HTTPException(status.HTTP_409_CONFLICT, "Taulun nimi on jo käytössä")
    return crud.update_taulu(db, taulu, data)


@router.delete("/{taulu_id}", status_code=status.HTTP_204_NO_CONTENT)
def poista_taulu(taulu_id: int, db: Session = Depends(get_db)):
    taulu = crud.get_taulu(db, taulu_id)
    if not taulu:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    crud.delete_taulu(db, taulu)


# ─── Sarake (taulun alainen) ──────────────────────────────────────────────────

@router.get("/{taulu_id}/sarakkeet", response_model=list[SarakeRead])
def listaa_sarakkeet(taulu_id: int, db: Session = Depends(get_db)):
    if not crud.get_taulu(db, taulu_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    return crud.list_sarakkeet(db, taulu_id)


@router.post(
    "/{taulu_id}/sarakkeet", response_model=SarakeRead, status_code=status.HTTP_201_CREATED
)
def luo_sarake(taulu_id: int, data: SarakeCreate, db: Session = Depends(get_db)):
    if not crud.get_taulu(db, taulu_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    if crud.get_sarake_by_nimi(db, taulu_id, data.nimi):
        raise HTTPException(status.HTTP_409_CONFLICT, "Sarakkeen nimi on jo käytössä tässä taulussa")
    # Viittauskohteen on oltava olemassa
    if data.viittaus_taulu_id is not None and not crud.get_taulu(db, data.viittaus_taulu_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Viittauskohteen taulua ei löytynyt")
    return crud.create_sarake(db, taulu_id, data)


@router.patch("/{taulu_id}/sarakkeet/{sarake_id}", response_model=SarakeRead)
def paivita_sarake(
    taulu_id: int, sarake_id: int, data: SarakeUpdate, db: Session = Depends(get_db)
):
    sarake = crud.get_sarake(db, sarake_id)
    if not sarake or sarake.taulu_id != taulu_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Saraketta ei löytynyt")
    if data.nimi and data.nimi != sarake.nimi and crud.get_sarake_by_nimi(db, taulu_id, data.nimi):
        raise HTTPException(status.HTTP_409_CONFLICT, "Sarakkeen nimi on jo käytössä tässä taulussa")
    if data.viittaus_taulu_id is not None and not crud.get_taulu(db, data.viittaus_taulu_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Viittauskohteen taulua ei löytynyt")
    return crud.update_sarake(db, sarake, data)


@router.delete(
    "/{taulu_id}/sarakkeet/{sarake_id}", status_code=status.HTTP_204_NO_CONTENT
)
def poista_sarake(taulu_id: int, sarake_id: int, db: Session = Depends(get_db)):
    sarake = crud.get_sarake(db, sarake_id)
    if not sarake or sarake.taulu_id != taulu_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Saraketta ei löytynyt")
    crud.delete_sarake(db, sarake)
