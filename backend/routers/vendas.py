from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from decimal import Decimal
from datetime import date
import calendar

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import Venda
from schemas import VendaCreate, VendaUpdate, VendaOut, KPIOut, ComparativoMes

router = APIRouter(prefix="/vendas", tags=["vendas"])

MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]


# ── LISTAR ──────────────────────────────────────────────
@router.get("/", response_model=List[VendaOut])
def listar_vendas(
    mes: Optional[str] = Query(None, description="Formato: 2026-03"),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Venda)
    if mes:
        ano, m = mes.split("-")
        q = q.filter(
            extract("year",  Venda.data) == int(ano),
            extract("month", Venda.data) == int(m),
        )
    if status:
        q = q.filter(Venda.status == status)
    return q.order_by(Venda.data.desc()).all()


# ── CRIAR ───────────────────────────────────────────────
@router.post("/", response_model=VendaOut, status_code=201)
def criar_venda(venda: VendaCreate, db: Session = Depends(get_db)):
    db_venda = Venda(**venda.model_dump())
    db.add(db_venda)
    db.commit()
    db.refresh(db_venda)
    return db_venda


# ── EDITAR ──────────────────────────────────────────────
@router.put("/{venda_id}", response_model=VendaOut)
def editar_venda(venda_id: int, venda: VendaUpdate, db: Session = Depends(get_db)):
    db_venda = db.query(Venda).filter(Venda.id == venda_id).first()
    if not db_venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    for campo, valor in venda.model_dump().items():
        setattr(db_venda, campo, valor)
    db.commit()
    db.refresh(db_venda)
    return db_venda


# ── EXCLUIR ─────────────────────────────────────────────
@router.delete("/{venda_id}", status_code=204)
def excluir_venda(venda_id: int, db: Session = Depends(get_db)):
    db_venda = db.query(Venda).filter(Venda.id == venda_id).first()
    if not db_venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    db.delete(db_venda)
    db.commit()


# ── KPIs ────────────────────────────────────────────────
@router.get("/kpis", response_model=KPIOut)
def kpis(
    mes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    # MRR / carteira / ticket — portfólio atual completo (sem filtro de data).
    # Um cliente que entrou em Nov/2024 e ainda está Ativo SEMPRE contribui
    # para o MRR, independente do mês selecionado no filtro.
    todos_ativos  = [v for v in db.query(Venda).all() if v.status == "Ativo"]
    anuais        = [v for v in todos_ativos if v.contrato == "Anual"]
    total_mrr     = sum(float(v.mrr or 0) for v in todos_ativos)
    ticket        = total_mrr / len(todos_ativos) if todos_ativos else 0

    # Adesão / churns — movimentações do período selecionado.
    # Filtra pela data da venda para mostrar o que ACONTECEU naquele mês.
    q = db.query(Venda)
    if mes:
        ano, m = mes.split("-")
        q = q.filter(
            extract("year",  Venda.data) == int(ano),
            extract("month", Venda.data) == int(m),
        )
    periodo      = q.all()
    churns       = [v for v in periodo if v.status == "Cancelado"]
    total_adesao = sum(float(v.adesao    or 0) for v in periodo if v.status != "Cancelado")
    churn_mrr    = sum(float(v.churn_mrr or 0) for v in churns)

    return KPIOut(
        total_mrr    = Decimal(str(round(total_mrr, 2))),
        total_adesao = Decimal(str(round(total_adesao, 2))),
        ativos       = len(todos_ativos),
        anuais       = len(anuais),
        mensais      = len(todos_ativos) - len(anuais),
        ticket_medio = Decimal(str(round(ticket, 2))),
        churns       = len(churns),
        churn_mrr    = Decimal(str(round(churn_mrr, 2))),
    )


# ── COMPARATIVO 6 MESES ─────────────────────────────────
@router.get("/comparativo", response_model=List[ComparativoMes])
def comparativo(db: Session = Depends(get_db)):
    rows = (
        db.query(
            extract("year",  Venda.data).label("ano"),
            extract("month", Venda.data).label("mes_num"),
            func.sum(Venda.mrr   ).filter(Venda.status == "Ativo").label("mrr"),
            func.sum(Venda.adesao).label("adesao"),
            func.count(Venda.id  ).label("vendas"),
        )
        .group_by("ano", "mes_num")
        .order_by("ano", "mes_num")
        .all()
    )

    resultado = []
    for r in rows[-6:]:
        ano     = int(r.ano)
        mes_num = int(r.mes_num)
        mes_str = f"{ano}-{str(mes_num).zfill(2)}"
        label   = f"{MESES_PT[mes_num - 1]}/{str(ano)[2:]}"
        resultado.append(ComparativoMes(
            mes    = mes_str,
            label  = label,
            mrr    = Decimal(str(round(float(r.mrr    or 0), 2))),
            adesao = Decimal(str(round(float(r.adesao or 0), 2))),
            vendas = int(r.vendas),
        ))
    return resultado


# ── DIAGNÓSTICO (temporário) ─────────────────────────────
@router.get("/debug-kpis")
def debug_kpis(db: Session = Depends(get_db)):
    """Retorna contagem de registros agrupados por mês e status para diagnóstico."""
    rows = (
        db.query(
            extract("year",  Venda.data).label("ano"),
            extract("month", Venda.data).label("mes"),
            Venda.status,
            func.count(Venda.id).label("qtd"),
            func.sum(Venda.mrr).label("mrr"),
        )
        .group_by("ano", "mes", Venda.status)
        .order_by("ano", "mes")
        .all()
    )
    return [
        {
            "mes":    f"{int(r.ano)}-{str(int(r.mes)).zfill(2)}",
            "status": r.status,
            "qtd":    int(r.qtd),
            "mrr":    float(r.mrr or 0),
        }
        for r in rows
    ]


# ── MESES DISPONÍVEIS ────────────────────────────────────
@router.get("/meses")
def meses_disponiveis(db: Session = Depends(get_db)):
    rows = (
        db.query(
            extract("year",  Venda.data).label("ano"),
            extract("month", Venda.data).label("mes"),
        )
        .distinct()
        .order_by("ano", "mes")
        .all()
    )
    return [
        {
            "valor": f"{int(r.ano)}-{str(int(r.mes)).zfill(2)}",
            "label": f"{MESES_PT[int(r.mes) - 1]}/{str(int(r.ano))[2:]}",
        }
        for r in rows
    ]
