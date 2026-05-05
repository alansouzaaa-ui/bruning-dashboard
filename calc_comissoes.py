"""
Script para calcular comissões mensais a partir do HTML de vendas
e inserir no Railway via API.
"""

import re
import json
import requests
from collections import defaultdict
from datetime import datetime

# ── CONFIG ──────────────────────────────────────────────────────────────────
API_URL = "https://bruning-dashboard-production.up.railway.app"
API_KEY = "bruning-dashboard-2026"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Metas mensais (rampagem)
METAS_MRR = {
    "2024-11": 2000, "2024-12": 1500,
    "2025-01": 3000, "2025-02": 3500, "2025-03": 4000,
}
DEFAULT_META_MRR = 5000
ADESAO_META = 7500

# ── TABELAS DE COMISSÃO ──────────────────────────────────────────────────────
# MRR: [(ate, pct), ...] — em ordem crescente
MRR_TABLE = [
    (1499.99, 0.15),
    (1999.99, 0.20),
    (2499.99, 0.25),
    (2999.99, 0.30),
    (3499.99, 0.325),
    (3999.99, 0.35),
    (4499.99, 0.375),
    (4999.99, 0.40),
    (5499.99, 0.425),
    (5999.99, 0.45),
    (6499.99, 0.475),
    (6999.99, 0.50),
    (7499.99, 0.525),
    (float('inf'), 0.55),
]

# Churn últimos 3 meses
CHURN_TABLE = [
    (0,     0.00),
    (250,   0.025),
    (350,   0.035),
    (500,   0.045),
    (750,   0.055),
    (1000,  0.065),
    (float('inf'), 0.075),
]

# Plano anual (quantidade → % extra sobre MRR commission)
ANNUAL_TABLE = [0, 0.01, 0.02, 0.03, 0.04, 0.05]  # index 0..5+

# Adesão: [(ate, pct), ...]
ADES_TABLE = [
    (2249.99, 0.09),
    (2999.99, 0.095),
    (3749.99, 0.09),
    (4499.99, 0.095),
    (5249.99, 0.10),
    (5999.99, 0.105),
    (6749.99, 0.11),
    (7499.99, 0.115),
    (8249.99, 0.12),
    (8999.99, 0.125),
    (9749.99, 0.13),
    (10499.99, 0.135),
    (11249.99, 0.14),
    (float('inf'), 0.145),
]

META_BONUS = 250.0  # bônus se atingimento MRR >= 100%


def get_pct(table, value):
    for limit, pct in table:
        if value <= limit:
            return pct
    return table[-1][1]


def parse_brl(text):
    """'R$ 1.234,56' → 1234.56, '—' → 0"""
    text = text.strip()
    if text in ('—', '', '-', 'R$ —'):
        return 0.0
    text = re.sub(r'R\$\s*', '', text)
    text = text.replace('.', '').replace(',', '.')
    try:
        return float(text)
    except:
        return 0.0


def parse_date_to_month(text):
    """'05/11/24' → '2024-11'"""
    text = text.strip()
    m = re.match(r'(\d{2})/(\d{2})/(\d{2})', text)
    if m:
        d, mo, y = m.groups()
        year = int('20' + y)
        return f"{year}-{mo}"
    return None


