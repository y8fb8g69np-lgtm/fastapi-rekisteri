from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    kayttajatunnus: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    koko_nimi: str | None = Field(None, max_length=200)
    aktiivinen: bool = True
    yllapitaja: bool = False


class UserCreate(UserBase):
    salasana: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """Kaikki kentät valinnaisia — vain annetut päivitetään."""

    kayttajatunnus: str | None = Field(None, min_length=3, max_length=100)
    email: EmailStr | None = None
    koko_nimi: str | None = Field(None, max_length=200)
    salasana: str | None = Field(None, min_length=8, max_length=128)
    aktiivinen: bool | None = None
    yllapitaja: bool | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    luotu_aika: datetime
    muokattu_aika: datetime
