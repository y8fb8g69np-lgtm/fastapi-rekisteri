from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Taulu(Base):
    """Virtuaalitaulu (rekisteri), johon määritellään sarakkeita."""

    __tablename__ = "taulu"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nimi: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    kuvaus: Mapped[str | None] = mapped_column(Text, nullable=True)
    luotu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    sarakkeet: Mapped[list["Sarake"]] = relationship(
        back_populates="taulu",
        cascade="all, delete-orphan",
        order_by="Sarake.jarjestys",
        foreign_keys="Sarake.taulu_id",        
    )


class Sarake(Base):
    """Virtuaalitaulun sarakemääritys."""

    __tablename__ = "sarake"
    __table_args__ = (UniqueConstraint("taulu_id", "nimi", name="uq_sarake_taulu_nimi"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    taulu_id: Mapped[int] = mapped_column(
        ForeignKey("taulu.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nimi: Mapped[str] = mapped_column(String(100), nullable=False)
    # 'text', 'integer', 'decimal', 'date', 'boolean', 'viittaus'
    tietotyyppi: Mapped[str] = mapped_column(String(50), nullable=False, default="text")
    pakollinen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    jarjestys: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kuvaus: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Viittaustyyppisen sarakkeen kohde (toinen virtuaalitaulu)
    viittaus_taulu_id: Mapped[int | None] = mapped_column(
        ForeignKey("taulu.id", ondelete="SET NULL"), nullable=True
    )
    luotu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    taulu: Mapped["Taulu"] = relationship(back_populates="sarakkeet", foreign_keys=[taulu_id])
