from sqlalchemy import Column, Integer, BigInteger, String, Numeric, Date, Text, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class AppConfig(Base):
    __tablename__ = "configs"

    chave = Column(String(50), primary_key=True)
    valor = Column(Text, nullable=False)


class MetaTrimestral(Base):
    __tablename__ = "metas_trimestrais"

    id         = Column(Integer, primary_key=True, index=True)
    trimestre  = Column(String(7), nullable=False, unique=True)  # '2026-Q1'
    meta_mrr   = Column(Numeric(10, 2), default=0)
    meta_ades  = Column(Numeric(10, 2), default=0)


class MetaMensal(Base):
    __tablename__ = "metas_mensais"

    mes      = Column(String(7), primary_key=True)  # '2024-11'
    meta_mrr = Column(Numeric(10, 2), default=0)


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
    origem     = Column(String(50), nullable=True)   # 'Indicação' | 'Prospecção' | 'LinkedIn' | etc
    obs            = Column(Text, nullable=True)
    data_crm       = Column(Date, nullable=True)         # Data de entrada do lead no CRM
    payment_status = Column(String(10), default='pending')  # 'paid' | 'pending'
    zendesk        = Column(String(3), nullable=True)    # 'Sim' | 'Não'
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class ComissaoPaga(Base):
    __tablename__ = "comissoes_pagas"

    id         = Column(Integer, primary_key=True, index=True)
    mes        = Column(String(7), nullable=False)   # '2026-03'
    comis_mrr  = Column(Numeric(10, 2), default=0)
    comis_ades = Column(Numeric(10, 2), default=0)
    total_pago = Column(Numeric(10, 2), default=0)
    obs        = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Script(Base):
    __tablename__ = "scripts"

    id        = Column(Integer, primary_key=True, index=True)
    titulo    = Column(String(200), nullable=False)
    categoria = Column(String(50),  nullable=False)
    canal     = Column(String(50),  nullable=True)
    perfil    = Column(String(10),  nullable=True)
    dia_toque = Column(Integer,     nullable=True)
    conteudo  = Column(Text,        nullable=False)
    tags      = Column(String(200), nullable=True)
    favorito  = Column(Boolean,     default=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())


