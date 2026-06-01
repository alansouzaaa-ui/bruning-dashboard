from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import Script
from schemas import ScriptCreate, ScriptOut

router = APIRouter(prefix="/scripts", tags=["scripts"])

# ── LISTAR ────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[ScriptOut])
def listar_scripts(
    categoria: Optional[str] = Query(None),
    canal:     Optional[str] = Query(None),
    perfil:    Optional[str] = Query(None),
    favorito:  Optional[bool] = Query(None),
    busca:     Optional[str]  = Query(None),
    db:        Session = Depends(get_db),
):
    q = db.query(Script)
    if categoria:
        q = q.filter(Script.categoria == categoria)
    if canal:
        q = q.filter(Script.canal == canal)
    if perfil:
        q = q.filter(Script.perfil == perfil)
    if favorito is not None:
        q = q.filter(Script.favorito == favorito)
    if busca:
        like = f"%{busca}%"
        q = q.filter(Script.titulo.ilike(like) | Script.conteudo.ilike(like))
    return q.order_by(Script.categoria, Script.dia_toque.nullsfirst(), Script.id).all()


# ── CRIAR ─────────────────────────────────────────────────────────────────────
@router.post("/", response_model=ScriptOut, status_code=201)
def criar_script(body: ScriptCreate, db: Session = Depends(get_db)):
    obj = Script(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── EDITAR ────────────────────────────────────────────────────────────────────
@router.put("/{script_id}", response_model=ScriptOut)
def editar_script(script_id: int, body: ScriptCreate, db: Session = Depends(get_db)):
    obj = db.query(Script).filter(Script.id == script_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Script não encontrado")
    for campo, valor in body.model_dump().items():
        setattr(obj, campo, valor)
    db.commit()
    db.refresh(obj)
    return obj


# ── EXCLUIR ───────────────────────────────────────────────────────────────────
@router.delete("/{script_id}", status_code=204)
def excluir_script(script_id: int, db: Session = Depends(get_db)):
    obj = db.query(Script).filter(Script.id == script_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Script não encontrado")
    db.delete(obj)
    db.commit()


# ── TOGGLE FAVORITO ───────────────────────────────────────────────────────────
@router.patch("/{script_id}/favorito", response_model=ScriptOut)
def toggle_favorito(script_id: int, db: Session = Depends(get_db)):
    obj = db.query(Script).filter(Script.id == script_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Script não encontrado")
    obj.favorito = not obj.favorito
    db.commit()
    db.refresh(obj)
    return obj


# ── SEED — scripts iniciais da cadência de reativação ────────────────────────
_SEED = [
    {
        "titulo": "Reativação Dia 1 — Perfil A (demo feita, proposta enviada, sumiu)",
        "categoria": "Reativação", "canal": "WhatsApp texto", "perfil": "A", "dia_toque": 1,
        "conteudo": (
            "Oi [nome]! Alan aqui da Bruning. Sei que a gente conversou sobre o Eixo WEB mês passado "
            "e queria te dar uma novidade: ajustamos nossos planos e agora o Acelera cobre tudo que você "
            "precisa por R$ 369,90/mês. Nossa agenda de implantação está quase fechada — temos 2 vagas "
            "sobrando. Se você fechar essa semana, garanto que sua oficina começa o próximo mês 100% "
            "organizada. Vale retomar a conversa?"
        ),
    },
    {
        "titulo": "Reativação Dia 1 — Perfil B (sondagem feita, não aceitou demo)",
        "categoria": "Reativação", "canal": "WhatsApp texto", "perfil": "B", "dia_toque": 1,
        "conteudo": (
            "Oi [nome]! Passando pra te contar uma novidade: revisamos nossos planos e agora o Acelera "
            "— que inclui OS, estoque e controle de caixa — está em R$ 369,90/mês. Me lembrei de você "
            "quando vi porque é exatamente o que faria diferença na sua oficina. Me dá 20 minutinhos "
            "essa semana pra te mostrar ao vivo? Você prefere ver terça ou quinta?"
        ),
    },
    {
        "titulo": "Reativação Dia 1 — Perfil C (nunca respondeu)",
        "categoria": "Reativação", "canal": "WhatsApp texto", "perfil": "C", "dia_toque": 1,
        "conteudo": (
            "Oi [nome]! Alan da Bruning Sistemas. Tentei contato mês passado sobre o Eixo WEB — "
            "sistema de gestão exclusivo pra oficinas mecânicas. Tenho uma novidade: acabamos de "
            "revisar nossos preços e ficou bem mais acessível. Uma pergunta rápida: você ainda controla "
            "as OS no caderno ou já tem algum sistema? Me conta como é hoje aí."
        ),
    },
    {
        "titulo": "Follow-up Dia 2 — Ligação (Perfis B e C)",
        "categoria": "Follow-up", "canal": "Ligação", "perfil": "B", "dia_toque": 2,
        "conteudo": (
            "Oi [nome], aqui é o Alan da Bruning Sistemas. Mandei mensagem ontem pelo WhatsApp — você "
            "chegou a ver? [Pausa] Estou ligando porque revisamos nossos planos e o Eixo WEB ficou bem "
            "mais acessível. Temos uma agenda de implantação apertada e queria entender se faz sentido "
            "conversar ainda essa semana. Você teria 20 minutinhos pra eu te mostrar o sistema ao vivo?"
        ),
    },
    {
        "titulo": "Follow-up Dia 5 — Nova funcionalidade (pós-proposta sem resposta)",
        "categoria": "Follow-up", "canal": "WhatsApp texto", "perfil": "A", "dia_toque": 5,
        "conteudo": (
            "Oi [nome]! Lembrei de uma funcionalidade que não mostrei na demo: o relatório de desempenho "
            "por mecânico. Você consegue ver quem está sendo mais produtivo na sua oficina e identificar "
            "gargalos. Faz diferença pra você?"
        ),
    },
    {
        "titulo": "Urgência Dia 7 — Vagas de implantação (Perfis A e B com proposta)",
        "categoria": "Fechamento", "canal": "WhatsApp áudio", "perfil": "A", "dia_toque": 7,
        "conteudo": (
            "[Nome], Alan da Bruning aqui. Mandei áudio porque queria falar de forma mais direta. "
            "Nossa agenda de implantação está quase cheia — temos 2 vagas sobrando essa semana. "
            "Se você fechar até sexta com o plano Acelera — R$ 369,90/mês — garanto que sua oficina "
            "começa o próximo mês 100% rodando. Se não der dessa vez, a implantação vai pro mês "
            "seguinte e você perde mais um mês sem controle. Me fala como você está, pode ser aqui "
            "no WA mesmo."
        ),
    },
    {
        "titulo": "Canal Alternativo Dia 10 — Instagram DM",
        "categoria": "Reativação", "canal": "Instagram DM", "perfil": "C", "dia_toque": 10,
        "conteudo": (
            "Oi [nome]! Alan da Bruning por aqui. Vi que você se interessou pelo Eixo WEB mês passado. "
            "Uma pergunta rápida: como você está controlando as OS hoje?"
        ),
    },
    {
        "titulo": "Breakup Message Dia 14 — Encerramento definitivo",
        "categoria": "Reativação", "canal": "WhatsApp texto", "perfil": "D", "dia_toque": 14,
        "conteudo": (
            "Oi [nome], vou ser direto: faz um tempo que não consigo te encontrar e tudo bem — "
            "entendo que às vezes o momento não é o certo. Vou deixar nosso contato pausado por aqui "
            "pra não te incomodar. Se em algum momento quiser organizar a oficina, me chama que retomo "
            "de onde paramos. Abraço!"
        ),
    },
    {
        "titulo": "Transição Sondagem → Demo (momento crítico do gargalo)",
        "categoria": "Primeiro Contato", "canal": "WhatsApp texto", "perfil": "Geral", "dia_toque": None,
        "conteudo": (
            "O que você me descreveu é exatamente o que a gente resolve. Mas eu não quero te mandar "
            "um PDF de preço agora — isso não vai fazer sentido sem você ver o sistema funcionando. "
            "Me dá 20 minutos essa semana pra te mostrar ao vivo como fica a sua oficina organizada. "
            "Você prefere ver terça de manhã ou quinta à tarde?"
        ),
    },
    {
        "titulo": "Objeção de Preço — Analogia do especialista (para áudio)",
        "categoria": "Objeção", "canal": "WhatsApp áudio", "perfil": "Geral", "dia_toque": None,
        "conteudo": (
            "Entendo totalmente. Mas pensa comigo: quando o motor do carro precisa de serviço, você "
            "leva num mecânico geral ou num especialista de motor? No especialista — mesmo pagando mais. "
            "O Eixo WEB foi feito exclusivamente pra oficina mecânica. São R$ 369,90 por mês — menos de "
            "R$ 13 por dia — pra ter OS, estoque, controle de caixa e notas fiscais tudo num lugar só. "
            "Você não tá pagando a mais, tá pagando por algo feito exatamente pro seu negócio."
        ),
    },
    {
        "titulo": 'Objeção "Deixa eu pensar" — Abrir a conversa',
        "categoria": "Objeção", "canal": "WhatsApp texto", "perfil": "Geral", "dia_toque": None,
        "conteudo": (
            "Claro, tudo bem! Mas me deixa te fazer uma pergunta: o que especificamente você precisa "
            "pensar? Se for preço, posso te mostrar como calcular o retorno. Se for sobre o sistema em "
            "si, posso tirar qualquer dúvida agora. Me fala o que trava e eu te ajudo a pensar junto."
        ),
    },
    {
        "titulo": 'Objeção "Já tenho um sistema" — Pergunta de qualificação',
        "categoria": "Objeção", "canal": "WhatsApp texto", "perfil": "Geral", "dia_toque": None,
        "conteudo": (
            "Faz sentido! Pode me contar qual sistema você usa hoje? Pergunto porque conheço bem o "
            "mercado e quero entender se o Eixo WEB realmente faria diferença pra você. Se o que você "
            "tem já resolve tudo, eu mesmo te digo que não faz sentido trocar."
        ),
    },
    {
        "titulo": "Pergunta de Implicação SPIN — Criar urgência real",
        "categoria": "Primeiro Contato", "canal": "WhatsApp texto", "perfil": "Geral", "dia_toque": None,
        "conteudo": (
            "Deixa eu te fazer uma pergunta direta: com tudo sem controle do jeito que você me descreveu, "
            "você consegue saber hoje — com certeza — quanto sua oficina lucrou esse mês? Ou tem medo de "
            "olhar os números? Porque a maioria dos donos de oficina que eu conheço perde mais de "
            "R$ 1.500 por mês em peças não cobradas e serviços mal precificados. Isso faz sentido pra você?"
        ),
    },
    {
        "titulo": "Urgência de Vaga — Fechamento no fim do mês",
        "categoria": "Fechamento", "canal": "WhatsApp texto", "perfil": "Geral", "dia_toque": None,
        "conteudo": (
            "[Nome], só deixar registrado aqui: nossa agenda de implantação está quase fechada — temos "
            "só 2 vagas sobrando pra esse mês. Se você fechar até sexta, eu garanto que a sua oficina "
            "já começa o mês seguinte 100% organizada. Posso te reservar uma vaga?"
        ),
    },
]


@router.post("/seed")
def seed_scripts(db: Session = Depends(get_db)):
    count = db.query(Script).count()
    if count > 0:
        return {"message": f"Já existem {count} scripts. Seed ignorado.", "inserted": 0}
    for data in _SEED:
        db.add(Script(**{**data, "tags": None, "favorito": False}))
    db.commit()
    return {"message": f"{len(_SEED)} scripts inseridos com sucesso.", "inserted": len(_SEED)}
