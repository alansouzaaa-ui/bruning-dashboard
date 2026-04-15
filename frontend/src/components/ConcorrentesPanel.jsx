import { useState } from 'react'
import styles from './ConcorrentesPanel.module.css'

/* ─────────────────────────────────────────────────
   DADOS DO PDF "Análise de Concorrentes – Bruning Sistemas"
   Comparativo de soluções SaaS para gestão de oficinas
   ───────────────────────────────────────────────── */

const GRUPOS = {
  core:       { label: 'Concorrência Direta', cor: '#ccf46a' },
  simples:    { label: 'Simplicidade + Mobile', cor: '#60a5fa' },
  baixo_custo:{ label: 'Baixo Custo / Entrada', cor: '#f59e0b' },
  erp:        { label: 'ERP Horizontal', cor: '#a78bfa' },
  automotivo: { label: 'Automotivo Específico', cor: '#fb7185' },
}

const CONCORRENTES = [
  {
    id: 1,
    nome: 'Ultracar',
    grupo: 'core',
    modelo: 'SaaS (web)',
    posicionamento: 'Oficinas em crescimento — foco exclusivo em gestão de oficinas',
    precoTexto: 'R$180 – R$472/mês',
    fortes: [
      'Foco exclusivo em oficinas',
      'CRM forte',
      'Fiscal completo',
      'Homologada por grandes redes',
      'Teste grátis disponível',
      'Reputação sólida no mercado',
    ],
    fracos: [
      'Ticket de entrada mais alto',
      'App limitado ao pós-venda',
      'Integração WhatsApp pouco avançada',
      'Não possui varejo integrado',
    ],
    bruningGanha: ['Apps mais completos (Eixo + Job + FV)', 'Integração varejo + oficina', 'Módulo fiscal mais profundo'],
  },
  {
    id: 2,
    nome: 'Oficina Integrada',
    grupo: 'core',
    modelo: 'SaaS por usuário',
    posicionamento: 'Custo-benefício para oficinas pequenas',
    precoTexto: 'R$119 – R$345/mês',
    fortes: [
      'Muito barato',
      'Fácil de usar',
      'Emissão NF ilimitada',
      'Simplicidade de uso',
      'Site de OS para cliente',
    ],
    fracos: [
      'UX antiga e desatualizada',
      'Não tem app mobile',
      'CRM fraco',
      'Não atende empresas grandes',
    ],
    bruningGanha: ['Ganha em tudo (exceto preço)', 'App mobile completo', 'CRM e pós-venda', 'UX moderna'],
  },
  {
    id: 3,
    nome: 'Griffo Oficinas',
    grupo: 'simples',
    modelo: 'SaaS (web/móvel responsivo)',
    posicionamento: 'Simplicidade e produtividade para o mecânico',
    precoTexto: 'R$187 – R$427/mês',
    fortes: [
      'Simples e rápido de usar',
      'Assistente LISA (WhatsApp)',
      'Forte presença digital e SEO',
      'Foco na experiência do mecânico',
      'OS muito ágil',
      'Trial imediato e autônomo (5 dias)',
    ],
    fracos: [
      'Não possui app nativo',
      'Fiscal limitado (sem módulo completo)',
      'Não atende oficinas grandes',
      'Foco excessivo no fundador (risco de marca pessoal)',
    ],
    bruningGanha: ['Robustez e operação', 'Fiscal completo (NF-e/NFS-e/NFC-e)', 'Atende oficinas médias e grandes', 'Módulo varejo (Job)'],
  },
  {
    id: 4,
    nome: 'Mecanie',
    grupo: 'simples',
    modelo: 'SaaS (web + app)',
    posicionamento: 'Oficinas diversas e serviços automotivos',
    precoTexto: 'R$129 – R$499/mês',
    fortes: [
      'Abrange muitas verticais automotivas',
      'Bom equilíbrio preço/recursos',
      'Módulos completos',
    ],
    fracos: [
      'UX mediana',
      'Tabela de preços confusa',
      'Marca ainda pouco forte no Brasil',
      'Presença digital agressiva que pressiona SEO',
    ],
    bruningGanha: ['+12 anos de credibilidade', 'Profundidade fiscal superior', 'Integração varejo + oficina única no mercado'],
  },
  {
    id: 5,
    nome: 'MotorSW',
    grupo: 'simples',
    modelo: 'SaaS (web + app MotorOK)',
    posicionamento: 'Oficinas pequenas/médias — foco em agilidade',
    precoTexto: 'R$127 – R$237/mês',
    fortes: [
      'OS em 30 segundos',
      'App MotorOK forte',
      'Módulo de remanufatura exclusivo',
      'Preço baixo',
      'Muito simples de operar',
    ],
    fracos: [
      'Marca menos conhecida',
      'Pouco marketing e visibilidade',
      'Sem Google Meu Negócio',
      'Plano básico muito limitado',
    ],
    bruningGanha: ['Módulo fiscal completo', 'Integração varejo (Job)', 'Escalabilidade para grandes operações'],
  },
  {
    id: 6,
    nome: 'GestãoClick',
    grupo: 'erp',
    modelo: 'ERP SaaS generalista',
    posicionamento: 'ERP geral para comércio e serviços — inclusive oficina',
    precoTexto: 'R$168 – R$522/mês',
    fortes: [
      'Fiscal avançado',
      'Muitas integrações disponíveis',
      'Multiempresa',
      'Dashboard forte',
      'Reputação excelente no Reclame Aqui',
    ],
    fracos: [
      'Não é especializado em oficina',
      'App mobile limitado',
      'Site pesado e complexo',
      'Sem visão de pátio, checklist automotivo',
    ],
    bruningGanha: ['Operação automotiva especializada', 'Módulo de pátio e checklist', 'Histórico de veículo', 'Prova social no setor automotivo'],
  },
  {
    id: 7,
    nome: 'Tecinco (MekanicWeb / Go)',
    grupo: 'core',
    modelo: 'SaaS automotivo',
    posicionamento: 'Sistema profissional, multi-segmento, 31 anos de mercado',
    precoTexto: 'Sob consulta',
    fortes: [
      'Ecossistema enorme de produtos',
      'App MekanicGo',
      'Módulos robustos e integrados',
      'Muito forte no setor automotivo',
      '31 anos de experiência',
    ],
    fracos: [
      'Preços não divulgados',
      'Complexo para iniciantes',
      'Muitas soluções podem confundir',
      'UX mais antiga',
    ],
    bruningGanha: ['Simplicidade e UX moderna', 'Onboarding mais ágil', 'Transparência no atendimento'],
  },
  {
    id: 8,
    nome: 'IS2 Automotive',
    grupo: 'baixo_custo',
    modelo: 'Licença + mensalidades',
    posicionamento: 'Software econômico e simples para múltiplos segmentos',
    precoTexto: 'A partir de R$112/mês',
    fortes: [
      'Muito barato',
      'Simples de usar',
      'Atende vários segmentos',
      'Suporte acessível',
    ],
    fracos: [
      'UX ultrapassada',
      'Pouco marketing',
      'Sem Google Meu Negócio',
      'Pouca prova social',
      'Site antigo',
    ],
    bruningGanha: ['UX moderna', 'Aplicativos mobile', 'Suporte consultivo', 'Escabilidade e robustez'],
  },
  {
    id: 9,
    nome: 'Syscar',
    grupo: 'core',
    modelo: 'SaaS (web)',
    posicionamento: 'Oficinas pequenas a grandes — solução modular escalonada',
    precoTexto: 'R$149 – R$799/mês',
    fortes: [
      'Muito completo e modular',
      'NF-e/NFS-e/NFC-e em todos os planos',
      'E-commerce integrado',
      'Módulos avançados (BI, assinatura eletrônica)',
      'Trial de 7 dias',
    ],
    fracos: [
      'Planos Ouro/Diamante muito caros',
      'Muitos módulos extras confusos',
      'Pode intimidar iniciantes',
      'Pede CNPJ cedo no fluxo',
    ],
    bruningGanha: ['Atendimento consultivo sem fricção', 'Integração varejo + oficina', '3 apps nativos próprios', 'Onboarding mais simples'],
  },
  {
    id: 10,
    nome: 'Onmotor',
    grupo: 'automotivo',
    modelo: 'SaaS (web + apps)',
    posicionamento: 'Sistema moderno, simples e completo — expandindo para autopeças',
    precoTexto: 'R$168 – R$479/mês',
    fortes: [
      'App do gestor + app do cliente',
      'Multiunidades',
      'Forte automação',
      'Site moderno e bem posicionado no SEO',
      'Excelente reputação no Google',
      'Trial de 5 dias',
    ],
    fracos: [
      'Preços não transparentes no atendimento',
      'Pode ser complexo para micro-oficinas',
      'Não verificada no Reclame Aqui',
      'Atendimento com demora no retorno',
    ],
    bruningGanha: ['Profundidade fiscal completa', 'Integração varejo + oficina', '+12 anos de credibilidade', 'Módulo de pátio mais robusto'],
  },
  {
    id: 11,
    nome: 'Hiper',
    grupo: 'erp',
    modelo: 'ERP varejo',
    posicionamento: 'ERP para pequeno varejo — NÃO atende oficina',
    precoTexto: 'Sob consulta',
    fortes: [
      'Integração Stone (pagamentos)',
      'Fiscal forte',
      'PDV offline',
      'Catálogo digital',
      'Multilojas',
    ],
    fracos: [
      'Não atende oficina mecânica',
      'Sem Google Meu Negócio',
      'Preços não expostos',
      'Muitas reclamações técnicas',
    ],
    bruningGanha: ['Atende oficina + varejo simultaneamente', 'Especialização automotiva', 'Suporte específico do setor'],
  },
  {
    id: 12,
    nome: 'Autogestor',
    grupo: 'automotivo',
    modelo: 'SaaS automotivo',
    posicionamento: 'CRM + integrador para revendas de veículos',
    precoTexto: 'Sob consulta',
    fortes: [
      'Melhor integrador de portais do mercado',
      'CRM forte para revendas',
      'IQE (Índice de Qualidade) exclusivo',
      'Sites profissionais para revendas',
    ],
    fracos: [
      'Não possui app',
      'Não possui Google Meu Negócio',
      'Não atende oficinas mecânicas',
      'Preços opacos',
    ],
    bruningGanha: ['Atende oficina completa', 'Fiscal integrado', 'App mobile para operação', 'Gestão de estoque de peças'],
  },
  {
    id: 13,
    nome: 'Revenda Mais',
    grupo: 'automotivo',
    modelo: 'SaaS automotivo',
    posicionamento: 'CRM e gestão de anúncios para lojas de veículos',
    precoTexto: 'R$450/mês + módulos',
    fortes: [
      'CRM avançado para lojas',
      'Avaliação Pro de veículos',
      'Vistoria completa',
      'Site PWA',
      'Reputação 5.0',
      'Parceiro Webmotors',
    ],
    fracos: [
      'Sem app nativo',
      'Preços não transparentes nos módulos',
      'Integrador menor que Autogestor',
      'Não atende oficina',
    ],
    bruningGanha: ['Gestão completa da oficina', 'Fiscal e financeiro integrados', 'Operação do pátio em tempo real'],
  },
]

