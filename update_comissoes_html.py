import requests

BASE = "https://bruning-dashboard-production.up.railway.app"
HEADERS = {"Authorization": "Bearer bruning-dashboard-2026", "Content-Type": "application/json"}

# Data extracted from the HTML summary table
# mes: (comis_mrr, comis_ades, total_pago)
COMISSOES = {
    "2024-11": (559.50,  165.00,  724.50),
    "2024-12": (231.75,   44.00,  275.75),
    "2025-01": (3351.25, 693.90, 4045.15),
    "2025-02": (1727.96, 464.60, 2192.56),
    "2025-03": (1488.48, 137.70, 1626.18),
    "2025-04": (2111.11, 414.75, 2525.86),
    "2025-05": (1877.50,  88.20, 1965.70),
    "2025-06": (1612.17, 167.40, 1779.57),
    "2025-07": (2599.26, 345.99, 2945.25),
    "2025-08": ( 890.30, 317.70, 1208.00),
    "2025-09": ( 864.92, 126.00,  990.92),
    "2025-10": ( 484.01, 121.50,  605.51),
    "2025-11": ( 462.50,  90.00,  552.50),
    "2026-01": (2140.96, 141.30, 2282.26),
    "2026-02": (1167.90, 433.20, 1601.10),
    # 2026-03 kept as official: 911.20 + 162.00 = 1073.20
}

print("Buscando registros atuais...")
r = requests.get(f"{BASE}/comissoes/", headers=HEADERS)
if r.status_code != 200:
    print(f"ERRO ao buscar: {r.status_code} {r.text}")
    exit(1)

existing = {row["mes"]: row["id"] for row in r.json()}
print(f"Registros no banco: {list(existing.keys())}")
print()

ok = 0
erros = 0

for mes, (mrr, ades, total) in COMISSOES.items():
    # Delete existing if present
    if mes in existing:
        rid = existing[mes]
        d = requests.delete(f"{BASE}/comissoes/{rid}", headers=HEADERS)
        if d.status_code in (200, 204):
            print(f"[DEL] {mes} id={rid} -> OK")
        else:
            print(f"[DEL] {mes} ERRO {d.status_code}: {d.text}")
            erros += 1
            continue

    # Insert new
    payload = {
        "mes": mes,
        "comis_mrr": mrr,
        "comis_ades": ades,
        "total_pago": total,
        "obs": "importado via HTML export"
    }
    p = requests.post(f"{BASE}/comissoes/", json=payload, headers=HEADERS)
    if p.status_code in (200, 201):
        new_id = p.json().get("id", "?")
        print(f"[ADD] {mes} -> id={new_id}  MRR={mrr}  Ades={ades}  Total={total}  OK")
        ok += 1
    else:
        print(f"[ADD] {mes} ERRO {p.status_code}: {p.text}")
        erros += 1

print()
print(f"Concluido: {ok} inseridos, {erros} erros")
print("Mar/26 (2026-03) mantido com valores oficiais.")
