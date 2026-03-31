from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import vendas, comissoes

# Cria as tabelas no banco ao iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Bruning Dashboard API",
    description="API de vendas pessoais — Alan",
    version="1.0.0",
)

# CORS — permite o React (localhost:5173) e o domínio do Vercel chamar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",      # substitua pelo seu domínio real depois
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vendas.router)
app.include_router(comissoes.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "Bruning Dashboard API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