# ── DADOS DE VENDAS (hardcoded do HTML) ──────────────────────────────────────
# Extraído do HTML fornecido: (data_mes, mrr, ades, status, tipo, contrato, obs)
VENDAS_RAW = [
    # Nov/24
    ("2024-11", 250,   500,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-11", 300,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-11", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-11", 250,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-11", 310,   550,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-11", 255,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Dez/24
    ("2024-12", 297.5, 290,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-12", 190,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-12", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2024-12", 135,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Jan/25
    ("2025-01", 246.5, 290,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 150,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 261,   350,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 400,   2200,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 270,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 170,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 300,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 220,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 250,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 320,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 200,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 300,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 250,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 200,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 150,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 150,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-01", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Fev/25
    ("2025-02", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 150"),
    ("2025-02", 150,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 225,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 300,   550,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 200,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 225,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 310,   270,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 270,   800,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 333,   270,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 310,   1100,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 250,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-02", 250,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Mar/25
    ("2025-03", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 250"),
    ("2025-03", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 300"),
    ("2025-03", 250,   180,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 333,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 225,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 290,   400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 290,   400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 270,   350,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 270,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 297,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 256,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-03", 270,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Abr/25
    ("2025-04", 270,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 270"),
    ("2025-04", 180,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 180,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 430,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 300,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 373.5, 800,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 450,   1800,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 260,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 301,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 318.25,0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 345,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 335,   1350,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-04", 335,   0,     "Ativo",    "JA É CLIENTE", "Mensal", ""),
    # Mai/25
    ("2025-05", 220,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 368,   500,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 209,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 260,   180,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 220,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 100,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 100,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 395,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 310,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-05", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Jun/25
    ("2025-06", 385,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 270,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 100,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 275,   400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 250,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 100,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 200,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 100,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 450,   800,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 290,   360,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 100,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-06", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Jul/25
    ("2025-07", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 250"),
    ("2025-07", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 200"),
    ("2025-07", 330,   630,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 430"),
    ("2025-07", 275,   400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 200,   584.9, "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 470,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 275,   270,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 290,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 242,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 410,   900,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 170,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-07", 210,   225,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Ago/25
    ("2025-08", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 250"),
    ("2025-08", 150,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 150,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 275,   300,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 275,   0,     "Ativo",    "JA É CLIENTE", "Mensal", ""),
    ("2025-08", 370,   1800,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 150,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 270"),
    ("2025-08", 150,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 275,   480,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-08", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Set/25
    ("2025-09", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 295,   400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 275"),
    ("2025-09", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 99"),
    ("2025-09", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 220,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 180,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 250,   500,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 250,   500,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-09", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Out/25
    ("2025-10", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 325,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 285,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 275,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 99,    0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 127,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 275,   1000,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-10", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 470"),
    ("2025-10", 115,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Nov/25
    ("2025-11", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 275,   1000,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2025-11", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Jan/26
    ("2026-01", 480,   270,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 275,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 295,   400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 275,   0,     "Ativo",    "JA É CLIENTE", "Mensal", ""),
    ("2026-01", 315,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 200,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 250,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 200"),
    ("2026-01", 240,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 200,   150,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 275,   0,     "Ativo",    "JA É CLIENTE", "Mensal", ""),
    ("2026-01", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 233.75,400,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 275"),
    ("2026-01", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 180"),
    ("2026-01", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-01", 233.75,0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Fev/26
    ("2026-02", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 315,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 200,   360,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 200,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 345,   2000,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 275,   1500,  "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 150,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 275,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 0,     0,     "Cancelado","CHURN",        "Mensal", "churn 275"),
    ("2026-02", 275,   500,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-02", 275,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    # Mar/26
    ("2026-03", 200,   0,     "Ativo",    "CLIENTE NOVO", "Anual",  ""),
    ("2026-03", 170,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-03", 233.75,0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-03", 345,   0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-03", 275,   400,   "Ativo",    "CLIENTE NOVO", "Anual",  ""),
    ("2026-03", 275,   200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-03", 233.75,0,     "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-03", 275,   800,   "Ativo",    "CLIENTE NOVO", "Anual",  ""),
    ("2026-03", 247.5, 200,   "Ativo",    "CLIENTE NOVO", "Mensal", ""),
    ("2026-03", 275,   0,     "Ativo",    "CLIENTE NOVO", "Anual",  ""),
]


def calcular_mes(mes, vendas_mes, churn_3meses):
    """Calcula a comissão de um mês."""
    mrr_total = sum(v[1] for v in vendas_mes if v[3] == "Ativo" and v[4] in ("CLIENTE NOVO", "JA É CLIENTE"))
    ades_total = sum(v[2] for v in vendas_mes if v[3] == "Ativo")
    churn_valor = sum(
        float(re.search(r'churn\s+(\d+)', v[6]).group(1))
        for v in vendas_mes if v[3] == "Cancelado" and re.search(r'churn\s+(\d+)', v[6])
    )
    annual_count = sum(1 for v in vendas_mes if v[5] == "Anual" and v[3] == "Ativo")

    # MRR commission
    mrr_pct = get_pct(MRR_TABLE, mrr_total)
    mrr_commission = mrr_total * mrr_pct

    # Churn deduction (rolling 3 months)
    churn_pct = get_pct(CHURN_TABLE, churn_3meses)
    churn_deduction = churn_3meses * churn_pct

    # Annual bonus
    annual_idx = min(annual_count, 5)
    annual_pct = ANNUAL_TABLE[annual_idx]
    annual_bonus = mrr_commission * annual_pct

    # Meta bonus
    meta_mrr = METAS_MRR.get(mes, DEFAULT_META_MRR)
    atingimento = mrr_total / meta_mrr if meta_mrr > 0 else 0
    meta_bonus = META_BONUS if atingimento >= 1.0 else 0

    # MRR total commission
    comis_mrr = mrr_commission - churn_deduction + annual_bonus + meta_bonus

    # Adesão commission
    ades_pct = get_pct(ADES_TABLE, ades_total)
    comis_ades = ades_total * ades_pct

    total = comis_mrr + comis_ades

    print(f"\n{'--'*25}")
    print(f"  {mes}")
    print(f"  MRR vendido: R${mrr_total:,.2f}  -> {mrr_pct*100:.1f}%  = R${mrr_commission:,.2f}")
    print(f"  Churn 3m: R${churn_3meses:,.2f}  -> {churn_pct*100:.1f}%  = -R${churn_deduction:,.2f}")
    print(f"  Planos anuais: {annual_count}  -> +{annual_pct*100:.0f}%  = +R${annual_bonus:,.2f}")
    print(f"  Bonus meta: R${meta_bonus:,.2f}  (ating: {atingimento*100:.0f}%)")
    print(f"  Adesao: R${ades_total:,.2f}  -> {ades_pct*100:.1f}%  = R${comis_ades:,.2f}")
    print(f"  TOTAL: R${total:,.2f}  (MRR: R${comis_mrr:,.2f} + Ades: R${comis_ades:,.2f})")

    return round(comis_mrr, 2), round(comis_ades, 2), round(total, 2)


# ── AGRUPAR POR MÊS ──────────────────────────────────────────────────────────
by_month = defaultdict(list)
for v in VENDAS_RAW:
    by_month[v[0]].append(v)

# Calcular churn rolling 3 meses
meses = sorted(by_month.keys())
churn_by_month = {}
for mes in meses:
    churn_by_month[mes] = sum(
        float(re.search(r'churn\s+(\d+)', v[6]).group(1))
        for v in by_month[mes] if v[3] == "Cancelado" and re.search(r'churn\s+(\d+)', v[6])
    )

resultados = []
for i, mes in enumerate(meses):
    # Rolling 3 months churn
    prev_months = meses[max(0, i-2):i+1]
    churn_3m = sum(churn_by_month[m] for m in prev_months)

    comis_mrr, comis_ades, total = calcular_mes(mes, by_month[mes], churn_3m)
    resultados.append((mes, comis_mrr, comis_ades, total))

print("\n\n" + "="*60)
print("RESUMO COMISSÕES")
print("="*60)
total_geral = 0
for mes, cmrr, cades, total in resultados:
    print(f"  {mes}  MRR: R${cmrr:>8,.2f}  Ades: R${cades:>7,.2f}  TOTAL: R${total:>8,.2f}")
    total_geral += total
print(f"{'--'*30}")
print(f"  TOTAL GERAL: R${total_geral:,.2f}")


# ── INSERIR VIA API ──────────────────────────────────────────────────────────
def inserir_comissoes():
    print("\n\nInserindo no Railway...")
    for mes, cmrr, cades, total in resultados:
        payload = {
            "mes": mes,
            "comis_mrr": float(cmrr),
            "comis_ades": float(cades),
            "total_pago": float(total),
            "obs": "Migrado automaticamente - calculado via regras de comissão"
        }
        r = requests.post(f"{API_URL}/comissoes/", json=payload, headers=HEADERS)
        if r.status_code in (200, 201):
            print(f"  OK {mes} inserido")
        elif r.status_code == 409:
            print(f"  -- {mes} ja existe, tentando atualizar...")
            r2 = requests.put(f"{API_URL}/comissoes/{mes}", json=payload, headers=HEADERS)
            print(f"    -> {r2.status_code}")
        else:
            print(f"  ERRO {mes} {r.status_code}: {r.text[:100]}")

inserir_comissoes()
