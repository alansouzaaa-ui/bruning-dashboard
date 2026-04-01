from sqlalchemy import Column, Integer, BigInteger, String, Numeric, Date, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class Venda(Base):
    __tablename__ = "vendas"

    id         = Column(BigInteger, primary_key=True, index=True)
    data       = Column(Date, nullable=False)
    cod        = Column(String(20), nullable=True)
    cliente    = Column(String(200), nullable=False)
    cnpj       = Column(String(20), nullable=True)
    segmento   = Column(String(100), nullable=True)
    plano      = Column(String(50), nullable=True)
    contrato   = Column(String(10), nullable=True)   # 'Mensal' | 'Anual'
    mrr        = Column(Numeric(10, 2), default=0)
    adesao     = Column(Numeric(10, 2), default=0)
    churn_mrr  = Column(Numeric(10, 2), default=0)
    status     = Column(String(20), nullable=True)   # 'Ativo' | 'Trial' | 'Cancelado'
    tipo       = Column(String(30), nullable=True)   # 'CLIENTE NOVO' | 'CHURN' | etc
    obs        = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ComissaoPaga(Base):
    __tablename__ = "comissoes_pagas"

    id         = Column(Integer, primary_key=True, index=True)
    mes        = Column(String(7), nullable=False)   # '2026-03'
    comis_mrr  = Column(Numeric(10, 2), default=0)
    comis_ades = Column(Numeric(10, 2), default=0)
    total_pago = Column(Numeric(10, 2), default=0)
    obs        = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
