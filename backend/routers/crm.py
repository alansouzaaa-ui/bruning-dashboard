"""
Router CRM — integração real com Nectar CRM
============================================
Base URL : https://app.nectarcrm.com.br/crm/api/1/
Auth     : header  Access-Token: <JWT>
Docs     : https://nectarcrm.docs.apiary.io/
"""

import os
import re
import calendar
import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/crm", tags=["crm"])

NECTAR_BASE_URL = os.getenv("NECTAR_BASE_URL", "https://app.nectarcrm.com.br/crm/api/1")

# Extrai o JWT — JWTs sempre começam com 'eyJ' (base64url de '{"')
_raw_key = os.getenv("NECTAR_API_KEY", "")
_idx     = _raw_key.find('eyJ')
NECTAR_API_KEY = _raw_key[_idx:].strip() if _idx >= 0 else _raw_key.strip()

# Status de oportunidade no Nectar
STATUS_EM_ANDAMENTO = 1
STATUS_GANHA        = 2
STATUS_PERDIDA      = 3
STATUS_DESCARTADA   = 4


def _headers():
    return {"Access-Token": NECTAR_API_KEY}


def _configurado() -> bool:
    return bool(NECTAR_API_KEY)


def _mes_para_datas(mes: str):
    """'2026-04' → ('2026-04-01', '2026-04-30')"""
    ano, m = map(int, mes.split("-"))
    ultimo = calendar.monthrange(ano, m)[1]
    return f"{ano}-{m:02d}-01", f"{ano}-{m:02d}-{ultimo:02d}"


def _como_lista(resp) -> list:
    """Nectar às vezes retorna lista, às vezes {'data': [...]}."""
    if isinstance(resp, list):
        return resp
    if isinstance(resp, dict):
        return resp.get("data", resp.get("results", resp.get("items", [])))
    return []


# ── DEBUG (temporário) ───────────────────────────────────────────────────────

@router.get("/debug")
async def debug_nectar():
    """Diagnóstico — mostra resposta bruta do Nectar sem lançar exceção."""
    async with httpx.AsyncClient() as c:
        results = {}
        for endpoint in ["/pipelines/", "/oportunidades/", "/contatos/"]:
            try:
                r = await c.get(
                    f"{NECTAR_BASE_URL}{endpoint}",
                    headers=_headers(),
                    timeout=10,
                )
                results[endpoint] = {"status": r.status_code, "body": r.text[:300]}
            except Exception as e:
                results[endpoint] = {"erro": str(e)}
        return {
            "token_extraido": NECTAR_API_KEY[:30] + "..." if NECTAR_API_KEY else "VAZIO",
            "endpoints": results,
        }


# ── STATUS ───────────────────────────────────────────────────────────────────

@router.get("/status")
def crm_status():
    return {
        "configurado": _configurado(),
        "mensagem": (
            "Nectar CRM conectado."
            if _configurado()
            else "Configure NECTAR_API_KEY no Railway para ativar os dados reais."
        ),
    }


# ── PIPELINES (para o frontend listar) ───────────────────────────────────────

@router.get("/pipelines")
async def listar_pipelines():
    if not _configurado():
        return {"pipelines": []}

    async with httpx.AsyncClient() as c:
        try:
            r = await c.get(f"{NECTAR_BASE_URL}/pipelines/", headers=_headers(), timeout=10)
            r.raise_for_status()
            pipelines = _como_lista(r.json())
            return {
                "pipelines": [
                    {"id": p["id"], "nome": p.get("nome", ""), "etapas": len(p.get("sequencias", []))}
                    for p in pipelines
                ]
            }
        except Exception as e:
            raise HTTPException(502, f"Erro ao buscar pipelines: {e}")


# ── FUNIL DE VENDAS ───────────────────────────────────────────────────────────

