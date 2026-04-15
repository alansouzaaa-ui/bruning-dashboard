import { useState } from 'react'
import styles from './ConcorrentesPanel.module.css'

/* ─────────────────────────────────────────────────
   DADOS HARDCODED — atualizar conforme mercado muda
   ───────────────────────────────────────────────── */

const GRUPOS = {
  core:        { label: 'Concorrência Direta', cor: '#ccf46a' },
  baixo_custo: { label: 'Baixo Custo / Atacado', cor: '#60a5fa' },
  simples:     { label: 'Simples / Regional', cor: '#f59e0b' },
  erp:         { label: 'ERP / Soluções Digitais', cor: '#a78bfa' },
  automotivo:  { label: 'Redes Automotivas', cor: '#fb7185' },
}

const CONCORRENTES = [
  {
    id: 1,
    nome: 'Rolamentos do Sul',
    grupo: 'core',
    modelo: 'Distribuidor especializado',
    posicionamento: 'Amplo portfólio, forte em rolamentos industriais e automotivos',
    precoMin: 0.95,
    precoMax: 1.05,
    fortes: ['Portfólio amplo', 'Marca consolidada na região', 'Prazo de entrega competitivo'],
    fracos: ['Atendimento impessoal', 'Pouco suporte técnico pós-venda', 'Sistema legado'],
    bruningGanha: ['Relacionamento próximo', 'Consultoria técnica', 'Flexibilidade no crédito'],
  },
  {
    id: 2,
    nome: 'SKF Distribuidora Oficial',
    grupo: 'core',
    modelo: 'Representante autorizado',
    posicionamento: 'Premium — foco em qualidade SKF e suporte técnico especializado',
    precoMin: 1.10,
    precoMax: 1.30,
    fortes: ['Marca SKF reconhecida', 'Suporte técnico forte', 'Garantia extendida'],
    fracos: ['Preço elevado', 'Mínimo de pedido alto', 'Foco em grandes contas'],
    bruningGanha: ['Preço mais competitivo', 'Atende pequenas demandas', 'Entrega local mais rápida'],
  },
  {
    id: 3,
    nome: 'NSK / NTN Representante',
    grupo: 'core',
    modelo: 'Representante multi-marca',
    posicionamento: 'Marcas japonesas premium com foco no segmento industrial',
    precoMin: 1.08,
    precoMax: 1.25,
    fortes: ['Qualidade NSK/NTN', 'Estoque robusto', 'Rede de assistência técnica'],
    fracos: ['Prazo de entrega de importados longo', 'Pouca personalização', 'Burocracia'],
    bruningGanha: ['Agilidade', 'Relacionamento direto', 'Mix complementar com marcas nacionais'],
  },
  {
    id: 4,
    nome: 'Maxima Peças & Rolamentos',
    grupo: 'core',
    modelo: 'Distribuidor regional',
    posicionamento: 'Custo-benefício para frotas e oficinas da região',
    precoMin: 0.90,
    precoMax: 1.00,
    fortes: ['Preço competitivo', 'Estoque local', 'Atendimento ágil'],
    fracos: ['Portfólio limitado', 'Sem suporte técnico estruturado', 'Marca menos conhecida'],
    bruningGanha: ['Portfólio mais completo', 'Credibilidade no mercado', 'Consultoria técnica'],
  },
  {
    id: 5,
    nome: 'Mercado Livre / Atacadão',
    grupo: 'baixo_custo',
    modelo: 'Marketplace / E-commerce',
    posicionamento: 'Preço mínimo, sem serviço, volume alto',
    precoMin: 0.60,
    precoMax: 0.80,
    fortes: ['Preço mais baixo do mercado', 'Disponibilidade imediata', 'Variedade'],
    fracos: ['Sem garantia confiável', 'Produto possivelmente falsificado', 'Sem assistência técnica', 'Frete elevado para itens grandes'],
    bruningGanha: ['Qualidade certificada', 'Suporte e garantia reais', 'Relacionamento', 'Nota fiscal garantida'],
  },
  {
    id: 6,
    nome: 'Importadora China Direta',
    grupo: 'baixo_custo',
    modelo: 'Importação direta / Atacado',
    posicionamento: 'Volume + preço baixo, sem marca reconhecida',
    precoMin: 0.50,
    precoMax: 0.75,
    fortes: ['Menor custo absoluto', 'Estoque em quantidade'],
    fracos: ['Qualidade inconsistente', 'Sem suporte', 'Prazo longo de reposição', 'Risco cambial'],
    bruningGanha: ['Confiabilidade', 'Homologação técnica', 'Entrega imediata', 'Pós-venda'],
  },
  {
    id: 7,
    nome: 'Peças & Cia (Loja de Bairro)',
    grupo: 'simples',
    modelo: 'Varejo tradicional',
    posicionamento: 'Conveniência local para manutenção corriqueira',
    precoMin: 1.00,
    precoMax: 1.15,
    fortes: ['Proximidade física', 'Relacionamento informal', 'Venda no balcão'],
    fracos: ['Estoque limitado', 'Sem sistema de gestão', 'Não atende grandes clientes'],
    bruningGanha: ['Escala de fornecimento', 'Prazo e condições comerciais', 'Portfólio industrial'],
  },
  {
    id: 8,
    nome: 'Irmãos Borges Autopeças',
    grupo: 'simples',
    modelo: 'Distribuidor familiar',
    posicionamento: 'Relacionamento pessoal, foco em clientes fidelizados locais',
    precoMin: 0.92,
    precoMax: 1.02,
    fortes: ['Relacionamento pessoal forte', 'Flexibilidade de crédito informal', 'Agilidade'],
    fracos: ['Sem portfólio técnico', 'Sem sistema ERP', 'Dependência de 1–2 fornecedores'],
    bruningGanha: ['Profissionalismo', 'Suporte técnico', 'Maior variedade'],
  },
  {
    id: 9,
    nome: 'TOTVS / Bling Distribuidores',
    grupo: 'erp',
    modelo: 'Distribuidor com ERP integrado',
    posicionamento: 'Foco em eficiência operacional e integração com clientes via sistema',
    precoMin: 1.00,
    precoMax: 1.12,
    fortes: ['Integração sistêmica', 'Relatórios e rastreamento', 'Processo faturamento ágil'],
    fracos: ['Produto commodity, sem diferencial técnico', 'Custo de integração alto', 'Suporte genérico'],
    bruningGanha: ['Conhecimento técnico do produto', 'Flexibilidade comercial', 'Atendimento humano'],
  },
  {
    id: 10,
    nome: 'WEG / Distribuidores OEM',
    grupo: 'erp',
    modelo: 'Canal OEM / Indústria',
    posicionamento: 'Venda para grandes indústrias via contrato de fornecimento',
    precoMin: 0.88,
    precoMax: 0.98,
    fortes: ['Contratos de longo prazo', 'Volume garantido', 'Marca forte'],
    fracos: ['Não atende varejo/oficinas', 'Processo licitatório burocrático', 'Foco em peças originais OEM'],
    bruningGanha: ['Atendimento ao mercado de reposição', 'Agilidade', 'Flexibilidade de mix'],
  },
  {
    id: 11,
    nome: 'Euroauto / Rodobens',
    grupo: 'automotivo',
    modelo: 'Rede de autopeças automotiva',
    posicionamento: 'Foco em veículos leves e frotas — alta capilaridade regional',
    precoMin: 0.95,
    precoMax: 1.08,
    fortes: ['Marca reconhecida', 'Rede de pontos de venda', 'Catálogo automotivo completo'],
    fracos: ['Fraco em industrial/agrícola', 'Atendimento padronizado', 'Sem consultoria técnica'],
    bruningGanha: ['Especialização técnica', 'Mix industrial + automotivo', 'Atendimento consultivo'],
  },
  {
    id: 12,
    nome: 'Autoprime / AutoFácil',
    grupo: 'automotivo',
    modelo: 'Rede franqueada de autopeças',
    posicionamento: 'Conveniência e padronização — rede de franquias regionais',
    precoMin: 1.00,
    precoMax: 1.10,
    fortes: ['Padronização de processos', 'Treinamento de equipe', 'Variedade automotiva'],
    fracos: ['Modelo franquia inflexível', 'Pouco estoque de peças industriais', 'Royalties encarecem produto'],
    bruningGanha: ['Especialização', 'Atendimento personalizado', 'Custo final competitivo'],
  },
  {
    id: 13,
    nome: 'Agrosul Peças & Rolamentos',
    grupo: 'automotivo',
    modelo: 'Distribuidor agro-automotivo',
    posicionamento: 'Foco em máquinas agrícolas e frotas do agronegócio',
    precoMin: 0.98,
    precoMax: 1.12,
    fortes: ['Relacionamento com cooperativas', 'Mix agro específico', 'Crédito rural'],
    fracos: ['Sazonal (safra)', 'Pouca presença urbana', 'Estoque de rolamentos industriais limitado'],
    bruningGanha: ['Estoque permanente', 'Atendimento industrial + agro', 'Regularidade de fornecimento'],
  },
]

