"""
Router CRM — integração com Nectar CRM
======================================
Estrutura pronta para conectar à API do Nectar.

Para ativar:
  1. Defina a variável de ambiente NECTAR_API_KEY no Railway
  2. Descubra o base URL da API Nectar (ex: https://api.nectar.com.br/v1)
  3. Substitua os placeholders abaixo pelos endpoints reais

Endpoints que serão consumidos do Nectar:
  - GET /funnels/{funnel_id}/stages  → etapas e contagens
  - GET /deals                        → negócios (para ciclo e win rate)
  - GET /leads                        → volume de leads por período
"""

import os
import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/crm", tags=["crm"])

NECTAR_API_KEY  = os.getenv("NECTAR_API_KEY", "")
NECTAR_BASE_URL = os.getenv("NECTAR_BASE_URL", "https://api.nectar.com.br/v1")


def _nectar_headers():
    return {
        "Authorization": f"Bearer {NECTAR_API_KEY}",
        "Content-Type": "application/json",
    }


def _is_configured() -> bool:
    return bool(NECTAR_API_KEY)


# ── STATUS ───────────────────────────────────────────────
@router.get("/status")
def crm_status():
    """Verifica se o Nectar está configurado."""
    return {
        "configurado": _is_configured(),
        "mensagem": (
            "Nectar CRM conectado."
            if _is_configured()
            else "Configure NECTAR_API_KEY no Railway para ativar."
        ),
    }


# ── FUNIL DE VENDAS ──────────────────────────────────────
@router.get("/funil")
async def funil(mes: Optional[str] = Query(None)):
    """
    Retorna as etapas do funil com contagem e taxa de conversão.
    Fonte: Nectar GET /funnels/{id}/stages
    """
    if not _is_configured():
        return _mock_funil()

    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                f"{NECTAR_BASE_URL}/funnels/default/stages",
                headers=_nectar_headers(),
                params={"mes": mes} if mes else {},
                timeout=10,
            )
            r.raise_for_status()
            dados = r.json()
            return _processar_funil(dados)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erro ao consultar Nectar: {str(e)}")


# ── KPIs DE CONVERSÃO ────────────────────────────────────
@router.get("/kpis")
async def kpis_crm(mes: Optional[str] = Query(None)):
    """
    KPIs calculados a partir dos dados do Nectar.
    Fonte: Nectar GET /deals + /leads
    """
    if not _is_configured():
        return _mock_kpis()

    async with httpx.AsyncClient() as client:
        try:
            deals_r = await client.get(
                f"{NECTAR_BASE_URL}/deals",
                headers=_nectar_headers(),
                params={"mes": mes} if mes else {},
                timeout=10,
            )
            deals_r.raise_for_status()
            return _calcular_kpis(deals_r.json())
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erro ao consultar Nectar: {str(e)}")


# ── PROCESSAMENTO (ajustar conforme resposta real do Nectar) ──

def _processar_funil(dados: dict) -> dict:
    """Transforma resposta do Nectar em formato do dashboard."""
    etapas = dados.get("stages", dados if isinstance(dados, list) else [])
    resultado = []
    total_entrada = etapas[0].get("count", 1) if etapas else 1

    for i, etapa in enumerate(etapas):
        count = etapa.get("count", 0)
        count_anterior = etapas[i - 1].get("count", count) if i > 0 else count
        taxa = round((count / count_anterior) * 100, 1) if count_anterior > 0 else 100

        resultado.append({
            "nome":       etapa.get("name", f"Etapa {i+1}"),
            "quantidade": count,
            "taxa_conversao": taxa,
            "taxa_acumulada": round((count / total_entrada) * 100, 1) if total_entrada > 0 else 0,
        })

    return {"etapas": resultado, "fonte": "nectar"}


def _calcular_kpis(dados: dict) -> dict:
    """Calcula KPIs a partir dos negócios do Nectar."""
    deals = dados.get("deals", dados if isinstance(dados, list) else [])

    ganhos   = [d for d in deals if d.get("status") == "won"]
    perdidos = [d for d in deals if d.get("status") == "lost"]
    total    = len(ganhos) + len(perdidos)

    win_rate = round((len(ganhos) / total) * 100, 1) if total > 0 else 0

    ciclos = [d.get("cycle_days", 0) for d in ganhos if d.get("cycle_days")]
    ciclo_medio = round(sum(ciclos) / len(ciclos), 0) if ciclos else 0

    leads_para_fechar = round(total / len(ganhos), 1) if ganhos else 0

    return {
        "win_rate":           win_rate,
        "ciclo_medio_dias":   int(ciclo_medio),
        "leads_para_fechar":  leads_para_fechar,
        "total_ganhos":       len(ganhos),
        "total_perdidos":     len(perdidos),
        "fonte": "nectar",
    }


# ── MOCKS (exibidos enquanto Nectar não está configurado) ─

def _mock_funil():
    return {
        "etapas": [
            {"nome": "Prospecção",    "quantidade": 120, "taxa_conversao": 100, "taxa_acumulada": 100},
            {"nome": "Qualificação",  "quantidade":  85, "taxa_conversao":  71, "taxa_acumulada":  71},
            {"nome": "Apresentação",  "quantidade":  52, "taxa_conversao":  61, "taxa_acumulada":  43},
            {"nome": "Proposta",      "quantidade":  30, "taxa_conversao":  58, "taxa_acumulada":  25},
            {"nome": "Negociação",    "quantidade":  18, "taxa_conversao":  60, "taxa_acumulada":  15},
            {"nome": "Fechamento",    "quantidade":  10, "taxa_conversao":  56, "taxa_acumulada":   8},
        ],
        "fonte": "mock — configure NECTAR_API_KEY para dados reais",
    }


def _mock_kpis():
    return {
        "win_rate":           33.3,
        "ciclo_medio_dias":   28,
        "leads_para_fechar":  12,
        "total_ganhos":       10,
        "total_perdidos":     20,
        "fonte": "mock — configure NECTAR_API_KEY para dados reais",
    }