@router.get("/funil")
async def funil(
    mes:         Optional[str] = Query(None),
    pipeline_id: Optional[int] = Query(None),
):
    """
    Retorna as etapas do funil com contagem de oportunidades em andamento.
    Se pipeline_id não for informado, usa o primeiro pipeline da conta.
    """
    if not _configurado():
        return _mock_funil()

    async with httpx.AsyncClient() as c:
        try:
            # 1. Busca pipelines
            pr = await c.get(f"{NECTAR_BASE_URL}/pipelines/", headers=_headers(), timeout=10)
            pr.raise_for_status()
            pipelines = _como_lista(pr.json())

            if not pipelines:
                return _mock_funil()

            # Seleciona pipeline: preferência para o informado, ou o que contém "bruning", ou o primeiro
            pipeline = None
            if pipeline_id:
                pipeline = next((p for p in pipelines if p["id"] == pipeline_id), None)
            if not pipeline:
                pipeline = next((p for p in pipelines if "bruning" in p.get("nome", "").lower()), pipelines[0])

            etapas_def = pipeline.get("sequencias", [])
            pid        = pipeline["id"]

            # 2. Busca oportunidades em andamento neste pipeline
            params: dict = {
                "displayLength": 200,
                "funil":         pid,
                "status":        STATUS_EM_ANDAMENTO,
            }
            if mes:
                inicio, fim = _mes_para_datas(mes)
                params["dataInicio"] = inicio
                params["dataFim"]    = fim

            or_ = await c.get(f"{NECTAR_BASE_URL}/oportunidades/", headers=_headers(), params=params, timeout=15)
            or_.raise_for_status()
            opps = _como_lista(or_.json())

            # 3. Conta por etapa
            contagens: dict[int, int] = {}
            for opp in opps:
                etapa_id = None
                etapa_obj = opp.get("etapaAtual")
                if isinstance(etapa_obj, dict):
                    etapa_id = etapa_obj.get("id")
                elif isinstance(etapa_obj, int):
                    etapa_id = etapa_obj
                if etapa_id:
                    contagens[etapa_id] = contagens.get(etapa_id, 0) + 1

            # 4. Monta resultado
            resultado = []
            total_entrada = contagens.get(etapas_def[0]["id"], 0) if etapas_def else 1

            for i, etapa in enumerate(etapas_def):
                count      = contagens.get(etapa["id"], 0)
                prev_count = contagens.get(etapas_def[i - 1]["id"], count) if i > 0 else count
                taxa_etapa = round((count / prev_count) * 100, 1) if prev_count > 0 else 100
                taxa_acum  = round((count / total_entrada) * 100, 1) if total_entrada > 0 else 0

                resultado.append({
                    "nome":           etapa.get("nome", f"Etapa {i+1}"),
                    "quantidade":     count,
                    "taxa_conversao": taxa_etapa,
                    "taxa_acumulada": taxa_acum,
                })

            return {
                "etapas":   resultado,
                "pipeline": pipeline.get("nome", ""),
                "fonte":    "nectar",
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Erro ao consultar Nectar (funil): {e}")


# ── KPIs DE CONVERSÃO ─────────────────────────────────────────────────────────

@router.get("/kpis")
async def kpis_crm(mes: Optional[str] = Query(None)):
    """
    KPIs calculados a partir das oportunidades do Nectar.
    Filtra por mês de conclusão quando `mes` é informado.
    """
    if not _configurado():
        return _mock_kpis()

    async with httpx.AsyncClient() as c:
        try:
            params: dict = {"displayLength": 200}

            if mes:
                inicio, fim = _mes_para_datas(mes)
                params["dataInicio"] = inicio
                params["dataFim"]    = fim

            # Busca ganhas e perdidas separadamente para garantir completude
            ganhas_r  = await c.get(
                f"{NECTAR_BASE_URL}/oportunidades/",
                headers=_headers(),
                params={**params, "status": STATUS_GANHA},
                timeout=15,
            )
            ganhas_r.raise_for_status()
            ganhas = _como_lista(ganhas_r.json())

            perdidas_r = await c.get(
                f"{NECTAR_BASE_URL}/oportunidades/",
                headers=_headers(),
                params={**params, "status": STATUS_PERDIDA},
                timeout=15,
            )
            perdidas_r.raise_for_status()
            perdidas = _como_lista(perdidas_r.json())

            total    = len(ganhas) + len(perdidas)
            win_rate = round((len(ganhas) / total) * 100, 1) if total > 0 else 0

            # Ciclo médio em dias (dataCriacao → dataConclusao)
            from datetime import datetime
            ciclos = []
            for d in ganhas:
                criacao    = d.get("dataCriacao")
                conclusao  = d.get("dataConclusao")
                if criacao and conclusao:
                    try:
                        fmt = "%Y-%m-%d %H:%M:%S"
                        dt_c = datetime.strptime(criacao[:19],   fmt)
                        dt_f = datetime.strptime(conclusao[:19], fmt)
                        dias = (dt_f - dt_c).days
                        if dias >= 0:
                            ciclos.append(dias)
                    except Exception:
                        pass

            ciclo_medio = round(sum(ciclos) / len(ciclos)) if ciclos else 0

            # Valor total ganho
            valor_ganho = sum(float(d.get("valorTotal") or 0) for d in ganhas)

            # Leads necessários para fechar 1 negócio
            leads_para_fechar = round(total / len(ganhas), 1) if ganhas else 0

            return {
                "win_rate":           win_rate,
                "ciclo_medio_dias":   ciclo_medio,
                "leads_para_fechar":  leads_para_fechar,
                "total_ganhos":       len(ganhas),
                "total_perdidos":     len(perdidas),
                "valor_ganho":        round(valor_ganho, 2),
                "fonte":              "nectar",
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Erro ao consultar Nectar (kpis): {e}")


# ── MOCKS ─────────────────────────────────────────────────────────────────────

def _mock_funil():
    return {
        "etapas": [
            {"nome": "Prospecção",   "quantidade": 42, "taxa_conversao": 100, "taxa_acumulada": 100},
            {"nome": "Qualificação", "quantidade": 28, "taxa_conversao":  67, "taxa_acumulada":  67},
            {"nome": "Apresentação", "quantidade": 18, "taxa_conversao":  64, "taxa_acumulada":  43},
            {"nome": "Proposta",     "quantidade": 11, "taxa_conversao":  61, "taxa_acumulada":  26},
            {"nome": "Negociação",   "quantidade":  7, "taxa_conversao":  64, "taxa_acumulada":  17},
            {"nome": "Fechamento",   "quantidade":  4, "taxa_conversao":  57, "taxa_acumulada":  10},
        ],
        "pipeline": "Demo",
        "fonte": "mock — configure NECTAR_API_KEY para dados reais",
    }


def _mock_kpis():
    return {
        "win_rate":           33.3,
        "ciclo_medio_dias":   28,
        "leads_para_fechar":  10.5,
        "total_ganhos":       4,
        "total_perdidos":     8,
        "valor_ganho":        0,
        "fonte": "mock — configure NECTAR_API_KEY para dados reais",
    }
