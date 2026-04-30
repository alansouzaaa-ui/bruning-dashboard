from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import Oportunidade

router = APIRouter(prefix="/oportunidades", tags=["oportunidades"])


class OportunidadeIn(BaseModel):
    criadas:  int = 0
    ganhas:   int = 0
    perdidas: int = 0


class OportunidadeOut(OportunidadeIn):
    mes: str

    class Config:
        from_attributes = True


@router.get("/{mes}", response_model=OportunidadeOut)
def get_oportunidade(mes: str, db: Session = Depends(get_db)):
    obj = db.query(Oportunidade).filter(Oportunidade.mes == mes).first()
    if not obj:
        return OportunidadeOut(mes=mes, criadas=0, ganhas=0, perdidas=0)
    return obj


@router.put("/{mes}", response_model=OportunidadeOut)
def upsert_oportunidade(mes: str, data: OportunidadeIn, db: Session = Depends(get_db)):
    obj = db.query(Oportunidade).filter(Oportunidade.mes == mes).first()
    if obj:
        obj.criadas  = data.criadas
        obj.ganhas   = data.ganhas
        obj.perdidas = data.perdidas
    else:
        obj = Oportunidade(mes=mes, **data.model_dump())
        db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