const SWOT = {
  forcas: [
    'Consultoria técnica especializada em rolamentos e eixos',
    'Relacionamento próximo e atendimento personalizado',
    'Mix completo: automotivo + industrial + agrícola',
    'Flexibilidade comercial (prazo, crédito, entrega)',
    'Equipe técnica com alto conhecimento do produto',
    'Histórico e credibilidade no mercado regional',
  ],
  fraquezas: [
    'Escala menor que grandes distribuidoras nacionais',
    'Sistema de gestão ainda em evolução',
    'Presença digital limitada (sem e-commerce próprio)',
    'Dependência de poucos fornecedores estratégicos',
    'Menor poder de negociação em grandes volumes',
  ],
  oportunidades: [
    'Crescimento do agronegócio regional aumenta demanda por peças',
    'Digitalização do processo de compras B2B',
    'Fidelização de frotas com contratos de fornecimento',
    'Expansão para novos segmentos industriais',
    'Parcerias com assistências técnicas autorizadas',
    'Mercado de reposição crescendo com frota velha',
  ],
  ameacas: [
    'Concorrência de preço via marketplace (Mercado Livre)',
    'Importação direta da China por clientes grandes',
    'Consolidação do mercado por grandes distribuidoras',
    'Volatilidade cambial afetando preço de importados',
    'Entrada de novos players com capital de VC',
  ],
}

