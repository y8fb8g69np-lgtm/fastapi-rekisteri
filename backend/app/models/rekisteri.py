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
    # Näkyvyysjärjestys viittauksissa: jos > 0, tämä sarake näytetään kun
    # tähän tauluun viitataan. Pienempi numero näytetään ensin. 0 = ei näytetä.
    viittausnakyvyys: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    luotu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    taulu: Mapped["Taulu"] = relationship(back_populates="sarakkeet", foreign_keys=[taulu_id])


class Masterrivi(Base):
    """Versioketjun ankkuri. Edustaa yhtä tietuetta; ei muutu versioinnissa.
    Viittaukset osoittavat tänne, jotta ne säilyvät versioinnin yli."""

    __tablename__ = "masterrivi"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    taulu_id: Mapped[int] = mapped_column(
        ForeignKey("taulu.id", ondelete="CASCADE"), nullable=False, index=True
    )
    luotu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    rivit: Mapped[list["Rivi"]] = relationship(
        back_populates="masterrivi",
        cascade="all, delete-orphan",
        order_by="Rivi.voimassa_alku",
        foreign_keys="Rivi.masterrivi_id",
    )


class Rivi(Base):
    """Tietueen yksi versio voimassaoloaikoineen."""

    __tablename__ = "rivi"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    masterrivi_id: Mapped[int] = mapped_column(
        ForeignKey("masterrivi.id", ondelete="CASCADE"), nullable=False, index=True
    )
    taulu_id: Mapped[int] = mapped_column(
        ForeignKey("taulu.id", ondelete="CASCADE"), nullable=False, index=True
    )
    voimassa_alku: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    voimassa_loppu: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # NULL = toistaiseksi voimassa
    # 'aktiivinen', 'poistettu', 'korvattu'
    tila: Mapped[str] = mapped_column(String(20), nullable=False, default="aktiivinen")
    luotu_aika: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    masterrivi: Mapped["Masterrivi"] = relationship(
        back_populates="rivit", foreign_keys=[masterrivi_id]
    )
    arvot: Mapped[list["Arvo"]] = relationship(
        back_populates="rivi", cascade="all, delete-orphan"
    )


class Arvo(Base):
    """Yhden solun arvo: teksti TAI viittaus masterriviin."""

    __tablename__ = "arvo"
    __table_args__ = (UniqueConstraint("rivi_id", "sarake_id", name="uq_arvo_rivi_sarake"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rivi_id: Mapped[int] = mapped_column(
        ForeignKey("rivi.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sarake_id: Mapped[int] = mapped_column(
        ForeignKey("sarake.id", ondelete="CASCADE"), nullable=False, index=True
    )
    arvo_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Viittaustyyppisen arvon kohde (osoittaa masterriviin, ei riviin)
    viittaus_masterrivi_id: Mapped[int | None] = mapped_column(
        ForeignKey("masterrivi.id", ondelete="SET NULL"), nullable=True
    )

    rivi: Mapped["Rivi"] = relationship(back_populates="arvot")
