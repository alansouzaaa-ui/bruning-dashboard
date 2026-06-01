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
    payment_status: Optional[str] = None,
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
    if payment_status:
        q = q.filter(Venda.payment_status == payment_status)
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
    # Sem filtro  → Todos os meses  (aba "Todos")
    # Com filtro  → Apenas o mês X  (aba individual)
    q = db.query(Venda)
    if mes:
        ano, m = mes.split("-")
        q = q.filter(
            extract("year",  Venda.data) == int(ano),
            extract("month", Venda.data) == int(m),
        )

    todas    = q.all()
    ativos   = [v for v in todas if v.status == "Ativo"]
    anuais   = [v for v in ativos if v.contrato == "Anual"]
    churns   = [v for v in todas if v.status == "Cancelado"]

    total_mrr    = sum(float(v.mrr       or 0) for v in ativos)
    total_adesao = sum(float(v.adesao    or 0) for v in todas)
    churn_mrr    = sum(float(v.churn_mrr or 0) for v in churns)
    ticket       = total_mrr / len(ativos) if ativos else 0

    # Payment breakdown (registros nulos tratados como 'pending')
    pagas     = [v for v in todas if (v.payment_status or 'pending') == 'paid']
    pendentes = [v for v in todas if (v.payment_status or 'pending') == 'pending']

    # MRR split: apenas contratos Ativos com payment_status
    ativos_pagos     = [v for v in ativos if (v.payment_status or 'pending') == 'paid']
    ativos_pendentes = [v for v in ativos if (v.payment_status or 'pending') == 'pending']

    return KPIOut(
        total_mrr        = Decimal(str(round(total_mrr, 2))),
        total_adesao     = Decimal(str(round(total_adesao, 2))),
        ativos           = len(ativos),
        anuais           = len(anuais),
        mensais          = len(ativos) - len(anuais),
        ticket_medio     = Decimal(str(round(ticket, 2))),
        churns           = len(churns),
        churn_mrr        = Decimal(str(round(churn_mrr, 2))),
        adesao_recebida  = Decimal(str(round(sum(float(v.adesao or 0) for v in pagas), 2))),
        adesao_pendente  = Decimal(str(round(sum(float(v.adesao or 0) for v in pendentes), 2))),
        mrr_recebido     = Decimal(str(round(sum(float(v.mrr or 0) for v in ativos_pagos), 2))),
        mrr_pendente     = Decimal(str(round(sum(float(v.mrr or 0) for v in ativos_pendentes), 2))),
        vendas_pagas     = len(pagas),
        vendas_pendentes = len(pendentes),
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


# ── DIAGNÓSTICO (protegido pelo token via router) ────────
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

    meses = [
        {
            "valor": f"{int(r.ano)}-{str(int(r.mes)).zfill(2)}",
            "label": f"{MESES_PT[int(r.mes) - 1]}/{str(int(r.ano))[2:]}",
        }
        for r in rows
    ]

    # Garante que o mês corrente está SEMPRE presente na lista,
    # mesmo sem nenhuma venda registrada — o dashboard já funciona do dia 1.
    hoje           = date.today()
    mes_atual_str  = f"{hoje.year}-{str(hoje.month).zfill(2)}"
    mes_atual_label = f"{MESES_PT[hoje.month - 1]}/{str(hoje.year)[2:]}"

    if not any(m["valor"] == mes_atual_str for m in meses):
        meses.append({"valor": mes_atual_str, "label": mes_atual_label})
        meses.sort(key=lambda m: m["valor"])

    return meses