const ARQUETIPOS = [
  {
    id: 'especialista',
    icon: '🎯',
    titulo: 'Especialista Técnico',
    descricao: 'Posicionamento por conhecimento profundo do produto e consultoria ao cliente. Ganha pela competência, não pelo preço.',
    exemplo: 'Bruning, NSK/NTN Rep.',
    bruning: true,
    cor: '#ccf46a',
  },
  {
    id: 'volume',
    icon: '📦',
    titulo: 'Volume & Preço',
    descricao: 'Competição por custo mínimo e escala máxima. Modelo funciona em comodities onde o produto é idêntico.',
    exemplo: 'Importadora China, Mercado Livre',
    bruning: false,
    cor: '#fb7185',
  },
  {
    id: 'relacionamento',
    icon: '🤝',
    titulo: 'Relacionamento Local',
    descricao: 'Fidelização por proximidade, confiança e histórico. Funciona em mercados onde o relacionamento supera o preço.',
    exemplo: 'Irmãos Borges, Peças & Cia',
    bruning: false,
    cor: '#f59e0b',
  },
  {
    id: 'marca',
    icon: '⭐',
    titulo: 'Marca Premium',
    descricao: 'Vende a marca como garantia de qualidade. Margens maiores mas base de clientes mais restrita.',
    exemplo: 'SKF Distribuidora Oficial',
    bruning: false,
    cor: '#a78bfa',
  },
  {
    id: 'digital',
    icon: '💻',
    titulo: 'Eficiência Digital',
    descricao: 'Diferencial via integração sistêmica, automação de pedidos e dados. Ganha em clientes que valorizam processo.',
    exemplo: 'TOTVS / Bling Distribuidores',
    bruning: false,
    cor: '#60a5fa',
  },
]

