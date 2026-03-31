from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# ── VENDAS ──────────────────────────────────────────────

class VendaBase(BaseModel):
    data:      date
    cod:       Optional[str] = None
    cliente:   str
    cnpj:      Optional[str] = None
    segmento:  Optional[str] = None
    plano:     Optional[str] = None
    contrato:  Optional[str] = None
    mrr:       Optional[Decimal] = Decimal("0")
    adesao:    Optional[Decimal] = Decimal("0")
    churn_mrr: Optional[Decimal] = Decimal("0")
    status:    Optional[str] = None
    tipo:      Optional[str] = None
    obs:       Optional[str] = None


class VendaCreate(VendaBase):
    pass


class VendaUpdate(VendaBase):
    pass


class VendaOut(VendaBase):
    id:         int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── COMISSÕES ───────────────────────────────────────────

class ComissaoPagaBase(BaseModel):
    mes:        str            # '2026-03'
    comis_mrr:  Optional[Decimal] = Decimal("0")
    comis_ades: Optional[Decimal] = Decimal("0")
    total_pago: Optional[Decimal] = Decimal("0")
    obs:        Optional[str] = None


class ComissaoPagaCreate(ComissaoPagaBase):
    pass


class ComissaoPagaOut(ComissaoPagaBase):
    id:         int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── KPIs (resposta calculada) ────────────────────────────

class KPIOut(BaseModel):
    total_mrr:    Decimal
    total_adesao: Decimal
    ativos:       int
    anuais:       int
    mensais:      int
    ticket_medio: Decimal
    churns:       int
    churn_mrr:    Decimal


class ComparativoMes(BaseModel):
    mes:   str
    label: str
    mrr:   Decimal
    adesao: Decimal
    vendas: int