const SWOT = {
  forcas: [
    'Plataforma 360° única: gestão de oficina + varejo com profundidade real nos dois segmentos',
    'Três apps oficiais (Eixo, Job, Força de Vendas BETA) + apps operacionais internos',
    'Módulo fiscal extremamente completo (NF-e, NFC-e, NFS-e, integrações contábeis)',
    'Prova social forte: depoimentos, vídeos reais de clientes, reputação Google 5,0',
    'Atendimento consultivo e humanizado — diferencial percebido pelo mercado',
    'Solução escalável: micro a grandes empreendimentos',
    'Visão 360° operacional: pátio, checklist, fotos, assinatura digital, financeiro e estoque',
    'Credibilidade institucional de +12 anos no setor automotivo',
    'UX moderna em evolução (novo sistema Web)',
  ],
  fraquezas: [
    'Ausência de tabela pública de preços (gera atrito na pré-venda)',
    'Falta de um plano "Start" para competir no segmento low-cost',
    'Percepção de implantação complexa em micro-oficinas (mesmo que não seja realidade)',
    'Presença digital e SEO menores que concorrentes agressivos (Onmotor, GestãoClick, Mecanie)',
    'Menor volume de conteúdo em YouTube comparado a Ultracar e Griffo',
    'Pouca comunicação sobre integração com WhatsApp avançada (embora exista)',
    'Site não deixa clara a diferença entre Eixo/Job/Web — confunde novos leads',
    'Concorrentes com teste grátis, enquanto Bruning usa abordagem consultiva',
  ],
  oportunidades: [
    'Mercado automotivo em digitalização acelerada: 70% das oficinas ainda sem sistema',
    'Nenhum concorrente integra varejo + oficina com profundidade real → vantagem exclusiva',
    'Demanda crescente por apps de operação: checklist, pátio, fotos, assinatura digital',
    'Expansão nacional: Nordeste, Centro-Oeste e interior de SP com alta demanda e baixa concorrência',
    'Lançar plano Start para capturar micro-oficinas (até 2 funcionários)',
    'Mercado pedindo automação via WhatsApp + IA (revisões, lembretes, pendências inteligentes)',
    'Diversificação: CRM avançado, orçamentadores, marketplace de peças, BI premium',
    'Parcerias com fabricantes, distribuidores e ecossistemas automotivos',
  ],
  ameacas: [
    'Concorrentes de baixo custo crescendo rápido (Griffo, Oficina App, MotorSW)',
    'Players agressivos em marketing e SEO (Onmotor, GestãoClick, Mecanie)',
    'Pressão do mercado por preços transparentes',
    'Concorrência lançando apps mais simples e rápidos (MotorSW e Griffo se destacam)',
    'Risco de canibalização por soluções horizontais baratas (GestãoClick)',
    'Percepção equivocada de complexidade por empresas muito pequenas',
    'Competidores internacionais com forte UX (MechanicDesk, Shopmonkey)',
  ],
}

