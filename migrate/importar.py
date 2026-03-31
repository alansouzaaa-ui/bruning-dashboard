"""
PASSO 2 — Importar dados para o banco

1. Coloque o arquivo vendas_export.json nesta pasta (migrate/)
2. Com o backend rodando, execute:
   cd migrate
   python importar.py
"""

import json
import sys
import os
from datetime import datetime
from decimal import Decimal

# Adiciona o backend no path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from database import SessionLocal, engine, Base
from models import Venda, ComissaoPaga

Base.metadata.create_all(bind=engine)


def parse_churn_obs(obs: str) -> float:
    """Extrai valor numérico de obs antigas como 'churn 275'."""
    import re
    match = re.search(r'[\d.]+', obs or '')
    return float(match.group()) if match else 0.0


def importar():
    caminho = os.path.join(os.path.dirname(__file__), 'vendas_export.json')

    if not os.path.exists(caminho):
        print("❌ Arquivo vendas_export.json não encontrado nesta pasta.")
        print("   Execute primeiro o export_localstorage.js no navegador.")
        sys.exit(1)

    with open(caminho, encoding='utf-8') as f:
        data = json.load(f)

    db = SessionLocal()

    # ── Vendas ──────────────────────────────────────────
    vendas_raw = data.get('vendas', [])
    print(f"Importando {len(vendas_raw)} vendas...")

    importadas = 0
    ignoradas  = 0

    for v in vendas_raw:
        # Evita duplicatas pelo ID original
        existe = db.query(Venda).filter(Venda.id == v['id']).first()
        if existe:
            ignoradas += 1
            continue

        # Churn: prefere campo dedicado, senão extrai do obs
        churn_mrr = float(v.get('churnMrr') or 0)
        if churn_mrr == 0 and v.get('status') == 'Cancelado':
            churn_mrr = parse_churn_obs(v.get('obs', ''))

        venda = Venda(
            id        = v['id'],
            data      = datetime.strptime(v['data'], '%Y-%m-%d').date(),
            cod       = v.get('cod') or None,
            cliente   = v['cliente'],
            cnpj      = v.get('cnpj') or None,
            segmento  = v.get('seg') or None,
            plano     = v.get('plano') or None,
            contrato  = v.get('contrato') or None,
            mrr       = Decimal(str(v.get('mrr') or 0)),
            adesao    = Decimal(str(v.get('ades') or 0)),
            churn_mrr = Decimal(str(churn_mrr)),
            status    = v.get('status') or None,
            tipo      = v.get('tipo') or None,
            obs       = v.get('obs') or None,
        )
        db.add(venda)
        importadas += 1

    # ── Comissões ────────────────────────────────────────
    comissoes_raw = data.get('comissoes', [])
    print(f"Importando {len(comissoes_raw)} comissões...")

    for c in comissoes_raw:
        existe = db.query(ComissaoPaga).filter(ComissaoPaga.id == c['id']).first()
        if existe:
            continue
        comissao = ComissaoPaga(
            id         = c['id'],
            mes        = c['mes'],
            comis_mrr  = Decimal(str(c.get('mrr')   or 0)),
            comis_ades = Decimal(str(c.get('ades')  or 0)),
            total_pago = Decimal(str(c.get('total') or 0)),
            obs        = c.get('obs') or None,
        )
        db.add(comissao)

    db.commit()
    db.close()

    print(f"✅ Concluído: {importadas} vendas importadas, {ignoradas} ignoradas (já existiam).")


if __name__ == '__main__':
    importar()
