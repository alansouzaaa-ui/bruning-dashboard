from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import AppConfig
from schemas import MetasOut, MetasIn

router = APIRouter(prefix="/configs", tags=["configs"])

_DEFAULTS = {"meta_mrr": 5000.0, "meta_ades": 3000.0}


@router.get("/metas", response_model=MetasOut)
def get_metas(db: Session = Depends(get_db)):
    metas = {}
    for chave, default in _DEFAULTS.items():
        cfg = db.query(AppConfig).filter(AppConfig.chave == chave).first()
        metas[chave] = float(cfg.valor) if cfg else default
    return metas


@router.put("/metas", response_model=MetasOut)
def update_metas(body: MetasIn, db: Session = Depends(get_db)):
    for chave, valor in body.model_dump().items():
        cfg = db.query(AppConfig).filter(AppConfig.chave == chave).first()
        if cfg:
            cfg.valor = str(valor)
        else:
            db.add(AppConfig(chave=chave, valor=str(valor)))
    db.commit()
    return body
