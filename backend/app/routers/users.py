from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import user as crud
from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/kayttajat", tags=["Käyttäjät"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def luo_kayttaja(data: UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_kayttajatunnus(db, data.kayttajatunnus):
        raise HTTPException(status.HTTP_409_CONFLICT, "Käyttäjätunnus on jo käytössä")
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Sähköposti on jo käytössä")
    return crud.create_user(db, data)


@router.get("", response_model=list[UserRead])
def listaa_kayttajat(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
def hae_kayttaja(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Käyttäjää ei löytynyt")
    return user


@router.patch("/{user_id}", response_model=UserRead)
def paivita_kayttaja(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Käyttäjää ei löytynyt")

    # Tarkista uniikkius jos tunnusta tai sähköpostia muutetaan
    if data.kayttajatunnus and data.kayttajatunnus != user.kayttajatunnus:
        if crud.get_user_by_kayttajatunnus(db, data.kayttajatunnus):
            raise HTTPException(status.HTTP_409_CONFLICT, "Käyttäjätunnus on jo käytössä")
    if data.email and data.email != user.email:
        if crud.get_user_by_email(db, data.email):
            raise HTTPException(status.HTTP_409_CONFLICT, "Sähköposti on jo käytössä")

    return crud.update_user(db, user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def poista_kayttaja(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Käyttäjää ei löytynyt")
    crud.delete_user(db, user)
