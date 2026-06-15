from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.rekisteri import Kuva

router = APIRouter(prefix="/kuvat", tags=["Kuvat"])

SALLITUT_MIME = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}
MAX_KOKO = 10 * 1024 * 1024  # 10 MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def lataa_kuva(tiedosto: UploadFile = File(...), db: Session = Depends(get_db)):
    if tiedosto.content_type not in SALLITUT_MIME:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Tiedostotyyppi ei ole sallittu ({tiedosto.content_type})",
        )
    data = await tiedosto.read()
    if len(data) > MAX_KOKO:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Kuva on liian suuri (max 10 MB)")

    kuva = Kuva(mime=tiedosto.content_type, nimi=tiedosto.filename, data=data, koko=len(data))
    db.add(kuva)
    db.commit()
    db.refresh(kuva)
    # Palautetaan id ja osoite, jota frontend käyttää <img src=...> -tagissa
    return {"id": kuva.id, "url": f"/kuvat/{kuva.id}", "nimi": kuva.nimi, "koko": kuva.koko}


@router.get("/{kuva_id}")
def hae_kuva(kuva_id: int, db: Session = Depends(get_db)):
    kuva = db.get(Kuva, kuva_id)
    if not kuva:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kuvaa ei löytynyt")
    return Response(
        content=kuva.data,
        media_type=kuva.mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
