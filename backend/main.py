from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, Base
from routers import vendas, comissoes, configs, trimestral, crm
from auth import verify_token

# Cria as tabelas no banco ao iniciar
Base.metadata.create_all(bind=engine)

# Migrações incrementais — seguras para rodar múltiplas vezes
def run_migrations():
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE vendas ADD COLUMN IF NOT EXISTS origem VARCHAR(50)"
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
app.include_router(vendas.router,      dependencies=[Depends(verify_token)])
app.include_router(comissoes.router,   dependencies=[Depends(verify_token)])
app.include_router(configs.router,     dependencies=[Depends(verify_token)])
app.include_router(trimestral.router,  dependencies=[Depends(verify_token)])
app.include_router(crm.router,         dependencies=[Depends(verify_token)])


@app.get("/")
def root():
    return {"status": "ok", "app": "Bruning Dashboard API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
