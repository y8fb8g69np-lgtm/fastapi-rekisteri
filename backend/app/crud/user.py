from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.security import hash_password


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_kayttajatunnus(db: Session, kayttajatunnus: str) -> User | None:
    return db.scalar(select(User).where(User.kayttajatunnus == kayttajatunnus))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit)).all())


def create_user(db: Session, data: UserCreate) -> User:
    user = User(
        kayttajatunnus=data.kayttajatunnus,
        email=data.email,
        koko_nimi=data.koko_nimi,
        salasana_hash=hash_password(data.salasana),
        aktiivinen=data.aktiivinen,
        yllapitaja=data.yllapitaja,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    payload = data.model_dump(exclude_unset=True)

    if "salasana" in payload:
        user.salasana_hash = hash_password(payload.pop("salasana"))

    for field, value in payload.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
