from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import rekisteri as taulu_crud
from app.crud import rivi as crud
from app.db.session import get_db
from app.models.rekisteri import Masterrivi
from app.schemas.rivi import RiviCreate, RiviHistoriaOut, RiviOut, RiviUpdate, ViittausVaihtoehto

router = APIRouter(prefix="/taulut/{taulu_id}/rivit", tags=["Rivit"])


def _validoi_arvot(db: Session, taulu_id: int, arvot) -> None:
    """Tarkistaa että sarake_id:t kuuluvat tauluun ja viittauskohteet ovat olemassa."""
    sallitut_sarakkeet = {s.id for s in crud.get_sarakkeet(db, taulu_id)}
    for a in arvot:
        if a.sarake_id not in sallitut_sarakkeet:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Sarake {a.sarake_id} ei kuulu tähän tauluun",
            )
        if a.arvo_text is not None and a.viittaus_masterrivi_id is not None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Arvolla voi olla joko teksti tai viittaus, ei molempia",
            )
        if a.viittaus_masterrivi_id is not None:
            if not db.get(Masterrivi, a.viittaus_masterrivi_id):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Viittauskohdetta {a.viittaus_masterrivi_id} ei löytynyt",
                )


@router.get("", response_model=list[RiviOut])
def listaa_rivit(taulu_id: int, db: Session = Depends(get_db)):
    if not taulu_crud.get_taulu(db, taulu_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    return crud.list_aktiiviset_rivit(db, taulu_id)


@router.get("/vaihtoehdot", response_model=list[ViittausVaihtoehto])
def listaa_viittausvaihtoehdot(taulu_id: int, db: Session = Depends(get_db)):
    """Taulun rivit viittausvalikkoa varten: masterrivi_id + näyttöotsikko."""
    if not taulu_crud.get_taulu(db, taulu_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    return crud.list_rivit_otsikoineen(db, taulu_id)


@router.post("", response_model=RiviOut, status_code=status.HTTP_201_CREATED)
def luo_rivi(taulu_id: int, data: RiviCreate, db: Session = Depends(get_db)):
    if not taulu_crud.get_taulu(db, taulu_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taulua ei löytynyt")
    _validoi_arvot(db, taulu_id, data.arvot)
    return crud.luo_tietue(db, taulu_id, data.arvot, data.voimassa_alku)


@router.put("/{masterrivi_id}", response_model=RiviOut)
def paivita_rivi(
    taulu_id: int, masterrivi_id: int, data: RiviUpdate, db: Session = Depends(get_db)
):
    vanha = crud.get_aktiivinen_rivi(db, masterrivi_id)
    if not vanha or vanha.taulu_id != taulu_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aktiivista riviä ei löytynyt")
    _validoi_arvot(db, taulu_id, data.arvot)
    return crud.luo_uusi_versio(db, vanha, data.arvot, data.voimassa_alku)


@router.delete("/{masterrivi_id}", status_code=status.HTTP_204_NO_CONTENT)
def poista_rivi(taulu_id: int, masterrivi_id: int, db: Session = Depends(get_db)):
    vanha = crud.get_aktiivinen_rivi(db, masterrivi_id)
    if not vanha or vanha.taulu_id != taulu_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aktiivista riviä ei löytynyt")
    crud.poista_tietue(db, vanha)


@router.get("/{masterrivi_id}/historia", response_model=list[RiviHistoriaOut])
def hae_historia(taulu_id: int, masterrivi_id: int, db: Session = Depends(get_db)):
    historia = crud.get_historia(db, masterrivi_id)
    if not historia:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tietuetta ei löytynyt")
    return historia