const ARQUETIPOS = [
  {
    id: 'gestao_completa',
    icon: '⚙️',
    titulo: 'Gestão Completa + Robusta',
    descricao: 'Controle total da operação — do pátio ao financeiro. Atende oficinas médias e grandes com fiscal, estoque e apps. Este é o mercado core da Bruning.',
    exemplo: 'Bruning (Eixo/Job), Ultracar, Tecinco, Syscar',
    bruning: true,
    cor: '#ccf46a',
  },
  {
    id: 'baixo_custo',
    icon: '💰',
    titulo: 'Baixo Custo / Entrada',
    descricao: 'O mínimo necessário pelo menor preço. Foco em micro-oficinas e autônomos. Modelo freemium ou licença simples sem profundidade funcional.',
    exemplo: 'IS2 Automotive, Oficina.app, Minha Oficina',
    bruning: false,
    cor: '#f59e0b',
  },
  {
    id: 'simplicidade',
    icon: '⚡',
    titulo: 'Simplicidade + Agilidade Mobile',
    descricao: 'Use o sistema com facilidade e faça tudo mais rápido. Foco na experiência do mecânico no dia a dia, com forte presença mobile e UX simples.',
    exemplo: 'Griffo Oficinas, MotorSW, Mecanie',
    bruning: false,
    cor: '#60a5fa',
  },
  {
    id: 'erp_horizontal',
    icon: '🏢',
    titulo: 'ERP Horizontal',
    descricao: 'Um ERP completo para vários negócios — inclusive oficina. Forte em fiscal e integrações, mas sem especialização automotiva real.',
    exemplo: 'GestãoClick, Hiper, IS2 Store',
    bruning: false,
    cor: '#a78bfa',
  },
  {
    id: 'automotivo_especifico',
    icon: '🚗',
    titulo: 'Automotivo Específico',
    descricao: 'Sistemas para operações automotivas além da oficina: revendas, concessionárias e lojas multimarcas. Focados em CRM e anúncios de veículos.',
    exemplo: 'Onmotor, Autogestor, Revenda Mais',
    bruning: false,
    cor: '#fb7185',
  },
]

