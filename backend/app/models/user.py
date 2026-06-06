from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class User(Base):
    """Käyttäjätaulu."""

    __tablename__ = "kayttaja"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    kayttajatunnus: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    koko_nimi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    salasana_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    aktiivinen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    yllapitaja: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    luotu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    muokattu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
