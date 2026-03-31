from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import ComissaoPaga
from schemas import ComissaoPagaCreate, ComissaoPagaOut

router = APIRouter(prefix="/comissoes", tags=["comissoes"])


@router.get("/", response_model=List[ComissaoPagaOut])
def listar_comissoes(db: Session = Depends(get_db)):
    return db.query(ComissaoPaga).order_by(ComissaoPaga.mes.desc()).all()


@router.post("/", response_model=ComissaoPagaOut, status_code=201)
def criar_comissao(comissao: ComissaoPagaCreate, db: Session = Depends(get_db)):
    db_obj = ComissaoPaga(**comissao.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/{comissao_id}", status_code=204)
def excluir_comissao(comissao_id: int, db: Session = Depends(get_db)):
    obj = db.query(ComissaoPaga).filter(ComissaoPaga.id == comissao_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Comissão não encontrada")
    db.delete(obj)
    db.commit()
