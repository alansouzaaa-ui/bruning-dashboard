from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import CategoriaOpcao
from schemas import CategoriaOpcaoOut, CategoriaOpcaoCreate

router = APIRouter(prefix="/categorias", tags=["categorias"])

TIPOS_VALIDOS = ('plano', 'segmento', 'origem')


def _validar_tipo(tipo: str):
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=422, detail=f"Tipo inválido. Use: {TIPOS_VALIDOS}")


# ── LISTAR ────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[CategoriaOpcaoOut])
def listar(tipo: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(CategoriaOpcao)
    if tipo:
        _validar_tipo(tipo)
        q = q.filter(CategoriaOpcao.tipo == tipo)
    return q.order_by(CategoriaOpcao.tipo, CategoriaOpcao.ordem, CategoriaOpcao.valor).all()


# ── CRIAR ─────────────────────────────────────────────────────────────────────
@router.post("/", response_model=CategoriaOpcaoOut, status_code=201)
def criar(body: CategoriaOpcaoCreate, db: Session = Depends(get_db)):
    _validar_tipo(body.tipo)
    valor = body.valor.strip()
    if not valor:
        raise HTTPException(status_code=422, detail="Valor não pode ser vazio.")
    # Verificar duplicata (case-insensitive)
    existe = db.query(CategoriaOpcao).filter(
        CategoriaOpcao.tipo  == body.tipo,
        CategoriaOpcao.valor == valor,
    ).first()
    if existe:
        raise HTTPException(status_code=409, detail="Opção já existe.")
    # Próxima ordem
    max_ordem = db.query(CategoriaOpcao).filter(CategoriaOpcao.tipo == body.tipo).count()
    obj = CategoriaOpcao(tipo=body.tipo, valor=valor, ordem=max_ordem)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── EXCLUIR ───────────────────────────────────────────────────────────────────
@router.delete("/{cat_id}", status_code=204)
def excluir(cat_id: int, db: Session = Depends(get_db)):
    obj = db.query(CategoriaOpcao).filter(CategoriaOpcao.id == cat_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Opção não encontrada.")
    db.delete(obj)
    db.commit()