/* ─────────── helpers ─────────── */
function GrupoBadge({ grupo }) {
  const g = GRUPOS[grupo]
  return (
    <span
      className={styles.grupoBadge}
      style={{ background: g.cor + '22', color: g.cor, borderColor: g.cor + '55' }}
    >
      {g.label}
    </span>
  )
}

/* ─────────── Aba 1: Tabela Geral ─────────── */
function TabelaGeral() {
  const [filtroGrupo, setFiltroGrupo] = useState('todos')
  const [expandido, setExpandido]     = useState(null)

  const lista = filtroGrupo === 'todos'
    ? CONCORRENTES
    : CONCORRENTES.filter(c => c.grupo === filtroGrupo)

  return (
    <div className={styles.abaContent}>
      {/* Filtros */}
      <div className={styles.filtros}>
        <button
          className={`${styles.filtroBtn} ${filtroGrupo === 'todos' ? styles.filtroBtnActive : ''}`}
          onClick={() => setFiltroGrupo('todos')}
        >
          Todos ({CONCORRENTES.length})
        </button>
        {Object.entries(GRUPOS).map(([key, g]) => (
          <button
            key={key}
            className={`${styles.filtroBtn} ${filtroGrupo === key ? styles.filtroBtnActive : ''}`}
            style={filtroGrupo === key ? { borderColor: g.cor, background: g.cor + '22', color: g.cor } : {}}
            onClick={() => setFiltroGrupo(key)}
          >
            {g.label} ({CONCORRENTES.filter(c => c.grupo === key).length})
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className={styles.concGrid}>
        {lista.map(c => (
          <div
            key={c.id}
            className={`${styles.concCard} ${expandido === c.id ? styles.concCardOpen : ''}`}
          >
            <div
              className={styles.concCardHeader}
              onClick={() => setExpandido(expandido === c.id ? null : c.id)}
            >
              <div className={styles.concCardHeaderLeft}>
                <span className={styles.concNome}>{c.nome}</span>
                <GrupoBadge grupo={c.grupo} />
              </div>
              <div className={styles.concCardHeaderRight}>
                <div className={styles.precoBadge}>
                  <span className={styles.precoLabel}>Preço mensal</span>
                  <span className={styles.precoValor}>{c.precoTexto}</span>
                </div>
                <span className={styles.expandIcon}>{expandido === c.id ? '▲' : '▼'}</span>
              </div>
            </div>

            <p className={styles.concModelo}>{c.modelo} — {c.posicionamento}</p>

            {expandido === c.id && (
              <div className={styles.concDetalhes}>
                <div className={styles.detRow}>
                  <div className={styles.detCol}>
                    <h4 className={styles.detTitulo} style={{ color: '#4ade80' }}>✓ Pontos fortes</h4>
                    <ul className={styles.detList}>
                      {c.fortes.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                  <div className={styles.detCol}>
                    <h4 className={styles.detTitulo} style={{ color: '#fb7185' }}>✗ Pontos fracos</h4>
                    <ul className={styles.detList}>
                      {c.fracos.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                  <div className={styles.detCol}>
                    <h4 className={styles.detTitulo} style={{ color: '#ccf46a' }}>★ Bruning ganha em</h4>
                    <ul className={styles.detList}>
                      {c.bruningGanha.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className={styles.nota}>
        * Preços mensais conforme tabela pública ou pesquisa de mercado (2025). Bruning opera com precificação sob consulta. Fonte: sites oficiais dos concorrentes.
      </p>
    </div>
  )
}

/* ─────────── Aba 2: Bruning vs Mercado ─────────── */
function BruningVsMercado() {
  return (
    <div className={styles.abaContent}>
      <div className={styles.vsGrid}>

        {/* SWOT */}
        <div className={styles.swotWrapper}>
          <h3 className={styles.sectionTitle}>SWOT Consolidada — Bruning Sistemas</h3>
          <div className={styles.swotGrid}>
            <div className={`${styles.swotQuad} ${styles.swotF}`}>
              <h4>Forças <span>S</span></h4>
              <ul>{SWOT.forcas.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div className={`${styles.swotQuad} ${styles.swotW}`}>
              <h4>Fraquezas <span>W</span></h4>
              <ul>{SWOT.fraquezas.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div className={`${styles.swotQuad} ${styles.swotO}`}>
              <h4>Oportunidades <span>O</span></h4>
              <ul>{SWOT.oportunidades.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div className={`${styles.swotQuad} ${styles.swotT}`}>
              <h4>Ameaças <span>T</span></h4>
              <ul>{SWOT.ameacas.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          </div>
          <div className={styles.swotResumo}>
            <strong>Resultado macro:</strong> Bruning é percebida como uma das soluções mais completas e profissionais do nicho automotivo. Para manter posição competitiva, precisa escalar marketing, clarear preços e simplificar a jornada do lead.
          </div>
        </div>

        {/* Onde Bruning ganha */}
        <div className={styles.atribWrapper}>
          <h3 className={styles.sectionTitle}>Onde Bruning ganha dos concorrentes</h3>
          <table className={styles.atribTable}>
            <thead>
              <tr>
                <th>Concorrente</th>
                <th style={{ color: '#ccf46a' }}>Bruning ganha em</th>
              </tr>
            </thead>
            <tbody>
              {[
                { nome: 'Ultracar',          vantagem: 'Apps completos e integração varejo + oficina' },
                { nome: 'Tecinco',            vantagem: 'Simplicidade, UX moderna e onboarding ágil' },
                { nome: 'Onmotor',            vantagem: 'Profundidade fiscal e módulo varejo (Job)' },
                { nome: 'Griffo',             vantagem: 'Robustez operacional e fiscal completo' },
                { nome: 'Oficina Integrada',  vantagem: 'Ganha em tudo — exceto preço' },
                { nome: 'MotorSW',            vantagem: 'Módulo fiscal e integração com varejo' },
                { nome: 'GestãoClick',        vantagem: 'Operação automotiva especializada (pátio, OS, veículo)' },
                { nome: 'Syscar',             vantagem: 'Atendimento sem fricção, 3 apps nativos, integração varejo' },
                { nome: 'IS2 Automotive',     vantagem: 'UX moderna, apps mobile, suporte consultivo' },
                { nome: 'Mecanie',            vantagem: 'Credibilidade (+12 anos) e profundidade fiscal' },
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row.nome}</td>
                  <td style={{ color: '#ccf46a' }}>{row.vantagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Onde Bruning precisa reforçar */}
        <div className={styles.atribWrapper}>
          <h3 className={styles.sectionTitle}>Onde Bruning precisa reforçar</h3>
          <div className={styles.reforcarGrid}>
            {[
              { titulo: 'Preço não visível', desc: 'Ausência de tabela pública perde cliques e gera atrito na pré-venda', urgente: true },
              { titulo: 'Conteúdo digital', desc: 'Falta de conteúdo agressivo (YouTube, Reels) comparado a Ultracar e Griffo', urgente: true },
              { titulo: 'SEO orgânico', desc: 'Precisa crescer para aumentar tráfego orgânico frente a Onmotor e Mecanie', urgente: false },
              { titulo: 'Clareza dos produtos', desc: 'Lead não entende de primeira: "o que é Job, Eixo, Web?" — comunicação precisa melhorar', urgente: true },
              { titulo: 'Automações e integrações', desc: 'Pouco destaque para WhatsApp avançado e integrações (embora existam)', urgente: false },
              { titulo: 'Plano Start', desc: 'Falta plano de entrada para capturar micro-oficinas que hoje vão para Griffo e MotorSW', urgente: false },
            ].map((item, i) => (
              <div key={i} className={`${styles.reforcarCard} ${item.urgente ? styles.reforcarUrgente : ''}`}>
                <div className={styles.reforcarTitulo}>
                  {item.urgente && <span className={styles.urgenteBadge}>Prioritário</span>}
                  <strong>{item.titulo}</strong>
                </div>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─────────── Aba 3: Posicionamento ─────────── */
function Posicionamento() {
  return (
    <div className={styles.abaContent}>
      <h3 className={styles.sectionTitle}>Os 5 Arquétipos de Posicionamento</h3>
      <p className={styles.arquSubtitle}>
        As empresas do mercado de software para oficinas se distribuem em 5 grandes arquétipos, definidos por nível de complexidade, profundidade funcional, preço, segmento atendido e maturidade do negócio.
      </p>

      <div className={styles.arquGrid}>
        {ARQUETIPOS.map(a => (
          <div
            key={a.id}
            className={`${styles.arquCard} ${a.bruning ? styles.arquCardBruning : ''}`}
            style={{ borderColor: a.cor + (a.bruning ? '' : '55') }}
          >
            <div className={styles.arquIconWrap} style={{ background: a.cor + '22', color: a.cor }}>
              <span className={styles.arquIcon}>{a.icon}</span>
            </div>
            <div className={styles.arquBody}>
              <div className={styles.arquTituloRow}>
                <h4 className={styles.arquTitulo} style={{ color: a.cor }}>{a.titulo}</h4>
                {a.bruning && <span className={styles.bruningTag}>← Bruning</span>}
              </div>
              <p className={styles.arquDesc}>{a.descricao}</p>
              <p className={styles.arquExemplo}><strong>Players:</strong> {a.exemplo}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mapa de posicionamento 2x2 */}
      <div className={styles.mapaWrapper}>
        <h3 className={styles.sectionTitle} style={{ marginTop: 32 }}>Mapa Preço × Profundidade Funcional</h3>
        <div className={styles.mapa2x2}>
          <div className={styles.mapaAxisY}>
            <span>Alta profundidade</span>
            <span>Baixa profundidade</span>
          </div>
          <div className={styles.mapaQuads}>
            {/* Q1: Alto preço + alta profundidade */}
            <div className={styles.mapaQuad}>
              <span className={styles.mapaQuadLabel}>Premium Especialista</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#a78bfa33', borderColor: '#a78bfa66', color: '#a78bfa' }}>Tecinco</span>
                <span className={styles.mapaPlayer} style={{ background: '#a78bfa33', borderColor: '#a78bfa66', color: '#a78bfa' }}>Syscar</span>
              </div>
            </div>
            {/* Q2: Baixo/médio preço + alta profundidade */}
            <div className={`${styles.mapaQuad} ${styles.mapaQuadDestaque}`}>
              <span className={styles.mapaQuadLabel}>Zona de Oportunidade ★</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#ccf46a33', borderColor: '#ccf46a', color: '#ccf46a', fontWeight: 700 }}>★ Bruning</span>
                <span className={styles.mapaPlayer} style={{ background: '#60a5fa22', borderColor: '#60a5fa55', color: '#60a5fa' }}>Ultracar</span>
              </div>
            </div>
            {/* Q3: Alto preço + baixa profundidade */}
            <div className={styles.mapaQuad}>
              <span className={styles.mapaQuadLabel}>Caro sem Especialização</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#f59e0b22', borderColor: '#f59e0b55', color: '#f59e0b' }}>GestãoClick</span>
                <span className={styles.mapaPlayer} style={{ background: '#f59e0b22', borderColor: '#f59e0b55', color: '#f59e0b' }}>Hiper</span>
              </div>
            </div>
            {/* Q4: Baixo preço + baixa profundidade */}
            <div className={styles.mapaQuad}>
              <span className={styles.mapaQuadLabel}>Entrada / Simples</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#fb718522', borderColor: '#fb718555', color: '#fb7185' }}>Griffo</span>
                <span className={styles.mapaPlayer} style={{ background: '#fb718522', borderColor: '#fb718555', color: '#fb7185' }}>MotorSW</span>
                <span className={styles.mapaPlayer} style={{ background: '#fb718522', borderColor: '#fb718555', color: '#fb7185' }}>IS2</span>
              </div>
            </div>
          </div>
          <div className={styles.mapaAxisX}>
            <span>Preço alto</span>
            <span>Preço baixo / acessível</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Componente principal ─────────── */
export default function ConcorrentesPanel() {
  const [aba, setAba] = useState('tabela')

  const ABAS = [
    { id: 'tabela',         label: 'Tabela Geral' },
    { id: 'comparativo',   label: 'Bruning vs Mercado' },
    { id: 'posicionamento', label: 'Posicionamento' },
  ]

  return (
    <div className={styles.panel}>
      {/* Cabeçalho */}
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Mapa de Concorrência</h2>
          <p className={styles.panelSub}>
            {CONCORRENTES.length} concorrentes mapeados — Softwares SaaS para gestão de oficinas
          </p>
        </div>
        <div className={styles.resumoBadges}>
          {Object.entries(GRUPOS).map(([key, g]) => (
            <span key={key} className={styles.resumoBadge} style={{ background: g.cor + '22', color: g.cor, borderColor: g.cor + '55' }}>
              {CONCORRENTES.filter(c => c.grupo === key).length} {g.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs internas */}
      <div className={styles.tabs}>
        {ABAS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${aba === t.id ? styles.tabActive : ''}`}
            onClick={() => setAba(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'tabela'          && <TabelaGeral />}
      {aba === 'comparativo'     && <BruningVsMercado />}
      {aba === 'posicionamento'  && <Posicionamento />}
    </div>
  )
}