/* ─────────── helpers ─────────── */
function PrecoIndex({ min, max }) {
  const avg = ((min + max) / 2)
  const cor = avg < 0.85 ? '#fb7185' : avg > 1.1 ? '#a78bfa' : '#ccf46a'
  return (
    <span style={{ color: cor, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 13 }}>
      {(min * 100).toFixed(0)}–{(max * 100).toFixed(0)}%
    </span>
  )
}

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
                  <span className={styles.precoLabel}>Índice de preço</span>
                  <PrecoIndex min={c.precoMin} max={c.precoMax} />
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
                    <h4 className={styles.detTitulo} style={{ color: '#ccf46a' }}>★ Bruning ganha quando</h4>
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
        * Índice de preço relativo ao preço praticado pela Bruning (100% = mesmo preço). Dados estimados com base em pesquisa de mercado — atualizar periodicamente.
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
          <h3 className={styles.sectionTitle}>Análise SWOT — Bruning</h3>
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
        </div>

        {/* Tabela comparativa de atributos */}
        <div className={styles.atribWrapper}>
          <h3 className={styles.sectionTitle}>Diferenciais Competitivos</h3>
          <table className={styles.atribTable}>
            <thead>
              <tr>
                <th>Atributo</th>
                <th style={{ color: '#ccf46a' }}>Bruning</th>
                <th>Concorrentes Diretos</th>
                <th>Baixo Custo</th>
              </tr>
            </thead>
            <tbody>
              {[
                { attr: 'Consultoria técnica',    bruning: '✅ Alta',       direto: '⚡ Média',     baixo: '❌ Nenhuma' },
                { attr: 'Variedade de mix',       bruning: '✅ Completo',   direto: '⚡ Parcial',   baixo: '⚡ Limitado' },
                { attr: 'Preço (índice)',         bruning: '⚡ Competitivo',direto: '⚡ Similar',   baixo: '✅ Menor' },
                { attr: 'Prazo de entrega',       bruning: '✅ Rápido',     direto: '⚡ Variável',  baixo: '❌ Lento' },
                { attr: 'Pós-venda / garantia',  bruning: '✅ Incluso',    direto: '⚡ Parcial',   baixo: '❌ Sem' },
                { attr: 'Flexibilidade crédito', bruning: '✅ Alta',       direto: '⚡ Média',     baixo: '❌ À vista' },
                { attr: 'Relacionamento',        bruning: '✅ Próximo',    direto: '⚡ Formal',    baixo: '❌ Nenhum' },
                { attr: 'Qualidade certificada', bruning: '✅ Garantida',  direto: '✅ Sim',       baixo: '⚠️ Variável' },
                { attr: 'Integração digital',    bruning: '⚡ Em evolução',direto: '⚡ Parcial',   baixo: '✅ Marketplace' },
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row.attr}</td>
                  <td style={{ color: '#ccf46a' }}>{row.bruning}</td>
                  <td>{row.direto}</td>
                  <td>{row.baixo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

/* ─────────── Aba 3: Posicionamento ─────────── */
function Posicionamento() {
  return (
    <div className={styles.abaContent}>
      <h3 className={styles.sectionTitle}>Os 5 Arquétipos de Mercado</h3>
      <p className={styles.arquSubtitle}>
        Cada player no mercado de distribuição compete com uma estratégia central. Identificar o arquétipo de cada concorrente ajuda a direcionar argumentos de venda e defender margens.
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
              <p className={styles.arquExemplo}><strong>Exemplos:</strong> {a.exemplo}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mapa de posicionamento 2x2 */}
      <div className={styles.mapaWrapper}>
        <h3 className={styles.sectionTitle} style={{ marginTop: 32 }}>Mapa Preço × Valor Técnico</h3>
        <div className={styles.mapa2x2}>
          <div className={styles.mapaAxisY}>
            <span>Alto valor técnico</span>
            <span>Baixo valor técnico</span>
          </div>
          <div className={styles.mapaQuads}>
            {/* Q1: Alto preço + alto técnico */}
            <div className={styles.mapaQuad}>
              <span className={styles.mapaQuadLabel}>Premium Técnico</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#a78bfa33', borderColor: '#a78bfa66', color: '#a78bfa' }}>SKF Oficial</span>
                <span className={styles.mapaPlayer} style={{ background: '#a78bfa33', borderColor: '#a78bfa66', color: '#a78bfa' }}>NSK/NTN</span>
              </div>
            </div>
            {/* Q2: Baixo preço + alto técnico */}
            <div className={`${styles.mapaQuad} ${styles.mapaQuadDestaque}`}>
              <span className={styles.mapaQuadLabel}>Zona de Oportunidade</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#ccf46a33', borderColor: '#ccf46a', color: '#ccf46a', fontWeight: 700 }}>★ Bruning</span>
                <span className={styles.mapaPlayer} style={{ background: '#60a5fa22', borderColor: '#60a5fa55', color: '#60a5fa' }}>Rolamentos do Sul</span>
              </div>
            </div>
            {/* Q3: Alto preço + baixo técnico */}
            <div className={styles.mapaQuad}>
              <span className={styles.mapaQuadLabel}>Marca sem Serviço</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#f59e0b22', borderColor: '#f59e0b55', color: '#f59e0b' }}>Autoprime</span>
                <span className={styles.mapaPlayer} style={{ background: '#f59e0b22', borderColor: '#f59e0b55', color: '#f59e0b' }}>Euroauto</span>
              </div>
            </div>
            {/* Q4: Baixo preço + baixo técnico */}
            <div className={styles.mapaQuad}>
              <span className={styles.mapaQuadLabel}>Commodity Puro</span>
              <div className={styles.mapaPlayers}>
                <span className={styles.mapaPlayer} style={{ background: '#fb718522', borderColor: '#fb718555', color: '#fb7185' }}>ML/Atacadão</span>
                <span className={styles.mapaPlayer} style={{ background: '#fb718522', borderColor: '#fb718555', color: '#fb7185' }}>China Direta</span>
              </div>
            </div>
          </div>
          <div className={styles.mapaAxisX}>
            <span>Preço alto</span>
            <span>Preço baixo / competitivo</span>
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
    { id: 'tabela',      label: 'Tabela Geral' },
    { id: 'comparativo', label: 'Bruning vs Mercado' },
    { id: 'posicionamento', label: 'Posicionamento' },
  ]

  return (
    <div className={styles.panel}>
      {/* Cabeçalho */}
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Mapa de Concorrência</h2>
          <p className={styles.panelSub}>
            {CONCORRENTES.length} concorrentes mapeados em {Object.keys(GRUPOS).length} segmentos
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
      {aba === 'tabela'         && <TabelaGeral />}
      {aba === 'comparativo'    && <BruningVsMercado />}
      {aba === 'posicionamento' && <Posicionamento />}
    </div>
  )
}
