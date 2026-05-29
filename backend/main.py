from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, extract, func

from database import engine, Base, get_db
from routers import vendas, comissoes, configs, trimestral
from auth import verify_token
from models import Venda
from sqlalchemy.orm import Session

# Cria as tabelas no banco ao iniciar
Base.metadata.create_all(bind=engine)

# Migrações incrementais — seguras para rodar múltiplas vezes
def run_migrations():
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE vendas ADD COLUMN IF NOT EXISTS origem VARCHAR(50)"
        ))
        conn.execute(text(
            "ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_crm DATE"
        ))
        conn.execute(text(
            "ALTER TABLE vendas ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10) DEFAULT 'pending'"
        ))
        conn.execute(text(
            "ALTER TABLE vendas ADD COLUMN IF NOT EXISTS zendesk VARCHAR(3)"
        ))
        # Migração de dados: vendas anteriores a maio/2025 marcadas como pagas
        conn.execute(text(
            "UPDATE vendas SET payment_status = 'paid' "
            "WHERE (payment_status IS NULL OR payment_status = 'pending') "
            "AND data < '2025-05-01'"
        ))
        conn.commit()

run_migrations()

app = FastAPI(
    title="Bruning Dashboard API",
    description="API de vendas pessoais — Alan",
    version="1.0.0",
)

# CORS — domínio do Vercel e localhost dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://frontend-alansouzaaa-uis-projects.vercel.app",
        "https://frontend-neon-sigma-71.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Todos os routers exigem token
app.include_router(vendas.router,    dependencies=[Depends(verify_token)])
app.include_router(comissoes.router, dependencies=[Depends(verify_token)])
app.include_router(configs.router,   dependencies=[Depends(verify_token)])
app.include_router(trimestral.router, dependencies=[Depends(verify_token)])


@app.get("/")
def root():
    return {"status": "ok", "app": "Bruning Dashboard API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# Diagnóstico temporário — sem auth, para inspeção dos dados
@app.get("/diag", dependencies=[Depends(verify_token)])
def diag(db: Session = Depends(get_db)):
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
