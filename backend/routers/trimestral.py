from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import Optional
from decimal import Decimal
from datetime import date

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import Venda, MetaTrimestral
from schemas import MetaTrimestralIn, AvaliacaoOut, NivelPerformance

router = APIRouter(prefix="/trimestral", tags=["trimestral"])

MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

# Mapeamento de trimestre para meses
TRIMESTRES = {
    "Q1": [1, 2, 3],
    "Q2": [4, 5, 6],
    "Q3": [7, 8, 9],
    "Q4": [10, 11, 12],
}

NIVEIS = [
    {
        "min": 95, "max": 999,
        "codigo": "excelente",
        "label": "Nível Excelente",
        "faixa": "95% – 100%+",
        "acao": "Referência do time",
        "prazo": "Contínuo",
        "meta_plano": "Ponto de referência para todos",
        "consequencia": "O time deve replicar tudo o que esse vendedor faz de positivo",
        "cor": "#22c55e",
    },
    {
        "min": 85, "max": 95,
        "codigo": "otimo",
        "label": "Nível Ótimo",
        "faixa": "85% – 95%",
        "acao": "Replicar práticas",
        "prazo": "Contínuo",
        "meta_plano": "Manter e evoluir para ≥ 95%",
        "consequencia": "Fonte de boas práticas para o time",
        "cor": "#84cc16",
    },
    {
        "min": 75, "max": 85,
        "codigo": "satisfatorio",
        "label": "Nível Satisfatório",
        "faixa": "75% – 85%",
        "acao": "PDI — Próximo trimestre",
        "prazo": "Trimestral",
        "meta_plano": "Evolução mínima de +5pp",
        "consequencia": "Foco em melhoria contínua de performance",
        "cor": "#eab308",
    },
    {
        "min": 70, "max": 75,
        "codigo": "repescagem",
        "label": "Repescagem",
        "faixa": "70% – 75%",
        "acao": "Plano de Ação",
        "prazo": "60 dias",
        "meta_plano": "Mínimo 90% de atingimento",
        "consequencia": "Caso contrário: apto ao desligamento",
        "cor": "#f97316",
    },
    {
        "min": 0, "max": 70,
        "codigo": "atencao",
        "label": "Nível Máximo de Atenção",
        "faixa": "60% – 70%",
        "acao": "Plano de Ação",
        "prazo": "30 dias",
        "meta_plano": "100% de atingimento",
        "consequencia": "Caso contrário: apto ao desligamento",
        "cor": "#ef4444",
    },
]


def get_trimestre_atual():
    hoje = date.today()
    q = (hoje.month - 1) // 3 + 1
    return f"{hoje.year}-Q{q}"


def trimestre_to_meses(trimestre: str):
    """'2026-Q1' → (2026, [1,2,3])"""
    ano_str, q_str = trimestre.split("-")
    return int(ano_str), TRIMESTRES[q_str]


def calcular_nivel(atingimento: float) -> NivelPerformance:
    for n in NIVEIS:
        if atingimento >= n["min"]:
            return NivelPerformance(**{k: v for k, v in n.items() if k not in ("min", "max")})
    return NivelPerformance(**{k: v for k, v in NIVEIS[-1].items() if k not in ("min", "max")})


def _avaliar(trimestre: str, db: Session) -> AvaliacaoOut:
    ano, meses_num = trimestre_to_meses(trimestre)
    q_str = trimestre.split("-")[1]
    label = f"{q_str} {ano}"

    # Buscar meta configurada
    cfg = db.query(MetaTrimestral).filter(MetaTrimestral.trimestre == trimestre).first()
    meta_mrr  = float(cfg.meta_mrr)  if cfg else 15000.0
    meta_ades = float(cfg.meta_ades) if cfg else 9000.0

    # Buscar vendas do trimestre
    vendas = (
        db.query(Venda)
        .filter(
            extract("year",  Venda.data).in_([ano]),
            extract("month", Venda.data).in_(meses_num),
        )
        .all()
    )

    ativos = [v for v in vendas if v.status == "Ativo"]
    realizado_mrr  = sum(float(v.mrr)    for v in ativos)
    realizado_ades = sum(float(v.adesao) for v in vendas)

    at_mrr  = round((realizado_mrr  / meta_mrr)  * 100, 1) if meta_mrr  > 0 else 0
    at_ades = round((realizado_ades / meta_ades) * 100, 1) if meta_ades > 0 else 0
    at_geral = at_mrr  # nível de performance baseado apenas no MRR

    nivel = calcular_nivel(at_geral)

    meses_label = [
        f"{MESES_PT[m - 1]}/{str(ano)[2:]}" for m in meses_num
    ]

    return AvaliacaoOut(
        trimestre=trimestre,
        label=label,
        meta_mrr=meta_mrr,
        meta_ades=meta_ades,
        realizado_mrr=realizado_mrr,
        realizado_ades=realizado_ades,
        atingimento_mrr=at_mrr,
        atingimento_ades=at_ades,
        atingimento_geral=at_geral,
        nivel=nivel,
        meses=meses_label,
    )


@router.get("/atual", response_model=AvaliacaoOut)
def avaliacao_atual(db: Session = Depends(get_db)):
    return _avaliar(get_trimestre_atual(), db)


@router.get("/historico")
def historico(db: Session = Depends(get_db)):
    """Retorna os últimos 4 trimestres."""
    hoje = date.today()
    q_atual = (hoje.month - 1) // 3 + 1
    ano_atual = hoje.year

    trimestres = []
    q, ano = q_atual, ano_atual
    for _ in range(4):
        trimestres.append(f"{ano}-Q{q}")
        q -= 1
        if q == 0:
            q = 4
            ano -= 1

    return [_avaliar(t, db) for t in trimestres]


@router.put("/meta", response_model=MetaTrimestralIn)
def salvar_meta(body: MetaTrimestralIn, db: Session = Depends(get_db)):
    cfg = db.query(MetaTrimestral).filter(MetaTrimestral.trimestre == body.trimestre).first()
    if cfg:
        cfg.meta_mrr  = body.meta_mrr
        cfg.meta_ades = body.meta_ades
    else:
        db.add(MetaTrimestral(
            trimestre=body.trimestre,
            meta_mrr=body.meta_mrr,
            meta_ades=body.meta_ades,
        ))
    db.commit()
    return body
