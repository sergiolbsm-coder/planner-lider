/* ============================================================
   PLANNER DO LÍDER — Impact Leader
   app.js — Lógica principal dos módulos
   Módulos: Auth (líder/liderado) · Liderados · Diário de Bordo
            · Atividades (Kanban) · Metas & Indicadores
            · Matriz de Prioridade · Dashboard
   Dados persistidos na API (Postgres/Neon) — ver planner-lider-api.
============================================================ */

// ============================================================
// ESTADO GLOBAL
// ============================================================
const STATE = {
  liderados: [],
  atividades: [],
  matriz: [],
  metas: [],
  diario: [],              // histórico completo do liderado selecionado (visão individual)
  diarioResumoEquipe: [],  // 1 registro "observacao" + 1 "feedback" mais recentes por liderado
  rotina: [],
  diarioSelecionadoId: null,
  metaIdeal: { operacional: 30, tatico: 40, estrategico: 30 },
  planoAcao: [],
  estatisticasDiario: null,
  filtroResultado: 'todos',
  filtroTipo: 'todos',
  filtroResponsavel: 'todos',
  filtroMeta: 'todos',
  lideradoSelecionado: null,
  // Visão do liderado (papel "liderado")
  meuPerfil: null,
  minhasAtividades: [],
  minhasMetas: [],
  meusFeedbacks: [],
};

// ============================================================
// LISTAS FIXAS — itens da Autoavaliação Mensal e seeds
// ============================================================
// "Sim" aqui = o erro está presente (é um ponto de atenção).
const ERROS_PLANEJAMENTO_ITENS = [
  { id: 'reativo', texto: 'Dia reagindo a demandas, não proativo.' },
  { id: 'sem-blocos', texto: 'Falta de blocos de tempo para atividades estratégicas.' },
  { id: 'sem-priorizacao', texto: 'Ausência de priorização clara das atividades.' },
  { id: 'sem-delegacao', texto: 'Não delega o que poderia ser delegado.' },
  { id: 'sem-rotina', texto: 'Não há rotina de acompanhamento e melhoria.' },
];

// "Sim" aqui = a boa prática já está presente (ponto forte).
const CHECKLIST_LIDER_ITENS = [
  { id: 'clareza-prioridades', texto: 'Tenho clareza das prioridades da minha área e da organização.' },
  { id: 'tempo-estrategico', texto: 'Estou dedicando tempo suficiente ao que é estratégico.' },
  { id: 'delega-confia', texto: 'Delego e confio nas pessoas da minha equipe.' },
  { id: 'reunioes-pauta', texto: 'Minhas reuniões têm pauta, objetivo e resultado.' },
  { id: 'indicadores', texto: 'Acompanho indicadores e tomo decisões com base em dados.' },
  { id: 'desenvolve-pessoas', texto: 'Invisto no desenvolvimento das pessoas.' },
  { id: 'elimina-automatiza', texto: 'Elimino ou automatizo atividades que não geram valor.' },
  { id: 'planeja-dia', texto: 'Planejo meu dia com foco no que realmente importa.' },
];

// Dica de melhoria mostrada na Análise quando o item indica um ponto de atenção.
const DICAS_MELHORIA = {
  'reativo': 'Reserve os primeiros 30 minutos do dia pra planejar as prioridades antes de responder a demandas.',
  'sem-blocos': 'Bloqueie ao menos 2 horas semanais fixas na agenda só pra atividades estratégicas, sem interrupções.',
  'sem-priorizacao': 'Use a Matriz de Prioridades toda semana pra decidir o que fazer, planejar, delegar ou eliminar.',
  'sem-delegacao': 'Escolha 1 atividade essa semana pra delegar, com um combinado claro de expectativa e prazo.',
  'sem-rotina': 'Reserve 15 minutos toda sexta pra revisar o que funcionou e o que precisa mudar na semana.',
  'clareza-prioridades': 'Alinhe com sua liderança quais são as 3 prioridades da área pro próximo trimestre.',
  'tempo-estrategico': 'Reserve tempo fixo na agenda pra atividades estratégicas antes que a operação tome tudo.',
  'delega-confia': 'Identifique uma pessoa da equipe pronta pra assumir mais responsabilidade e converse sobre isso.',
  'reunioes-pauta': 'Antes de marcar a próxima reunião, defina pauta, objetivo e o resultado esperado.',
  'indicadores': 'Escolha 1 indicador da sua área pra acompanhar semanalmente e decidir com base nele.',
  'desenvolve-pessoas': 'Agende ao menos um 1:1 de desenvolvimento com um liderado esse mês.',
  'elimina-automatiza': 'Liste uma atividade repetitiva que poderia ser eliminada, simplificada ou automatizada.',
  'planeja-dia': 'Comece o dia revisando sua agenda e ajustando o que for preciso antes de mergulhar nas tarefas.',
};

const RISCOS_LABELS = {
  sobrecarga: '😓 Sobrecarga',
  isolamento: '🚪 Isolamento',
  desmotivacao: '📉 Desmotivação',
  conflito: '⚡ Conflito',
  mudanca: '🔄 Mudança pessoal',
  pressao: '🧱 Pressão excessiva',
};

function planoAcaoPadrao() {
  return [
    { acao: 'Bloquear tempo para o estratégico', comoFazer: 'Agendar 2 blocos diários sem interrupções.', impacto: 'Mais foco em projetos e desenvolvimento.', prazo: 'Imediato' },
    { acao: 'Delegar com clareza', comoFazer: 'Definir responsáveis e acompanhar resultados.', impacto: 'Reduzir sobrecarga operacional.', prazo: 'Imediato' },
    { acao: 'Padronizar processos', comoFazer: 'Criar checklists e templates para demandas recorrentes.', impacto: 'Menos retrabalho e mais eficiência.', prazo: 'Curto prazo (30 dias)' },
    { acao: 'Reuniões com propósito', comoFazer: 'Pauta clara, objetivo e tempo definido.', impacto: 'Reuniões mais eficazes e rápidas.', prazo: 'Curto prazo (30 dias)' },
    { acao: 'Acompanhar indicadores', comoFazer: 'Focar no que realmente importa.', impacto: 'Decisões melhores e mais rápidas.', prazo: 'Contínuo' },
    { acao: 'Desenvolver pessoas', comoFazer: '1:1s semanais e feedback estruturado.', impacto: 'Equipe mais engajada e preparada.', prazo: 'Contínuo' },
  ];
}

// ============================================================
// API — autenticação e chamadas HTTP
// ============================================================
const API_BASE = 'https://planner-lider-api.onrender.com';
const AUTH = { token: null, user: null };

function carregarAuth() {
  try {
    AUTH.token = localStorage.getItem('pl_token') || null;
    AUTH.user = JSON.parse(localStorage.getItem('pl_user') || 'null');
  } catch (e) { AUTH.token = null; AUTH.user = null; }
}
function salvarAuth(token, user) {
  AUTH.token = token;
  AUTH.user = user;
  localStorage.setItem('pl_token', token);
  localStorage.setItem('pl_user', JSON.stringify(user));
}
function limparAuth() {
  AUTH.token = null;
  AUTH.user = null;
  localStorage.removeItem('pl_token');
  localStorage.removeItem('pl_user');
}

async function api(caminho, opcoes = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (AUTH.token) headers.Authorization = 'Bearer ' + AUTH.token;

  let res;
  try {
    res = await fetch(API_BASE + caminho, { ...opcoes, headers });
  } catch (e) {
    throw new Error('Não foi possível falar com o servidor. Verifique sua internet e tente de novo.');
  }

  let corpo = null;
  try { corpo = await res.json(); } catch (e) { /* resposta sem corpo, ex: 204 */ }

  if (res.status === 401) {
    limparAuth();
    mostrarTela('auth');
    throw new Error('Sessão expirada. Entre novamente.');
  }
  if (!res.ok) throw new Error((corpo && corpo.erro) || `Erro ${res.status}.`);
  return corpo;
}

const Api = {
  registrarLider: dados => api('/auth/registrar-lider', { method: 'POST', body: JSON.stringify(dados) }),
  login: (email, senha) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),

  meuPerfilLiderado: () => api('/liderados/me'),
  listarLiderados: () => api('/liderados'),
  criarLiderado: dados => api('/liderados', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarLiderado: (id, dados) => api('/liderados/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirLiderado: id => api('/liderados/' + id, { method: 'DELETE' }),

  listarAtividades: () => api('/atividades'),
  minhasAtividades: () => api('/atividades/minhas'),
  criarAtividade: dados => api('/atividades', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarAtividade: (id, dados) => api('/atividades/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  moverStatusAtividade: (id, status) => api(`/atividades/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  excluirAtividade: id => api('/atividades/' + id, { method: 'DELETE' }),

  listarMetas: () => api('/metas'),
  minhasMetas: () => api('/metas/minhas'),
  criarMeta: dados => api('/metas', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarMeta: (id, dados) => api('/metas/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirMeta: id => api('/metas/' + id, { method: 'DELETE' }),

  listarMatriz: () => api('/matriz'),
  criarMatriz: dados => api('/matriz', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarMatriz: (id, dados) => api('/matriz/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirMatriz: id => api('/matriz/' + id, { method: 'DELETE' }),

  diarioDoLiderado: id => api('/diario/liderado/' + id),
  diarioResumoEquipe: () => api('/diario/resumo-equipe'),
  criarRegistroDiario: dados => api('/diario', { method: 'POST', body: JSON.stringify(dados) }),
  excluirRegistroDiario: id => api('/diario/' + id, { method: 'DELETE' }),
  meusFeedbacks: () => api('/diario/meus-feedbacks'),

  listarRotina: () => api('/rotina'),
  criarRotina: dados => api('/rotina', { method: 'POST', body: JSON.stringify(dados) }),
  excluirRotina: id => api('/rotina/' + id, { method: 'DELETE' }),

  listarPlanoAcao: () => api('/plano-acao'),
  criarPlanoAcao: dados => api('/plano-acao', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarPlanoAcao: (id, dados) => api('/plano-acao/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirPlanoAcao: id => api('/plano-acao/' + id, { method: 'DELETE' }),

  getDashboardConfig: () => api('/dashboard-config'),
  atualizarDashboardConfig: dados => api('/dashboard-config', { method: 'PUT', body: JSON.stringify(dados) }),

  estatisticasDiario: () => api('/diario/estatisticas'),

  obterAutoavaliacao: mesRef => api('/autoavaliacoes/' + mesRef),
  salvarAutoavaliacao: (mesRef, respostas) => api('/autoavaliacoes/' + mesRef, { method: 'PUT', body: JSON.stringify({ respostas }) }),
};

// ---- mapeia linhas da API (snake_case) pro formato usado nas telas ----
function mapLiderado(u) {
  return {
    id: u.id, nome: u.nome, cargo: u.cargo || '', email: u.email || '',
    dataInicio: u.data_inicio ? String(u.data_inicio).slice(0, 10) : '',
    perfil: u.perfil_comportamental || '',
    habilidades: u.habilidades || '', expectativas: u.expectativas || '',
    metas: u.metas_texto || '', desenvolvimento: u.desenvolvimento || '', obs: u.obs || '',
    aspiracoes: u.aspiracoes || '', comportamentos: u.comportamentos || '', sentimentos: u.sentimentos || '',
    criadoEm: u.criado_em,
  };
}
function mapAtividade(a) {
  return {
    id: a.id, titulo: a.titulo, resultado: a.resultado, tipo: a.tipo, status: a.status,
    prazo: a.prazo ? String(a.prazo).slice(0, 10) : '',
    responsavelId: a.responsavel_eu ? 'eu' : (a.responsavel_id || ''),
    metaId: a.meta_id || '', obs: a.obs || '', criadoEm: a.criado_em,
  };
}
function mapMeta(m) {
  return {
    id: m.id, nome: m.nome, tipo: m.tipo, indicador: m.indicador || '', valor: m.valor || '',
    prazo: m.prazo ? String(m.prazo).slice(0, 10) : '', descricao: m.descricao || '',
    criadoEm: m.criado_em,
    _totalAtividades: m.total_atividades !== undefined ? Number(m.total_atividades) : undefined,
    _atividadesConcluidas: m.atividades_concluidas !== undefined ? Number(m.atividades_concluidas) : undefined,
  };
}
function mapMatriz(m) {
  return { id: m.id, titulo: m.titulo, resultado: m.resultado, esforco: m.esforco, obs: m.obs || '', criadoEm: m.criado_em };
}
function mapRotina(r) {
  return { id: r.id, data: String(r.data).slice(0, 10), inicio: r.inicio.slice(0, 5), fim: r.fim.slice(0, 5), atividade: r.atividade, tipo: r.tipo, impacto: r.impacto || '', energia: r.energia || '', criadoEm: r.criado_em };
}
function mapDiario(d) {
  return { id: d.id, lideradoId: d.liderado_id, tipo: d.tipo, data: String(d.data).slice(0, 10), riscos: d.riscos || [], sinais: d.sinais || '', conversa: d.conversa || '', plano: d.plano || '', criadoEm: d.criado_em };
}
function mapPlanoAcao(p) {
  return { id: p.id, acao: p.acao || '', comoFazer: p.como_fazer || '', impacto: p.impacto || '', prazo: p.prazo || '' };
}
function mapFeedback(f) {
  return { id: f.id, data: String(f.data).slice(0, 10), conversa: f.conversa || '', plano: f.plano || '', criadoEm: f.criado_em };
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

function formatarData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function tempoNaEmpresa(dataInicio) {
  if (!dataInicio) return '';
  const inicio = new Date(dataInicio + 'T00:00:00');
  const hoje = new Date();
  let meses = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());
  if (hoje.getDate() < inicio.getDate()) meses--;
  if (meses <= 0) return 'Menos de 1 mês';
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  const partes = [];
  if (anos > 0) partes.push(`${anos} ano${anos !== 1 ? 's' : ''}`);
  if (mesesRestantes > 0) partes.push(`${mesesRestantes} ${mesesRestantes !== 1 ? 'meses' : 'mês'}`);
  return partes.join(' e ');
}

function iniciaisNome(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase();
}

function truncar(texto, n = 60) {
  if (!texto) return '';
  return texto.length > n ? texto.slice(0, n).trim() + '…' : texto;
}

function mostrarToast(msg, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${tipo}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ============================================================
// TELAS — auth / carregando / líder / liderado
// ============================================================
function mostrarTela(nome) {
  document.getElementById('tela-carregando').style.display = nome === 'carregando' ? '' : 'none';
  document.getElementById('tela-auth').style.display = nome === 'auth' ? '' : 'none';
  document.getElementById('app-shell').style.display = nome === 'lider' ? '' : 'none';
  document.getElementById('app-liderado').style.display = nome === 'liderado' ? '' : 'none';
  document.getElementById('btn-sidebar-toggle').style.display = nome === 'lider' ? '' : 'none';
  document.body.classList.remove('sidebar-open');
}

function initTelaAuth() {
  document.querySelectorAll('#tela-auth .subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tela-auth .subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#tela-auth .subview').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.authview).classList.add('active');
      document.getElementById('auth-erro').style.display = 'none';
    });
  });

  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('lg-email').value.trim();
    const senha = document.getElementById('lg-senha').value;
    await tentarAuth(document.querySelector('#form-login button[type=submit]'), () => Api.login(email, senha));
  });

  document.getElementById('form-registrar-lider').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = {
      nome: document.getElementById('rg-nome').value.trim(),
      area: document.getElementById('rg-area').value.trim(),
      cargo: document.getElementById('rg-cargo').value.trim(),
      email: document.getElementById('rg-email').value.trim(),
      senha: document.getElementById('rg-senha').value,
    };
    await tentarAuth(document.querySelector('#form-registrar-lider button[type=submit]'), () => Api.registrarLider(dados), true);
  });

  document.getElementById('btn-sair').addEventListener('click', sair);
  document.getElementById('btn-sair-liderado').addEventListener('click', sair);
}

async function tentarAuth(botao, chamada, ehRegistroDeLider) {
  const erroEl = document.getElementById('auth-erro');
  erroEl.style.display = 'none';
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Só um instante...';
  try {
    const { token, user } = await chamada();
    salvarAuth(token, user);
    if (ehRegistroDeLider) {
      for (const item of planoAcaoPadrao()) {
        try { await Api.criarPlanoAcao(item); } catch (e) { /* não bloqueia o cadastro */ }
      }
    }
    await entrarNaSessao();
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.style.display = 'block';
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

async function entrarNaSessao() {
  mostrarTela('carregando');
  if (AUTH.user.role === 'lider') {
    renderHeaderLider();
    await carregarTudoLider();
    mostrarTela('lider');
    irParaSecao('liderados');
  } else {
    await carregarTudoLiderado();
    mostrarTela('liderado');
  }
}

function renderHeaderLider() {
  document.getElementById('lider-ativo-avatar').textContent = iniciaisNome(AUTH.user.nome);
  document.getElementById('lider-ativo-nome').textContent = AUTH.user.nome;
}

function sair() {
  limparAuth();
  STATE.liderados = []; STATE.atividades = []; STATE.matriz = []; STATE.metas = [];
  STATE.diario = []; STATE.diarioResumoEquipe = []; STATE.rotina = []; STATE.planoAcao = [];
  STATE.estatisticasDiario = null;
  STATE.meuPerfil = null; STATE.minhasAtividades = []; STATE.minhasMetas = []; STATE.meusFeedbacks = [];
  document.getElementById('form-login').reset();
  document.getElementById('auth-erro').style.display = 'none';
  mostrarTela('auth');
}

async function carregarTudoLider() {
  try {
    const [liderados, atividades, metas, matriz, rotina, planoAcao, config] = await Promise.all([
      Api.listarLiderados(), Api.listarAtividades(), Api.listarMetas(), Api.listarMatriz(),
      Api.listarRotina(), Api.listarPlanoAcao(), Api.getDashboardConfig(),
    ]);
    STATE.liderados = liderados.map(mapLiderado);
    STATE.atividades = atividades.map(mapAtividade);
    STATE.metas = metas.map(mapMeta);
    STATE.matriz = matriz.map(mapMatriz);
    STATE.rotina = rotina.map(mapRotina);
    STATE.planoAcao = planoAcao.map(mapPlanoAcao);
    STATE.metaIdeal = { operacional: config.ideal_operacional, tatico: config.ideal_tatico, estrategico: config.ideal_estrategico };
    STATE.diario = [];
    STATE.diarioSelecionadoId = null;

    try { STATE.diarioResumoEquipe = (await Api.diarioResumoEquipe()).map(mapDiario); }
    catch (e) { STATE.diarioResumoEquipe = []; }

    renderTudo();
    await carregarEstatisticasDiario();
    await carregarAutoavaliacaoDoMes();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function carregarTudoLiderado() {
  try {
    const [perfil, atividades, metas, feedbacks] = await Promise.all([
      Api.meuPerfilLiderado(), Api.minhasAtividades(), Api.minhasMetas(), Api.meusFeedbacks(),
    ]);
    STATE.meuPerfil = mapLiderado(perfil);
    STATE.minhasAtividades = atividades.map(mapAtividade);
    STATE.minhasMetas = metas.map(mapMeta);
    STATE.meusFeedbacks = feedbacks.map(mapFeedback);
    renderVisaoLiderado();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function renderVisaoLiderado() {
  const p = STATE.meuPerfil;
  if (!p) return;
  document.getElementById('liderado-avatar').textContent = iniciaisNome(p.nome);
  document.getElementById('liderado-nome-topo').textContent = p.nome;

  document.getElementById('badge-minhas-atividades').textContent = STATE.minhasAtividades.length;
  const contAtiv = document.getElementById('lista-minhas-atividades');
  if (STATE.minhasAtividades.length === 0) {
    contAtiv.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂️</div><p>Nenhuma atividade atribuída a você ainda.</p></div>`;
  } else {
    contAtiv.innerHTML = STATE.minhasAtividades.map(a => {
      const rc = RESULTADO_CONFIG[a.resultado] || {};
      const tc = TIPO_CONFIG[a.tipo] || {};
      const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.novo;
      const meta = STATE.minhasMetas.find(m => m.id === a.metaId);
      return `
      <div class="liderado-atividade-item">
        <div>
          <div class="atividade-titulo">${a.titulo}</div>
          <div class="atividade-tags">
            <span class="tag-pill" style="background:${sc.bg};color:${sc.cor}">${sc.label}</span>
            ${a.resultado ? `<span class="tag-pill" style="background:${rc.bg};color:${rc.cor}">${rc.label}</span>` : ''}
            ${a.tipo ? `<span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label}</span>` : ''}
            ${a.prazo ? `<span class="tag-pill tag-prazo ${estaAtrasada(a) ? 'tag-prazo-atrasado' : ''}">📅 ${formatarData(a.prazo)}</span>` : ''}
            ${meta ? `<span class="tag-pill tag-meta">🎯 ${meta.nome}</span>` : ''}
          </div>
          ${a.obs ? `<div class="atividade-obs">${a.obs}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('badge-minhas-metas').textContent = STATE.minhasMetas.length;
  const contMetas = document.getElementById('lista-minhas-metas');
  if (STATE.minhasMetas.length === 0) {
    contMetas.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Nenhuma meta vinculada às suas atividades ainda.</p></div>`;
  } else {
    contMetas.innerHTML = STATE.minhasMetas.map(m => {
      const tc = TIPO_CONFIG[m.tipo] || {};
      const vinculadas = STATE.minhasAtividades.filter(a => a.metaId === m.id);
      const concluidas = vinculadas.filter(a => a.status === 'concluido');
      const pct = vinculadas.length ? Math.round((concluidas.length / vinculadas.length) * 100) : 0;
      return `
      <div class="meta-card">
        <div class="meta-card-topo"><span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label || ''}</span></div>
        <div class="meta-card-nome">${m.nome}</div>
        ${m.indicador ? `<div class="meta-card-indicador">📈 ${m.indicador}${m.valor ? ' · Meta: ' + m.valor : ''}</div>` : ''}
        ${m.prazo ? `<div class="meta-card-prazo">📅 ${formatarData(m.prazo)}</div>` : ''}
        <div class="meta-progresso">
          <div class="meta-progresso-barra"><div class="meta-progresso-fill" style="width:${pct}%;background:${tc.cor || '#667eea'}"></div></div>
          <div class="meta-progresso-texto">${concluidas.length}/${vinculadas.length} das suas atividades concluídas (${pct}%)</div>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('badge-meus-feedbacks').textContent = STATE.meusFeedbacks.length;
  const contFb = document.getElementById('lista-meus-feedbacks');
  if (STATE.meusFeedbacks.length === 0) {
    contFb.innerHTML = `<div class="empty-state"><div class="empty-icon">🗣️</div><p>Você ainda não recebeu nenhum feedback formal.</p></div>`;
  } else {
    contFb.innerHTML = STATE.meusFeedbacks
      .slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .map(f => `
      <div class="liderado-feedback-item">
        <div class="diario-timeline-data">🗣️ ${formatarData(f.data)}</div>
        ${f.conversa ? `<div class="diario-timeline-campo"><strong>💬 Conversa:</strong> ${f.conversa}</div>` : ''}
        ${f.plano ? `<div class="diario-timeline-campo"><strong>📋 Plano de ação:</strong> ${f.plano}</div>` : ''}
      </div>`).join('');
  }
}

// ============================================================
// NAVEGAÇÃO ENTRE SEÇÕES (líder)
// ============================================================
function irParaSecao(secao) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector(`.nav-btn[data-section="${secao}"]`).classList.add('active');
  document.getElementById('section-' + secao).classList.add('active');
  document.body.classList.remove('sidebar-open');
}

// ============================================================
// MENU LATERAL (sidebar) — abrir/fechar em telas estreitas
// ============================================================
function initSidebarToggle() {
  document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });
}

function initNavegacao() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => irParaSecao(btn.dataset.section));
  });
}

// ============================================================
// TAG BUTTONS — seleção única por grupo
// ============================================================
function initTagButtons() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn || btn.classList.contains('tag-btn-multi')) return;
    const group = btn.dataset.group;
    if (!group) return;
    document.querySelectorAll(`.tag-btn[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
}

function getTagValue(group) {
  const sel = document.querySelector(`.tag-btn[data-group="${group}"].selected`);
  return sel ? sel.dataset.value : '';
}

function setTagValue(group, value) {
  document.querySelectorAll(`.tag-btn[data-group="${group}"]`).forEach(b => {
    b.classList.toggle('selected', b.dataset.value === value);
  });
}

function clearTagGroup(group) {
  document.querySelectorAll(`.tag-btn[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
}

// ============================================================
// TAG BUTTONS — seleção múltipla (ex: riscos psicossociais)
// ============================================================
function initTagButtonsMulti() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn-multi');
    if (!btn) return;
    btn.classList.toggle('selected');
  });
}

function getMultiValues(groupMulti) {
  return Array.from(document.querySelectorAll(`.tag-btn-multi[data-group-multi="${groupMulti}"].selected`)).map(b => b.dataset.value);
}

function clearMultiGroup(groupMulti) {
  document.querySelectorAll(`.tag-btn-multi[data-group-multi="${groupMulti}"]`).forEach(b => b.classList.remove('selected'));
}

// ============================================================
// MÓDULO 1 — LIDERADOS
// ============================================================

const PERFIL_CORES = {
  'Executor': '#e74c3c',
  'Analítico': '#3498db',
  'Comunicador': '#2ecc71',
  'Planejador': '#9b59b6',
  'Líder Natural': '#f39c12',
  '': '#95a5a6',
};

function renderLiderados() {
  const container = document.getElementById('lista-liderados');
  const badge = document.getElementById('badge-total-liderados');
  badge.textContent = STATE.liderados.length;

  if (STATE.liderados.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <p>Nenhum liderado cadastrado ainda.<br>Use o formulário acima para começar.</p>
      </div>`;
  } else {
    container.innerHTML = STATE.liderados.map(l => `
      <div class="liderado-card" data-id="${l.id}">
        <div class="liderado-avatar" style="background:${PERFIL_CORES[l.perfil] || '#667eea'}">
          ${l.nome.charAt(0).toUpperCase()}
        </div>
        <div class="liderado-info">
          <div class="liderado-nome">${l.nome}</div>
          <div class="liderado-cargo">${l.cargo}</div>
          ${l.perfil ? `<span class="liderado-perfil-tag" style="background:${PERFIL_CORES[l.perfil]}20;color:${PERFIL_CORES[l.perfil]}">${l.perfil}</span>` : ''}
          ${l.dataInicio ? `<span class="liderado-tempo">⏱ ${tempoNaEmpresa(l.dataInicio)}</span>` : ''}
        </div>
        <div class="liderado-acoes">
          <button class="btn-icon" title="Diário de Bordo" onclick="abrirDiarioDoLiderado('${l.id}')">📓</button>
          <button class="btn-icon" title="Ver detalhes" onclick="verLiderado('${l.id}')">👁️</button>
          <button class="btn-icon" title="Editar" onclick="editarLiderado('${l.id}')">✏️</button>
          <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirLiderado('${l.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  popularSelectsResponsavel();
  renderDiarioSeletor();
  renderDiarioEquipe();
}

function initFormLiderado() {
  const form = document.getElementById('form-liderado');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('l-nome').value.trim();
    const cargo = document.getElementById('l-cargo').value.trim();
    const email = document.getElementById('l-email').value.trim();
    const senha = document.getElementById('l-senha').value;
    if (!nome || !cargo || !email) { mostrarToast('Preencha nome, cargo e e-mail.', 'error'); return; }

    const dadosComuns = {
      nome, cargo,
      dataInicio: document.getElementById('l-data-inicio').value,
      perfilComportamental: document.getElementById('l-perfil').value,
      habilidades: document.getElementById('l-habilidades').value.trim(),
      expectativas: document.getElementById('l-expectativas').value.trim(),
      metasTexto: document.getElementById('l-metas').value.trim(),
      desenvolvimento: document.getElementById('l-desenvolvimento').value.trim(),
      obs: document.getElementById('l-obs').value.trim(),
    };

    const id = document.getElementById('l-id').value;
    try {
      if (id) {
        const atualizado = mapLiderado(await Api.atualizarLiderado(id, dadosComuns));
        const idx = STATE.liderados.findIndex(l => l.id === id);
        STATE.liderados[idx] = atualizado;
        mostrarToast('Liderado atualizado com sucesso!');
      } else {
        if (!senha || senha.length < 6) { mostrarToast('Defina uma senha de acesso com pelo menos 6 caracteres.', 'error'); return; }
        const criado = mapLiderado(await Api.criarLiderado({ ...dadosComuns, email, senha }));
        STATE.liderados.push(criado);
        mostrarToast('Liderado cadastrado! Combine o e-mail e a senha de acesso com ele(a).');
      }
      renderLiderados();
      resetFormLiderado();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });

  document.getElementById('btn-cancelar-liderado').addEventListener('click', resetFormLiderado);
}

function resetFormLiderado() {
  document.getElementById('l-id').value = '';
  document.getElementById('form-liderado').reset();
  document.getElementById('l-email').readOnly = false;
  document.getElementById('grupo-senha-liderado').style.display = 'block';
  document.getElementById('liderado-form-title').textContent = 'Cadastrar Liderado';
  document.getElementById('btn-cancelar-liderado').style.display = 'none';
}

function editarLiderado(id) {
  const l = STATE.liderados.find(x => x.id === id);
  if (!l) return;
  document.getElementById('l-id').value = l.id;
  document.getElementById('l-nome').value = l.nome;
  document.getElementById('l-cargo').value = l.cargo;
  document.getElementById('l-email').value = l.email || '';
  document.getElementById('l-email').readOnly = true;
  document.getElementById('grupo-senha-liderado').style.display = 'none';
  document.getElementById('l-data-inicio').value = l.dataInicio || '';
  document.getElementById('l-perfil').value = l.perfil || '';
  document.getElementById('l-habilidades').value = l.habilidades || '';
  document.getElementById('l-expectativas').value = l.expectativas || '';
  document.getElementById('l-metas').value = l.metas || '';
  document.getElementById('l-desenvolvimento').value = l.desenvolvimento || '';
  document.getElementById('l-obs').value = l.obs || '';
  document.getElementById('liderado-form-title').textContent = 'Editar Liderado';
  document.getElementById('btn-cancelar-liderado').style.display = 'inline-flex';
  irParaSecao('liderados');
  document.querySelector('#section-liderados .form-card').scrollIntoView({ behavior: 'smooth' });
}

async function excluirLiderado(id) {
  if (!confirm('Deseja excluir este liderado? O acesso dele e os registros do diário de bordo também serão removidos.')) return;
  try {
    await Api.excluirLiderado(id);
    STATE.liderados = STATE.liderados.filter(l => l.id !== id);
    STATE.diarioResumoEquipe = STATE.diarioResumoEquipe.filter(d => d.lideradoId !== id);
    if (STATE.diarioSelecionadoId === id) { STATE.diarioSelecionadoId = null; STATE.diario = []; }
    renderLiderados();
    renderDiarioSeletor();
    renderDiarioConteudo();
    mostrarToast('Liderado removido.', 'info');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function verLiderado(id) {
  const l = STATE.liderados.find(x => x.id === id);
  if (!l) return;
  STATE.lideradoSelecionado = id;

  document.getElementById('modal-liderado-nome').textContent = l.nome;
  document.getElementById('modal-liderado-body').innerHTML = `
    <div class="modal-detalhe-grid">
      <div class="detalhe-item"><span class="detalhe-label">Cargo</span><span class="detalhe-valor">${l.cargo || '—'}</span></div>
      <div class="detalhe-item"><span class="detalhe-label">Perfil</span><span class="detalhe-valor">${l.perfil || '—'}</span></div>
      <div class="detalhe-item"><span class="detalhe-label">Tempo na empresa</span><span class="detalhe-valor">${l.dataInicio ? tempoNaEmpresa(l.dataInicio) + ' (desde ' + formatarData(l.dataInicio) + ')' : '—'}</span></div>
      <div class="detalhe-item"><span class="detalhe-label">E-mail de acesso</span><span class="detalhe-valor">${l.email || '—'}</span></div>
    </div>
    ${l.habilidades ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">💡 Principais Habilidades</div><p>${l.habilidades}</p></div>` : ''}
    ${l.expectativas ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">🎯 Expectativas do Líder</div><p>${l.expectativas}</p></div>` : ''}
    ${l.metas ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">📈 Metas Individuais</div><p>${l.metas}</p></div>` : ''}
    ${l.desenvolvimento ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">🚀 Plano de Desenvolvimento</div><p>${l.desenvolvimento}</p></div>` : ''}
    ${l.obs ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">📝 Observações</div><p>${l.obs}</p></div>` : ''}
  `;
  document.getElementById('modal-liderado').style.display = 'flex';
}

function initModalLiderado() {
  document.getElementById('modal-liderado-close').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
  });
  document.getElementById('modal-overlay-liderado').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
  });
  document.getElementById('modal-liderado-editar').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
    editarLiderado(STATE.lideradoSelecionado);
  });
  document.getElementById('modal-liderado-diario').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
    abrirDiarioDoLiderado(STATE.lideradoSelecionado);
  });
  document.getElementById('modal-liderado-excluir').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
    excluirLiderado(STATE.lideradoSelecionado);
  });
}

// ============================================================
// MÓDULO NOVO — DIÁRIO DE BORDO
// ============================================================

async function abrirDiarioDoLiderado(lideradoId) {
  STATE.diarioSelecionadoId = lideradoId;
  irParaSecao('diario');
  const btnIndividual = document.querySelector('#section-diario .subtab-btn[data-subview="individual"]');
  if (btnIndividual && !btnIndividual.classList.contains('active')) btnIndividual.click();
  renderDiarioSeletor();
  await carregarESelecionarDiario(lideradoId);
}

async function selecionarLideradoDiario(id) {
  STATE.diarioSelecionadoId = id;
  renderDiarioSeletor();
  await carregarESelecionarDiario(id);
}

async function carregarESelecionarDiario(id) {
  try {
    STATE.diario = (await Api.diarioDoLiderado(id)).map(mapDiario);
  } catch (err) {
    mostrarToast(err.message, 'error');
    STATE.diario = [];
  }
  renderDiarioConteudo();
}

function renderDiarioSeletor() {
  const container = document.getElementById('diario-seletor-liderados');
  if (STATE.liderados.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><p>Cadastre liderados na aba <strong>Liderados</strong> para começar o diário de bordo.</p></div>`;
    return;
  }
  container.innerHTML = STATE.liderados.map(l => `
    <div class="diario-chip ${STATE.diarioSelecionadoId === l.id ? 'ativo' : ''}" data-id="${l.id}" onclick="selecionarLideradoDiario('${l.id}')">
      <span class="diario-chip-avatar" style="background:${PERFIL_CORES[l.perfil] || '#667eea'}">${l.nome.charAt(0).toUpperCase()}</span>
      <span class="diario-chip-nome">${l.nome}</span>
    </div>
  `).join('');
}

function ultimoFeedback(lideradoId) {
  return STATE.diarioResumoEquipe.find(d => d.lideradoId === lideradoId && d.tipo === 'feedback') || null;
}

function atualizarPillUltimoFeedback(lideradoId) {
  const ult = ultimoFeedback(lideradoId);
  document.getElementById('diario-ultimo-feedback').textContent = ult
    ? `🗣️ Último feedback: ${formatarData(ult.data)}`
    : '🗣️ Sem feedback formal ainda';
}

function renderDiarioConteudo() {
  const l = STATE.liderados.find(x => x.id === STATE.diarioSelecionadoId);
  const conteudo = document.getElementById('diario-conteudo');
  if (!l) { conteudo.style.display = 'none'; return; }
  conteudo.style.display = 'block';

  document.getElementById('diario-nome-liderado').textContent = l.nome;
  document.getElementById('dc-aspiracoes').value = l.aspiracoes || '';
  document.getElementById('dc-pontosfortes').value = l.habilidades || '';
  document.getElementById('dc-comportamentos').value = l.comportamentos || '';
  document.getElementById('dc-sentimentos').value = l.sentimentos || '';

  atualizarPillUltimoFeedback(l.id);

  document.getElementById('rd-data').value = hojeISO();
  clearMultiGroup('riscos');
  setTagValue('registro-tipo', 'observacao');

  renderTimelineDiario();
}

function initFormConhecer() {
  document.getElementById('form-conhecer').addEventListener('submit', async e => {
    e.preventDefault();
    const id = STATE.diarioSelecionadoId;
    if (!id) return;
    const dados = {
      aspiracoes: document.getElementById('dc-aspiracoes').value.trim(),
      habilidades: document.getElementById('dc-pontosfortes').value.trim(),
      comportamentos: document.getElementById('dc-comportamentos').value.trim(),
      sentimentos: document.getElementById('dc-sentimentos').value.trim(),
    };
    try {
      const atualizado = mapLiderado(await Api.atualizarLiderado(id, dados));
      const idx = STATE.liderados.findIndex(l => l.id === id);
      if (idx !== -1) STATE.liderados[idx] = atualizado;
      renderDiarioEquipe();
      mostrarToast('Perfil do liderado atualizado!');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

function renderTimelineDiario() {
  const registros = STATE.diario
    .filter(d => d.lideradoId === STATE.diarioSelecionadoId)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  document.getElementById('badge-total-diario').textContent = registros.length;
  const container = document.getElementById('lista-diario');

  if (registros.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📜</div><p>Nenhum registro ainda para este liderado.</p></div>`;
    return;
  }

  container.innerHTML = registros.map(r => `
    <div class="diario-timeline-item ${r.tipo === 'feedback' ? 'feedback' : ''}">
      <div class="diario-timeline-data">${r.tipo === 'feedback' ? '🗣️ Feedback formal — ' : '📅 '}${formatarData(r.data)}</div>
      ${(r.riscos && r.riscos.length) ? `<div class="atividade-tags">${r.riscos.map(v => `<span class="tag-pill tag-risco">${RISCOS_LABELS[v] || v}</span>`).join('')}</div>` : ''}
      ${r.sinais ? `<div class="diario-timeline-campo"><strong>👁️ Sinais observados:</strong> ${r.sinais}</div>` : ''}
      ${r.conversa ? `<div class="diario-timeline-campo"><strong>💬 Conversa:</strong> ${r.conversa}</div>` : ''}
      ${r.plano ? `<div class="diario-timeline-campo"><strong>📋 Plano de ação:</strong> ${r.plano}</div>` : ''}
      <button class="btn-icon btn-icon-sm btn-icon-danger diario-timeline-excluir" title="Excluir registro" onclick="excluirRegistroDiario('${r.id}')">🗑️</button>
    </div>
  `).join('');
}

function initFormRegistroDiario() {
  document.getElementById('form-registro-diario').addEventListener('submit', async e => {
    e.preventDefault();
    if (!STATE.diarioSelecionadoId) return;
    const riscos = getMultiValues('riscos');
    const sinais = document.getElementById('rd-sinais').value.trim();
    const conversa = document.getElementById('rd-conversa').value.trim();
    const plano = document.getElementById('rd-plano').value.trim();
    const tipo = getTagValue('registro-tipo') || 'observacao';

    if (!riscos.length && !sinais && !conversa && !plano) {
      mostrarToast('Preencha ao menos um campo do registro.', 'error');
      return;
    }

    try {
      const novo = mapDiario(await Api.criarRegistroDiario({
        liderado_id: STATE.diarioSelecionadoId, tipo,
        data: document.getElementById('rd-data').value || hojeISO(),
        riscos, sinais, conversa, plano,
      }));
      STATE.diario.push(novo);
      STATE.diarioResumoEquipe = STATE.diarioResumoEquipe.filter(d => !(d.lideradoId === novo.lideradoId && d.tipo === novo.tipo));
      STATE.diarioResumoEquipe.push(novo);

      renderTimelineDiario();
      renderDiarioEquipe();
      document.getElementById('form-registro-diario').reset();
      document.getElementById('rd-data').value = hojeISO();
      clearMultiGroup('riscos');
      setTagValue('registro-tipo', 'observacao');
      atualizarPillUltimoFeedback(STATE.diarioSelecionadoId);
      mostrarToast(tipo === 'feedback' ? 'Feedback lançado com sucesso!' : 'Registro adicionado ao diário de bordo!');
      carregarEstatisticasDiario();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

async function excluirRegistroDiario(id) {
  if (!confirm('Excluir este registro do diário de bordo?')) return;
  try {
    await Api.excluirRegistroDiario(id);
    STATE.diario = STATE.diario.filter(d => d.id !== id);
    // O registro apagado podia ser o "mais recente" do resumo da equipe — recarrega pra garantir consistência.
    try { STATE.diarioResumoEquipe = (await Api.diarioResumoEquipe()).map(mapDiario); } catch (e) {}
    renderTimelineDiario();
    renderDiarioEquipe();
    atualizarPillUltimoFeedback(STATE.diarioSelecionadoId);
    mostrarToast('Registro removido.', 'info');
    carregarEstatisticasDiario();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function renderDiarioEquipe() {
  const corpo = document.getElementById('tabela-diario-equipe-body');
  if (!corpo) return;

  if (STATE.liderados.length === 0) {
    corpo.innerHTML = `<tr><td colspan="10" class="celula-vazia">Cadastre liderados na aba Liderados para ver a equipe aqui.</td></tr>`;
    return;
  }

  const vazio = '<span class="celula-vazia">—</span>';
  corpo.innerHTML = STATE.liderados.map(l => {
    const obs = STATE.diarioResumoEquipe.find(d => d.lideradoId === l.id && d.tipo === 'observacao');
    const feedback = ultimoFeedback(l.id);

    return `
      <tr>
        <td>
          <div class="equipe-nome">${l.nome}</div>
          <div class="equipe-cargo">${l.cargo || ''}</div>
        </td>
        <td>${l.aspiracoes ? truncar(l.aspiracoes, 70) : vazio}</td>
        <td>${l.habilidades ? truncar(l.habilidades, 70) : vazio}</td>
        <td>${l.comportamentos ? truncar(l.comportamentos, 70) : vazio}</td>
        <td>${l.sentimentos ? truncar(l.sentimentos, 70) : vazio}</td>
        <td>${obs && obs.riscos.length ? obs.riscos.map(v => `<span class="tag-pill tag-risco">${RISCOS_LABELS[v] || v}</span>`).join(' ') : vazio}</td>
        <td>${obs && obs.sinais ? truncar(obs.sinais, 60) : vazio}</td>
        <td>${feedback ? `<span class="tag-pill tag-ultimo-feedback" style="margin-left:0">${formatarData(feedback.data)}</span>` : vazio}</td>
        <td>${(obs && obs.plano) || (feedback && feedback.plano) ? truncar((obs && obs.plano) || feedback.plano, 60) : vazio}</td>
        <td><button class="btn-icon btn-icon-sm" title="Ver linha do tempo" onclick="abrirDiarioDoLiderado('${l.id}')">👁️</button></td>
      </tr>`;
  }).join('');
}

function initResumoFeedback() {
  document.getElementById('btn-gerar-resumo').addEventListener('click', gerarResumoFeedback);
  document.getElementById('modal-resumo-close').addEventListener('click', fecharModalResumo);
  document.getElementById('modal-overlay-resumo').addEventListener('click', fecharModalResumo);
  document.getElementById('modal-resumo-fechar').addEventListener('click', fecharModalResumo);
  document.getElementById('modal-resumo-imprimir').addEventListener('click', () => window.print());
}

function fecharModalResumo() {
  document.getElementById('modal-resumo').style.display = 'none';
}

function gerarResumoFeedback() {
  const l = STATE.liderados.find(x => x.id === STATE.diarioSelecionadoId);
  if (!l) return;

  const periodoVal = document.getElementById('resumo-periodo').value;
  const limite = periodoVal === 'all' ? null : Date.now() - Number(periodoVal) * 24 * 60 * 60 * 1000;

  const registros = STATE.diario
    .filter(d => d.lideradoId === l.id)
    .filter(d => !limite || new Date(d.data).getTime() >= limite)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const atividadesLiderado = STATE.atividades.filter(a => a.responsavelId === l.id);
  const concluidas = atividadesLiderado.filter(a => a.status === 'concluido');
  const pendentes = atividadesLiderado.filter(a => a.status !== 'concluido');

  const periodoLabel = { '30': 'Últimos 30 dias', '90': 'Último trimestre', '180': 'Último semestre', '365': 'Último ano', 'all': 'Todo o período' }[periodoVal];

  const html = `
    <div class="resumo-cabecalho">
      <h2>${l.nome}</h2>
      <p>${l.cargo || ''}${l.dataInicio ? ' · ' + tempoNaEmpresa(l.dataInicio) + ' na empresa' : ''}</p>
      <p class="resumo-periodo-label">Período: ${periodoLabel} · Gerado em ${formatarData(hojeISO())}</p>
    </div>

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">🧭 Conhecer o Liderado</div>
      ${l.aspiracoes ? `<p><strong>🎯 Aspirações:</strong> ${l.aspiracoes}</p>` : ''}
      ${l.habilidades ? `<p><strong>⭐ Pontos fortes:</strong> ${l.habilidades}</p>` : ''}
      ${l.comportamentos ? `<p><strong>🧑‍🤝‍🧑 Comportamentos:</strong> ${l.comportamentos}</p>` : ''}
      ${l.sentimentos ? `<p><strong>❤️ Sentimentos e percepções:</strong> ${l.sentimentos}</p>` : ''}
      ${(!l.aspiracoes && !l.habilidades && !l.comportamentos && !l.sentimentos) ? '<p>Nenhuma informação registrada ainda.</p>' : ''}
    </div>

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">🗂️ Atividades e Projetos</div>
      <p>${concluidas.length} concluída(s) · ${pendentes.length} em andamento/pendente(s) de um total de ${atividadesLiderado.length}.</p>
      ${atividadesLiderado.length ? `<ul class="resumo-lista-atividades">${atividadesLiderado.map(a => `<li>${a.status === 'concluido' ? '✅' : '⏳'} ${a.titulo}${a.metaId ? ' — <em>' + metaNome(a) + '</em>' : ''}</li>`).join('')}</ul>` : '<p>Nenhuma atividade vinculada a este liderado.</p>'}
    </div>

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">📜 Registros do Diário de Bordo (${registros.length})</div>
      ${registros.length > 0 ? `<p>🗣️ ${registros.filter(r => r.tipo === 'feedback').length} feedback(s) formal(is) · 📝 ${registros.filter(r => r.tipo !== 'feedback').length} observação(ões).</p>` : ''}
      ${registros.length === 0 ? '<p>Nenhum registro no período selecionado.</p>' : registros.map(r => `
        <div class="resumo-registro">
          <div class="resumo-registro-data">${r.tipo === 'feedback' ? '🗣️ Feedback formal — ' : '📅 '}${formatarData(r.data)}</div>
          ${(r.riscos && r.riscos.length) ? `<p><strong>Riscos observados:</strong> ${r.riscos.map(v => RISCOS_LABELS[v] || v).join(', ')}</p>` : ''}
          ${r.sinais ? `<p><strong>Sinais:</strong> ${r.sinais}</p>` : ''}
          ${r.conversa ? `<p><strong>Conversa:</strong> ${r.conversa}</p>` : ''}
          ${r.plano ? `<p><strong>Plano de ação:</strong> ${r.plano}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('modal-resumo-body').innerHTML = html;
  document.getElementById('modal-resumo').style.display = 'flex';
}

// ============================================================
// MÓDULO 2 — ATIVIDADES (KANBAN + LISTA)
// ============================================================

const RESULTADO_CONFIG = {
  alto:       { label: '🔥 Alto Resultado',  cor: '#e74c3c', bg: '#fdf0ef' },
  medio:      { label: '📊 Médio Resultado', cor: '#f39c12', bg: '#fef9ec' },
  baixo:      { label: '📉 Baixo Resultado', cor: '#95a5a6', bg: '#f4f6f7' },
  delegavel:  { label: '🤝 Delegável',       cor: '#3498db', bg: '#eaf4fb' },
  eliminavel: { label: '🗑️ Eliminável',      cor: '#7f8c8d', bg: '#f2f3f4' },
};

const TIPO_CONFIG = {
  estrategico: { label: '🏆 Estratégico', cor: '#9b59b6', bg: '#f5eef8' },
  tatico:      { label: '⚙️ Tático',      cor: '#2980b9', bg: '#eaf4fb' },
  operacional: { label: '🔧 Operacional', cor: '#27ae60', bg: '#eafaf1' },
};

const STATUS_CONFIG = {
  novo:       { label: '📥 A Fazer',      cor: '#7f8c8d', bg: '#f2f3f4' },
  andamento:  { label: '🔄 Em Andamento', cor: '#2980b9', bg: '#eaf4fb' },
  bloqueado:  { label: '⏸️ Bloqueado',    cor: '#e67e22', bg: '#fdf2e9' },
  concluido:  { label: '✅ Concluído',    cor: '#27ae60', bg: '#eafaf1' },
};
const STATUS_ORDEM = ['novo', 'andamento', 'bloqueado', 'concluido'];

function popularSelectsResponsavel() {
  const opcoes = '<option value="">— Não atribuído —</option><option value="eu">👤 Eu (Líder)</option>' +
    STATE.liderados.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
  ['a-responsavel', 'ma-responsavel'].forEach(id => {
    const atual = document.getElementById(id).value;
    document.getElementById(id).innerHTML = opcoes;
    document.getElementById(id).value = atual;
  });
  const atualFiltro = document.getElementById('filtro-responsavel').value;
  document.getElementById('filtro-responsavel').innerHTML = '<option value="todos">Todos</option><option value="eu">👤 Eu (Líder)</option>' +
    STATE.liderados.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
  document.getElementById('filtro-responsavel').value = atualFiltro || 'todos';
}

function popularSelectsMeta() {
  const opcoes = '<option value="">— Nenhuma —</option>' +
    STATE.metas.map(m => `<option value="${m.id}">${TIPO_CONFIG[m.tipo]?.label.split(' ')[0] || ''} ${m.nome}</option>`).join('');
  ['a-meta', 'ma-meta'].forEach(id => {
    const atual = document.getElementById(id).value;
    document.getElementById(id).innerHTML = opcoes;
    document.getElementById(id).value = atual;
  });
  const atualFiltro = document.getElementById('filtro-meta').value;
  document.getElementById('filtro-meta').innerHTML = '<option value="todos">Todas</option>' +
    STATE.metas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
  document.getElementById('filtro-meta').value = atualFiltro || 'todos';
}

function nomeResponsavel(a) {
  if (a.responsavelId === 'eu') return '👤 Eu (Líder)';
  if (a.responsavelId) {
    const l = STATE.liderados.find(x => x.id === a.responsavelId);
    if (l) return '👤 ' + l.nome;
  }
  return '';
}

function metaNome(a) {
  const m = STATE.metas.find(x => x.id === a.metaId);
  return m ? m.nome : '';
}

function estaAtrasada(a) {
  return a.prazo && a.prazo < hojeISO() && a.status !== 'concluido';
}

// Instâncias dos gráficos Chart.js
let chartTipo = null;
let chartResultado = null;
let chartDashAtual = null;
let chartDashIdeal = null;

function renderGraficos() {
  const total = STATE.atividades.length;

  const tipoData = [
    STATE.atividades.filter(a => a.tipo === 'estrategico').length,
    STATE.atividades.filter(a => a.tipo === 'tatico').length,
    STATE.atividades.filter(a => a.tipo === 'operacional').length,
  ];
  const tipoLabels = ['Estratégico', 'Tático', 'Operacional'];
  const tipoCores = ['#9b59b6', '#2980b9', '#27ae60'];

  const resultData = [
    STATE.atividades.filter(a => a.resultado === 'alto').length,
    STATE.atividades.filter(a => a.resultado === 'medio').length,
    STATE.atividades.filter(a => a.resultado === 'baixo').length,
    STATE.atividades.filter(a => a.resultado === 'delegavel').length,
    STATE.atividades.filter(a => a.resultado === 'eliminavel').length,
  ];
  const resultLabels = ['Alto Resultado', 'Médio Resultado', 'Baixo Resultado', 'Delegável', 'Eliminável'];
  const resultCores = ['#e74c3c', '#f39c12', '#95a5a6', '#3498db', '#7f8c8d'];

  const opcoesBase = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return ` ${val} atividade${val !== 1 ? 's' : ''} (${pct}%)`;
          }
        }
      }
    },
    cutout: '55%',
  };

  const ctxTipo = document.getElementById('grafico-tipo').getContext('2d');
  if (chartTipo) chartTipo.destroy();
  chartTipo = new Chart(ctxTipo, {
    type: 'doughnut',
    data: { labels: tipoLabels, datasets: [{ data: tipoData, backgroundColor: tipoCores, borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: opcoesBase
  });

  const ctxRes = document.getElementById('grafico-resultado').getContext('2d');
  if (chartResultado) chartResultado.destroy();
  chartResultado = new Chart(ctxRes, {
    type: 'doughnut',
    data: { labels: resultLabels, datasets: [{ data: resultData, backgroundColor: resultCores, borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: opcoesBase
  });

  function gerarLegenda(containerId, labels, cores, dados) {
    const el = document.getElementById(containerId);
    el.innerHTML = labels.map((l, i) => {
      const pct = total > 0 ? Math.round((dados[i] / total) * 100) : 0;
      return `<div class="legenda-item-grafico">
        <span class="legenda-cor" style="background:${cores[i]}"></span>
        <span class="legenda-nome">${l}</span>
        <span class="legenda-pct">${dados[i]} (${pct}%)</span>
      </div>`;
    }).join('');
  }
  gerarLegenda('legenda-tipo', tipoLabels, tipoCores, tipoData);
  gerarLegenda('legenda-resultado', resultLabels, resultCores, resultData);

  const insightEl = document.getElementById('insight-texto');
  if (total === 0) {
    insightEl.textContent = 'Cadastre atividades para ver a análise da sua energia.';
    return;
  }
  const maxTipo = tipoLabels[tipoData.indexOf(Math.max(...tipoData))];
  const pctMaxTipo = Math.round((Math.max(...tipoData) / total) * 100);
  const pctEstrategico = Math.round((tipoData[0] / total) * 100);
  const pctOperacional = Math.round((tipoData[2] / total) * 100);

  let insight = `Você tem ${total} atividade${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}. `;
  insight += `A maior parte da sua energia está em atividades <strong>${maxTipo}s</strong> (${pctMaxTipo}%). `;
  if (pctOperacional > 60) {
    insight += `⚠️ Atenção: mais de 60% das suas atividades são operacionais — considere delegar para liberar espaço estratégico.`;
  } else if (pctEstrategico >= 40) {
    insight += `✅ Ótimo equilíbrio! Você está dedicando energia significativa a atividades estratégicas.`;
  } else {
    insight += `💡 Dica: tente aumentar o percentual de atividades estratégicas para ampliar seu impacto como líder.`;
  }
  insightEl.innerHTML = insight;
}

function atividadesFiltradas() {
  return STATE.atividades.filter(a => {
    const okR = STATE.filtroResultado === 'todos' || a.resultado === STATE.filtroResultado;
    const okT = STATE.filtroTipo === 'todos' || a.tipo === STATE.filtroTipo;
    const okResp = STATE.filtroResponsavel === 'todos' || (a.responsavelId || '') === STATE.filtroResponsavel;
    const okMeta = STATE.filtroMeta === 'todos' || (a.metaId || '') === STATE.filtroMeta;
    return okR && okT && okResp && okMeta;
  });
}

function tagsAtividade(a) {
  const rc = RESULTADO_CONFIG[a.resultado] || {};
  const tc = TIPO_CONFIG[a.tipo] || {};
  const resp = nomeResponsavel(a);
  const meta = metaNome(a);
  return `
    ${a.resultado ? `<span class="tag-pill" style="background:${rc.bg};color:${rc.cor}">${rc.label}</span>` : ''}
    ${a.tipo ? `<span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label}</span>` : ''}
    ${a.prazo ? `<span class="tag-pill tag-prazo ${estaAtrasada(a) ? 'tag-prazo-atrasado' : ''}">📅 ${formatarData(a.prazo)}</span>` : ''}
    ${resp ? `<span class="tag-pill tag-responsavel">${resp}</span>` : ''}
    ${meta ? `<span class="tag-pill tag-meta">🎯 ${meta}</span>` : ''}
  `;
}

function renderAtividades() {
  const container = document.getElementById('lista-atividades');
  const badge = document.getElementById('badge-total-atividades');
  const lista = atividadesFiltradas();
  badge.textContent = STATE.atividades.length;

  ['alto','medio','baixo','delegavel','eliminavel'].forEach(k => {
    document.getElementById('stat-' + k).textContent = STATE.atividades.filter(a => a.resultado === k).length;
  });
  ['estrategico','tatico','operacional'].forEach(k => {
    document.getElementById('stat-' + k).textContent = STATE.atividades.filter(a => a.tipo === k).length;
  });

  renderGraficos();

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>${STATE.atividades.length === 0 ? 'Nenhuma atividade cadastrada ainda.<br>Use o formulário acima para começar.' : 'Nenhuma atividade encontrada com os filtros selecionados.'}</p>
      </div>`;
  } else {
    container.innerHTML = lista.map(a => `
      <div class="atividade-item" data-id="${a.id}">
        <div class="atividade-main">
          <div class="atividade-titulo">${a.titulo}</div>
          <div class="atividade-tags">
            ${a.status ? `<span class="tag-pill" style="background:${STATUS_CONFIG[a.status].bg};color:${STATUS_CONFIG[a.status].cor}">${STATUS_CONFIG[a.status].label}</span>` : ''}
            ${tagsAtividade(a)}
          </div>
          ${a.obs ? `<div class="atividade-obs">${a.obs}</div>` : ''}
        </div>
        <div class="atividade-acoes">
          <button class="btn-icon btn-icon-edit" title="Editar rapidamente" onclick="abrirModalAtividade('${a.id}')">✏️</button>
          <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirAtividade('${a.id}')">🗑️</button>
        </div>
      </div>`).join('');
  }

  renderKanban();
  popularSelectsMeta();
  popularSelectAtividadeMatriz();
}

function renderKanban() {
  const lista = atividadesFiltradas();
  STATUS_ORDEM.forEach(status => {
    const itens = lista.filter(a => (a.status || 'novo') === status);
    document.getElementById('badge-kanban-' + status).textContent = itens.length;
    const container = document.getElementById('kanban-' + status);
    if (itens.length === 0) {
      container.innerHTML = '<div class="q-empty">Nenhuma atividade aqui</div>';
      return;
    }
    container.innerHTML = itens.map(a => {
      const idx = STATUS_ORDEM.indexOf(a.status || 'novo');
      return `
      <div class="kanban-card" draggable="true" data-id="${a.id}" ondragstart="onDragStartCard(event)" ondragend="this.classList.remove('dragging')">
        <div class="kanban-card-titulo">${a.titulo}</div>
        <div class="atividade-tags">${tagsAtividade(a)}</div>
        <div class="kanban-card-footer">
          <div class="kanban-card-mover">
            <button class="btn-icon btn-icon-sm" title="Mover para trás" ${idx === 0 ? 'disabled' : ''} onclick="moverStatus('${a.id}',-1)">◀</button>
            <button class="btn-icon btn-icon-sm" title="Mover para frente" ${idx === STATUS_ORDEM.length - 1 ? 'disabled' : ''} onclick="moverStatus('${a.id}',1)">▶</button>
          </div>
          <div class="kanban-card-acoes">
            <button class="btn-icon btn-icon-sm btn-icon-edit" title="Editar" onclick="abrirModalAtividade('${a.id}')">✏️</button>
            <button class="btn-icon btn-icon-sm btn-icon-danger" title="Excluir" onclick="excluirAtividade('${a.id}')">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
  });
}

function onDragStartCard(e) {
  e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id);
  e.currentTarget.classList.add('dragging');
}

async function atualizarStatusAtividade(id, status) {
  const idx = STATE.atividades.findIndex(a => a.id === id);
  if (idx === -1) return;
  const anterior = STATE.atividades[idx].status;
  STATE.atividades[idx].status = status;
  renderAtividades();
  try {
    await Api.moverStatusAtividade(id, status);
    await refrescarMetas();
  } catch (err) {
    STATE.atividades[idx].status = anterior;
    renderAtividades();
    mostrarToast(err.message, 'error');
  }
}

function moverStatus(id, delta) {
  const a = STATE.atividades.find(x => x.id === id);
  if (!a) return;
  const idxAtual = STATUS_ORDEM.indexOf(a.status || 'novo');
  const novoIdx = Math.min(STATUS_ORDEM.length - 1, Math.max(0, idxAtual + delta));
  atualizarStatusAtividade(id, STATUS_ORDEM[novoIdx]);
}

function initKanbanDrop() {
  document.querySelectorAll('.kanban-col-items').forEach(col => {
    col.addEventListener('dragover', e => e.preventDefault());
    col.addEventListener('drop', e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      atualizarStatusAtividade(id, col.dataset.status);
    });
  });
}

// Sub-abas genéricas (Kanban/Lista em Atividades, Individual/Equipe em Diário de Bordo)
// — escopadas por .section pra não interferir entre módulos diferentes.
function initSubtabs() {
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const secao = btn.closest('.section');
      if (!secao) return;
      secao.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
      secao.querySelectorAll('.subview').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      secao.querySelector('#view-' + btn.dataset.subview).classList.add('active');
    });
  });
}

function initFormAtividade() {
  const form = document.getElementById('form-atividade');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = document.getElementById('a-titulo').value.trim();
    if (!titulo) { mostrarToast('Descreva a atividade.', 'error'); return; }

    const resultado = getTagValue('resultado');
    const tipo = getTagValue('tipo');
    if (!resultado) { mostrarToast('Selecione a classificação por resultado.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione a classificação por tipo.', 'error'); return; }

    const dados = {
      titulo, resultado, tipo,
      status: getTagValue('status') || 'novo',
      prazo: document.getElementById('a-prazo').value,
      responsavelId: document.getElementById('a-responsavel').value,
      metaId: document.getElementById('a-meta').value,
      obs: document.getElementById('a-obs').value.trim(),
    };

    const id = document.getElementById('a-id').value;
    try {
      if (id) {
        const atualizada = mapAtividade(await Api.atualizarAtividade(id, dados));
        const idx = STATE.atividades.findIndex(a => a.id === id);
        STATE.atividades[idx] = atualizada;
        mostrarToast('Atividade atualizada!');
      } else {
        const criada = mapAtividade(await Api.criarAtividade(dados));
        STATE.atividades.push(criada);
        mostrarToast('Atividade cadastrada!');
      }
      renderAtividades();
      await refrescarMetas();
      resetFormAtividade();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });

  document.getElementById('btn-cancelar-atividade').addEventListener('click', resetFormAtividade);
}

function resetFormAtividade() {
  document.getElementById('a-id').value = '';
  document.getElementById('form-atividade').reset();
  clearTagGroup('resultado');
  clearTagGroup('tipo');
  setTagValue('status', 'novo');
  document.getElementById('a-responsavel').value = '';
  document.getElementById('a-meta').value = '';
  document.getElementById('atividade-form-title').textContent = 'Nova Atividade';
  document.getElementById('btn-cancelar-atividade').style.display = 'none';
}

function editarAtividade(id) {
  const a = STATE.atividades.find(x => x.id === id);
  if (!a) return;
  document.getElementById('a-id').value = a.id;
  document.getElementById('a-titulo').value = a.titulo;
  document.getElementById('a-prazo').value = a.prazo || '';
  document.getElementById('a-responsavel').value = a.responsavelId || '';
  document.getElementById('a-meta').value = a.metaId || '';
  document.getElementById('a-obs').value = a.obs || '';
  setTagValue('resultado', a.resultado);
  setTagValue('tipo', a.tipo);
  setTagValue('status', a.status || 'novo');
  document.getElementById('atividade-form-title').textContent = 'Editar Atividade';
  document.getElementById('btn-cancelar-atividade').style.display = 'inline-flex';
  document.querySelector('#section-atividades .form-card').scrollIntoView({ behavior: 'smooth' });
}

function abrirModalAtividade(id) {
  const a = STATE.atividades.find(x => x.id === id);
  if (!a) return;
  document.getElementById('ma-id').value = a.id;
  document.getElementById('ma-titulo').value = a.titulo;
  document.getElementById('ma-prazo').value = a.prazo || '';
  document.getElementById('ma-responsavel').value = a.responsavelId || '';
  document.getElementById('ma-meta').value = a.metaId || '';
  document.getElementById('ma-obs').value = a.obs || '';
  setTagValue('ma-resultado', a.resultado);
  setTagValue('ma-tipo', a.tipo);
  setTagValue('ma-status', a.status || 'novo');
  document.getElementById('modal-atividade').style.display = 'flex';
}

function fecharModalAtividade() {
  document.getElementById('modal-atividade').style.display = 'none';
  document.getElementById('ma-id').value = '';
  clearTagGroup('ma-resultado');
  clearTagGroup('ma-tipo');
  clearTagGroup('ma-status');
}

function initModalAtividade() {
  document.getElementById('modal-atividade-close').addEventListener('click', fecharModalAtividade);
  document.getElementById('modal-overlay-atividade').addEventListener('click', fecharModalAtividade);
  document.getElementById('modal-atividade-cancelar').addEventListener('click', fecharModalAtividade);

  document.getElementById('modal-atividade-salvar').addEventListener('click', async () => {
    const id = document.getElementById('ma-id').value;
    const titulo = document.getElementById('ma-titulo').value.trim();
    if (!titulo) { mostrarToast('Descreva a atividade.', 'error'); return; }

    const resultado = getTagValue('ma-resultado');
    const tipo = getTagValue('ma-tipo');
    if (!resultado) { mostrarToast('Selecione a classificação por resultado.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione a classificação por tipo.', 'error'); return; }

    const dados = {
      titulo, resultado, tipo,
      status: getTagValue('ma-status') || 'novo',
      prazo: document.getElementById('ma-prazo').value,
      responsavelId: document.getElementById('ma-responsavel').value,
      metaId: document.getElementById('ma-meta').value,
      obs: document.getElementById('ma-obs').value.trim(),
    };

    try {
      const atualizada = mapAtividade(await Api.atualizarAtividade(id, dados));
      const idx = STATE.atividades.findIndex(a => a.id === id);
      STATE.atividades[idx] = atualizada;
      renderAtividades();
      await refrescarMetas();
      fecharModalAtividade();
      mostrarToast('Atividade atualizada com sucesso!');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

async function excluirAtividade(id) {
  if (!confirm('Deseja excluir esta atividade?')) return;
  try {
    await Api.excluirAtividade(id);
    STATE.atividades = STATE.atividades.filter(a => a.id !== id);
    renderAtividades();
    await refrescarMetas();
    mostrarToast('Atividade removida.', 'info');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function initFiltrosAtividades() {
  document.querySelectorAll('[data-filtro-resultado]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filtro-resultado]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.filtroResultado = btn.dataset.filtroResultado;
      renderAtividades();
    });
  });
  document.querySelectorAll('[data-filtro-tipo]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filtro-tipo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.filtroTipo = btn.dataset.filtroTipo;
      renderAtividades();
    });
  });
  document.getElementById('filtro-responsavel').addEventListener('change', e => {
    STATE.filtroResponsavel = e.target.value;
    renderAtividades();
  });
  document.getElementById('filtro-meta').addEventListener('change', e => {
    STATE.filtroMeta = e.target.value;
    renderAtividades();
  });
}

// ============================================================
// MÓDULO NOVO — METAS & INDICADORES
// ============================================================

function metaProgresso(metaId) {
  const meta = STATE.metas.find(m => m.id === metaId);
  if (meta && meta._totalAtividades !== undefined) {
    const total = meta._totalAtividades;
    const concluidas = meta._atividadesConcluidas || 0;
    return { total, concluidas, pct: total ? Math.round((concluidas / total) * 100) : 0 };
  }
  const vinculadas = STATE.atividades.filter(a => a.metaId === metaId);
  const concluidas = vinculadas.filter(a => a.status === 'concluido');
  const pct = vinculadas.length ? Math.round((concluidas.length / vinculadas.length) * 100) : 0;
  return { total: vinculadas.length, concluidas: concluidas.length, pct };
}

async function refrescarMetas() {
  try {
    STATE.metas = (await Api.listarMetas()).map(mapMeta);
    renderMetas();
  } catch (err) { /* não é crítico — a próxima navegação já traz os dados corretos */ }
}

function renderMetas() {
  const container = document.getElementById('lista-metas');
  document.getElementById('badge-total-metas').textContent = STATE.metas.length;

  if (STATE.metas.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Nenhuma meta cadastrada ainda.<br>Use o formulário acima para começar.</p></div>`;
  } else {
    container.innerHTML = STATE.metas.map(m => {
      const tc = TIPO_CONFIG[m.tipo] || {};
      const prog = metaProgresso(m.id);
      return `
      <div class="meta-card" data-id="${m.id}">
        <div class="meta-card-topo">
          <span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label || ''}</span>
          <div class="meta-card-acoes">
            <button class="btn-icon btn-icon-sm" title="Editar" onclick="editarMeta('${m.id}')">✏️</button>
            <button class="btn-icon btn-icon-sm btn-icon-danger" title="Excluir" onclick="excluirMeta('${m.id}')">🗑️</button>
          </div>
        </div>
        <div class="meta-card-nome">${m.nome}</div>
        ${m.indicador ? `<div class="meta-card-indicador">📈 ${m.indicador}${m.valor ? ' · Meta: ' + m.valor : ''}</div>` : (m.valor ? `<div class="meta-card-indicador">Meta: ${m.valor}</div>` : '')}
        ${m.prazo ? `<div class="meta-card-prazo">📅 ${formatarData(m.prazo)}</div>` : ''}
        ${m.descricao ? `<div class="meta-card-desc">${m.descricao}</div>` : ''}
        <div class="meta-progresso">
          <div class="meta-progresso-barra"><div class="meta-progresso-fill" style="width:${prog.pct}%;background:${tc.cor || '#667eea'}"></div></div>
          <div class="meta-progresso-texto">${prog.concluidas}/${prog.total} atividades concluídas (${prog.pct}%)</div>
        </div>
      </div>`;
    }).join('');
  }

  popularSelectsMeta();
}

function initFormMeta() {
  document.getElementById('form-meta').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('me-nome').value.trim();
    const tipo = getTagValue('me-tipo');
    if (!nome) { mostrarToast('Dê um nome à meta.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione a categoria da meta.', 'error'); return; }

    const dados = {
      nome, tipo,
      indicador: document.getElementById('me-indicador').value.trim(),
      valor: document.getElementById('me-valor').value.trim(),
      prazo: document.getElementById('me-prazo').value,
      descricao: document.getElementById('me-desc').value.trim(),
    };

    const id = document.getElementById('me-id').value;
    try {
      if (id) {
        const atualizada = mapMeta(await Api.atualizarMeta(id, dados));
        const idx = STATE.metas.findIndex(m => m.id === id);
        STATE.metas[idx] = atualizada;
        mostrarToast('Meta atualizada!');
      } else {
        const criada = mapMeta(await Api.criarMeta(dados));
        STATE.metas.push(criada);
        mostrarToast('Meta cadastrada!');
      }
      renderMetas();
      resetFormMeta();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });

  document.getElementById('btn-cancelar-meta').addEventListener('click', resetFormMeta);
}

function resetFormMeta() {
  document.getElementById('me-id').value = '';
  document.getElementById('form-meta').reset();
  clearTagGroup('me-tipo');
  document.getElementById('meta-form-title').textContent = 'Nova Meta / Indicador';
  document.getElementById('btn-cancelar-meta').style.display = 'none';
}

function editarMeta(id) {
  const m = STATE.metas.find(x => x.id === id);
  if (!m) return;
  document.getElementById('me-id').value = m.id;
  document.getElementById('me-nome').value = m.nome;
  document.getElementById('me-indicador').value = m.indicador || '';
  document.getElementById('me-valor').value = m.valor || '';
  document.getElementById('me-prazo').value = m.prazo || '';
  document.getElementById('me-desc').value = m.descricao || '';
  setTagValue('me-tipo', m.tipo);
  document.getElementById('meta-form-title').textContent = 'Editar Meta / Indicador';
  document.getElementById('btn-cancelar-meta').style.display = 'inline-flex';
  irParaSecao('metas');
  document.querySelector('#section-metas .form-card').scrollIntoView({ behavior: 'smooth' });
}

async function excluirMeta(id) {
  if (!confirm('Excluir esta meta? As atividades vinculadas deixarão de referenciá-la.')) return;
  try {
    await Api.excluirMeta(id);
    STATE.metas = STATE.metas.filter(m => m.id !== id);
    STATE.atividades.forEach(a => { if (a.metaId === id) a.metaId = ''; });
    renderMetas();
    renderAtividades();
    mostrarToast('Meta removida.', 'info');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

// ============================================================
// MÓDULO 3 — MATRIZ DE PRIORIDADE
// ============================================================

function getQuadrante(resultado, esforco) {
  if (resultado === 'alto' && esforco === 'facil') return 'q1';
  if (resultado === 'alto' && esforco === 'dificil') return 'q2';
  if (resultado === 'baixo' && esforco === 'facil') return 'q3';
  if (resultado === 'baixo' && esforco === 'dificil') return 'q4';
  return null;
}

const QUADRANTE_CONFIG = {
  q1: { cor: '#27ae60', bg: '#eafaf1', titulo: '🚀 Fazer Agora' },
  q2: { cor: '#2980b9', bg: '#eaf4fb', titulo: '📅 Planejar' },
  q3: { cor: '#f39c12', bg: '#fef9ec', titulo: '🤝 Delegar' },
  q4: { cor: '#e74c3c', bg: '#fdf0ef', titulo: '🗑️ Eliminar' },
};

function renderMatriz() {
  ['q1','q2','q3','q4'].forEach(q => {
    const items = STATE.matriz.filter(m => getQuadrante(m.resultado, m.esforco) === q);
    const container = document.getElementById(q + '-items');
    const badge = document.getElementById('badge-' + q);
    badge.textContent = items.length;
    const cfg = QUADRANTE_CONFIG[q];

    if (items.length === 0) {
      container.innerHTML = '<div class="q-empty">Nenhum item ainda</div>';
      return;
    }

    container.innerHTML = items.map(m => `
      <div class="q-item" style="border-left:3px solid ${cfg.cor}">
        <div class="q-item-titulo">${m.titulo}</div>
        ${m.obs ? `<div class="q-item-obs">${m.obs}</div>` : ''}
        <div class="q-item-acoes">
          <button class="btn-icon btn-icon-sm" title="Editar" onclick="editarMatriz('${m.id}')">✏️</button>
          <button class="btn-icon btn-icon-sm btn-icon-danger" title="Excluir" onclick="excluirMatriz('${m.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  });
}

function popularSelectAtividadeMatriz() {
  const select = document.getElementById('m-atividade-existente');
  const atual = select.value;
  select.innerHTML = '<option value="">— Escrever uma descrição nova —</option>' +
    STATE.atividades.map(a => `<option value="${a.id}">${a.titulo}</option>`).join('');
  select.value = atual;
}

function initSelectAtividadeMatriz() {
  document.getElementById('m-atividade-existente').addEventListener('change', e => {
    const a = STATE.atividades.find(x => x.id === e.target.value);
    if (!a) return;
    document.getElementById('m-titulo').value = a.titulo;
    if (a.resultado === 'alto' || a.resultado === 'baixo') setTagValue('m-resultado', a.resultado);
    if (a.obs) document.getElementById('m-obs').value = a.obs;
  });
}

function initFormMatriz() {
  const form = document.getElementById('form-matriz');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = document.getElementById('m-titulo').value.trim();
    if (!titulo) { mostrarToast('Descreva a atividade.', 'error'); return; }

    const resultado = getTagValue('m-resultado');
    const esforco = getTagValue('m-esforco');
    if (!resultado) { mostrarToast('Selecione o nível de resultado.', 'error'); return; }
    if (!esforco) { mostrarToast('Selecione o nível de esforço.', 'error'); return; }

    const dados = { titulo, resultado, esforco, obs: document.getElementById('m-obs').value.trim() };
    const id = document.getElementById('m-id').value;
    try {
      if (id) {
        const atualizado = mapMatriz(await Api.atualizarMatriz(id, dados));
        const idx = STATE.matriz.findIndex(m => m.id === id);
        STATE.matriz[idx] = atualizado;
        mostrarToast('Item atualizado na matriz!');
      } else {
        const criado = mapMatriz(await Api.criarMatriz(dados));
        STATE.matriz.push(criado);
        const q = getQuadrante(resultado, esforco);
        mostrarToast(`Adicionado em "${QUADRANTE_CONFIG[q].titulo}"!`);
      }
      renderMatriz();
      resetFormMatriz();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });

  document.getElementById('btn-cancelar-matriz').addEventListener('click', resetFormMatriz);
}

function resetFormMatriz() {
  document.getElementById('m-id').value = '';
  document.getElementById('form-matriz').reset();
  clearTagGroup('m-resultado');
  clearTagGroup('m-esforco');
  document.getElementById('matriz-form-title').textContent = 'Adicionar à Matriz';
  document.getElementById('btn-cancelar-matriz').style.display = 'none';
}

function editarMatriz(id) {
  const m = STATE.matriz.find(x => x.id === id);
  if (!m) return;
  document.getElementById('m-id').value = m.id;
  document.getElementById('m-titulo').value = m.titulo;
  document.getElementById('m-obs').value = m.obs || '';
  setTagValue('m-resultado', m.resultado);
  setTagValue('m-esforco', m.esforco);
  document.getElementById('matriz-form-title').textContent = 'Editar Item da Matriz';
  document.getElementById('btn-cancelar-matriz').style.display = 'inline-flex';
  irParaSecao('matriz');
  document.querySelector('#section-matriz .form-card').scrollIntoView({ behavior: 'smooth' });
}

async function excluirMatriz(id) {
  if (!confirm('Deseja remover este item da matriz?')) return;
  try {
    await Api.excluirMatriz(id);
    STATE.matriz = STATE.matriz.filter(m => m.id !== id);
    renderMatriz();
    mostrarToast('Item removido da matriz.', 'info');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

// ============================================================
// MÓDULO NOVO — DASHBOARD DE GESTÃO DO TEMPO
// ============================================================

function duracaoMin(item) {
  if (!item.inicio || !item.fim) return 0;
  const [h1, m1] = item.inicio.split(':').map(Number);
  const [h2, m2] = item.fim.split(':').map(Number);
  const d = (h2 * 60 + m2) - (h1 * 60 + m1);
  return d > 0 ? d : 0;
}

function renderTabelaRotina() {
  const data = document.getElementById('rt-data').value || hojeISO();
  const itens = STATE.rotina.filter(r => r.data === data).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const container = document.getElementById('tabela-rotina');

  if (itens.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏱️</div><p>Nenhum horário registrado em ${formatarData(data)} ainda.</p></div>`;
    return;
  }

  container.innerHTML = `
    <table class="tabela-simples">
      <thead><tr><th>Horário</th><th>Atividade</th><th>Tipo</th><th>Impacto</th><th>Energia</th><th></th></tr></thead>
      <tbody>
        ${itens.map(r => {
          const tc = TIPO_CONFIG[r.tipo] || {};
          const impactoIcon = { alto: '🔥', medio: '📊', baixo: '📉' }[r.impacto] || '';
          const energiaIcon = { alta: '⬆️', media: '↔️', baixa: '⬇️' }[r.energia] || '';
          return `<tr>
            <td>${r.inicio}–${r.fim}</td>
            <td>${r.atividade}</td>
            <td><span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label || '—'}</span></td>
            <td>${impactoIcon}</td>
            <td>${energiaIcon}</td>
            <td><button class="btn-icon btn-icon-sm btn-icon-danger" title="Excluir" onclick="excluirRotina('${r.id}')">🗑️</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function initFormRotina() {
  document.getElementById('rt-data').value = hojeISO();
  document.getElementById('rt-data').addEventListener('change', renderTabelaRotina);

  document.getElementById('form-rotina').addEventListener('submit', async e => {
    e.preventDefault();
    const inicio = document.getElementById('rt-inicio').value;
    const fim = document.getElementById('rt-fim').value;
    const atividade = document.getElementById('rt-atividade').value.trim();
    const tipo = getTagValue('rt-tipo');
    if (!inicio || !fim || !atividade) { mostrarToast('Preencha horário de início, fim e a atividade.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione o tipo da atividade.', 'error'); return; }
    if (fim <= inicio) { mostrarToast('O horário de fim deve ser depois do início.', 'error'); return; }

    try {
      const novo = mapRotina(await Api.criarRotina({
        data: document.getElementById('rt-data').value || hojeISO(),
        inicio, fim, atividade, tipo,
        impacto: getTagValue('rt-impacto'),
        energia: getTagValue('rt-energia'),
      }));
      STATE.rotina.push(novo);
      renderDashboardAll();

      document.getElementById('rt-inicio').value = '';
      document.getElementById('rt-fim').value = '';
      document.getElementById('rt-atividade').value = '';
      clearTagGroup('rt-tipo');
      clearTagGroup('rt-impacto');
      clearTagGroup('rt-energia');
      mostrarToast('Registrado na rotina do dia!');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

async function excluirRotina(id) {
  try {
    await Api.excluirRotina(id);
    STATE.rotina = STATE.rotina.filter(r => r.id !== id);
    renderDashboardAll();
    mostrarToast('Registro removido.', 'info');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function distribuicaoRotina() {
  // Pondera pelo tempo (duração em minutos); se não houver duração válida, conta por ocorrência.
  const somaPorTipo = { estrategico: 0, tatico: 0, operacional: 0 };
  let usaDuracao = false;
  STATE.rotina.forEach(r => {
    const d = duracaoMin(r);
    if (d > 0) usaDuracao = true;
    if (somaPorTipo[r.tipo] !== undefined) somaPorTipo[r.tipo] += (d > 0 ? d : (usaDuracao ? 0 : 1));
  });
  const total = somaPorTipo.estrategico + somaPorTipo.tatico + somaPorTipo.operacional;
  return { somaPorTipo, total };
}

function renderGraficoDashAtual() {
  const { somaPorTipo, total } = distribuicaoRotina();
  const labels = ['Operacional', 'Tático', 'Estratégico'];
  const dados = [somaPorTipo.operacional, somaPorTipo.tatico, somaPorTipo.estrategico];
  const cores = [TIPO_CONFIG.operacional.cor, TIPO_CONFIG.tatico.cor, TIPO_CONFIG.estrategico.cor];

  const ctx = document.getElementById('grafico-dash-atual').getContext('2d');
  if (chartDashAtual) chartDashAtual.destroy();
  chartDashAtual = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: dados, backgroundColor: cores, borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '55%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => {
        const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
        return ` ${pct}%`;
      } } } }
    }
  });

  document.getElementById('legenda-dash-atual').innerHTML = labels.map((l, i) => {
    const pct = total > 0 ? Math.round((dados[i] / total) * 100) : 0;
    return `<div class="legenda-item-grafico"><span class="legenda-cor" style="background:${cores[i]}"></span><span class="legenda-nome">${l}</span><span class="legenda-pct">${pct}%</span></div>`;
  }).join('');

  const pctOp = total > 0 ? Math.round((somaPorTipo.operacional / total) * 100) : 0;
  const pctEstr = total > 0 ? Math.round((somaPorTipo.estrategico / total) * 100) : 0;
  const diag = document.getElementById('diagnostico-dash');
  if (total === 0) {
    diag.innerHTML = '💡 Registre sua rotina diária acima para ver o diagnóstico da sua gestão do tempo.';
  } else if (pctOp > 60) {
    diag.innerHTML = `⚠️ A maior parte do seu tempo (${pctOp}%) está sendo consumida com atividades operacionais, restando pouco espaço para o que gera mais resultado e desenvolvimento.`;
  } else if (pctEstr >= 30) {
    diag.innerHTML = `✅ Bom equilíbrio! Você está dedicando ${pctEstr}% do tempo a atividades estratégicas.`;
  } else {
    diag.innerHTML = `💡 Você está com ${pctEstr}% do tempo em atividades estratégicas — tente ampliar esse espaço aos poucos.`;
  }
}

function renderGraficoDashIdeal() {
  const labels = ['Operacional', 'Tático', 'Estratégico'];
  const dados = [STATE.metaIdeal.operacional, STATE.metaIdeal.tatico, STATE.metaIdeal.estrategico];
  const cores = [TIPO_CONFIG.operacional.cor, TIPO_CONFIG.tatico.cor, TIPO_CONFIG.estrategico.cor];

  const ctx = document.getElementById('grafico-dash-ideal').getContext('2d');
  if (chartDashIdeal) chartDashIdeal.destroy();
  chartDashIdeal = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: dados, backgroundColor: cores, borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: true, cutout: '55%', plugins: { legend: { display: false } } }
  });

  const soma = dados[0] + dados[1] + dados[2];
  document.getElementById('ideal-inputs').innerHTML = `
    <div class="ideal-input-row"><span style="color:${TIPO_CONFIG.operacional.cor}">🔧 Operacional</span><input type="number" min="0" max="100" data-ideal="operacional" value="${STATE.metaIdeal.operacional}" /> %</div>
    <div class="ideal-input-row"><span style="color:${TIPO_CONFIG.tatico.cor}">⚙️ Tático</span><input type="number" min="0" max="100" data-ideal="tatico" value="${STATE.metaIdeal.tatico}" /> %</div>
    <div class="ideal-input-row"><span style="color:${TIPO_CONFIG.estrategico.cor}">🏆 Estratégico</span><input type="number" min="0" max="100" data-ideal="estrategico" value="${STATE.metaIdeal.estrategico}" /> %</div>
    <div class="ideal-soma ${soma !== 100 ? 'ideal-soma-alerta' : ''}">Soma: ${soma}%${soma !== 100 ? ' ⚠️ (ideal somar 100%)' : ' ✓'}</div>
  `;
  document.querySelectorAll('[data-ideal]').forEach(input => {
    input.addEventListener('change', async () => {
      STATE.metaIdeal[input.dataset.ideal] = Number(input.value) || 0;
      renderGraficoDashIdeal();
      try {
        await Api.atualizarDashboardConfig({
          idealOperacional: STATE.metaIdeal.operacional,
          idealTatico: STATE.metaIdeal.tatico,
          idealEstrategico: STATE.metaIdeal.estrategico,
        });
      } catch (err) { mostrarToast(err.message, 'error'); }
    });
  });
}

function renderGargalos() {
  const { somaPorTipo, total } = distribuicaoRotina();
  const container = document.getElementById('gargalos-lista');
  const alertas = [];

  if (STATE.rotina.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Registre sua rotina diária para identificar gargalos automaticamente.</p></div>`;
    return;
  }

  const pctOp = total > 0 ? Math.round((somaPorTipo.operacional / total) * 100) : 0;
  if (pctOp > 60) {
    alertas.push({ icon: '📧', titulo: 'Excesso de atividades operacionais', texto: `${pctOp}% do tempo registrado está em atividades operacionais de baixo impacto.` });
  }

  const totalRegistros = STATE.rotina.length;
  const baixaEnergia = STATE.rotina.filter(r => r.energia === 'baixa').length;
  if (totalRegistros >= 4 && baixaEnergia / totalRegistros > 0.5) {
    alertas.push({ icon: '🔋', titulo: 'Energia baixa predominante', texto: `${baixaEnergia} de ${totalRegistros} registros foram marcados com energia baixa — revise pausas e a ordem das atividades no dia.` });
  }

  const opBaixoImpacto = STATE.rotina.filter(r => r.tipo === 'operacional' && r.impacto === 'baixo').length;
  if (opBaixoImpacto >= 3) {
    alertas.push({ icon: '🔄', titulo: 'Retrabalho / baixo impacto', texto: `${opBaixoImpacto} atividades operacionais de baixo impacto registradas — bons candidatos a delegar, padronizar ou eliminar.` });
  }

  if (alertas.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Nenhum gargalo crítico identificado com os registros atuais. Continue registrando para manter o diagnóstico atualizado.</p></div>`;
    return;
  }

  container.innerHTML = alertas.map(a => `
    <div class="gargalo-item">
      <span class="gargalo-icon">${a.icon}</span>
      <div><div class="gargalo-titulo">${a.titulo}</div><div class="gargalo-texto">${a.texto}</div></div>
    </div>
  `).join('');
}

function renderPlanoAcao() {
  const container = document.getElementById('tabela-plano-acao');
  if (STATE.planoAcao.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Nenhuma ação cadastrada.</p></div>`;
    return;
  }
  container.innerHTML = `
    <table class="tabela-simples tabela-plano">
      <thead><tr><th>Ação</th><th>Como fazer</th><th>Impacto esperado</th><th>Prazo</th><th></th></tr></thead>
      <tbody>
        ${STATE.planoAcao.map(p => `
          <tr data-id="${p.id}">
            <td><input type="text" data-campo="acao" value="${p.acao || ''}" /></td>
            <td><input type="text" data-campo="comoFazer" value="${p.comoFazer || ''}" /></td>
            <td><input type="text" data-campo="impacto" value="${p.impacto || ''}" /></td>
            <td><input type="text" data-campo="prazo" value="${p.prazo || ''}" /></td>
            <td><button class="btn-icon btn-icon-sm btn-icon-danger" title="Remover" onclick="excluirLinhaPlanoAcao('${p.id}')">🗑️</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  container.querySelectorAll('input[data-campo]').forEach(input => {
    input.addEventListener('change', async () => {
      const id = input.closest('tr').dataset.id;
      const item = STATE.planoAcao.find(p => p.id === id);
      if (!item) return;
      item[input.dataset.campo] = input.value;
      try {
        await Api.atualizarPlanoAcao(id, { acao: item.acao, comoFazer: item.comoFazer, impacto: item.impacto, prazo: item.prazo });
      } catch (err) { mostrarToast(err.message, 'error'); }
    });
  });
}

async function excluirLinhaPlanoAcao(id) {
  try {
    await Api.excluirPlanoAcao(id);
    STATE.planoAcao = STATE.planoAcao.filter(p => p.id !== id);
    renderPlanoAcao();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function initPlanoAcao() {
  document.getElementById('btn-add-plano-acao').addEventListener('click', async () => {
    try {
      const novo = mapPlanoAcao(await Api.criarPlanoAcao({ acao: '', comoFazer: '', impacto: '', prazo: '', ordem: STATE.planoAcao.length }));
      STATE.planoAcao.push(novo);
      renderPlanoAcao();
    } catch (err) { mostrarToast(err.message, 'error'); }
  });
}

function renderDashboardAll() {
  renderTabelaRotina();
  renderGraficoDashAtual();
  renderGraficoDashIdeal();
  renderGargalos();
  renderPlanoAcao();
}

// ============================================================
// REUNIÕES & FEEDBACKS (estatísticas do Diário de Bordo)
// ============================================================
async function carregarEstatisticasDiario() {
  try {
    STATE.estatisticasDiario = await Api.estatisticasDiario();
  } catch (err) {
    STATE.estatisticasDiario = null;
  }
  renderReunioesStats();
}

function renderReunioesStats() {
  const e = STATE.estatisticasDiario;
  document.getElementById('reun-7dias').textContent = e ? e.ultimos7Dias : '—';
  document.getElementById('reun-30dias').textContent = e ? e.ultimos30Dias : '—';
  document.getElementById('reun-ano').textContent = e ? e.acumuladoAno : '—';

  const banner = document.getElementById('dias-sem-reuniao-banner');
  if (!e || e.diasSemReuniao === null) {
    banner.innerHTML = '💡 Registre uma conversa no Diário de Bordo pra começar a acompanhar sua frequência com o time.';
  } else if (e.diasSemReuniao === 0) {
    banner.innerHTML = '✅ Você registrou uma conversa com o time hoje.';
  } else if (e.diasSemReuniao <= 7) {
    banner.innerHTML = `💡 Já são <strong>${e.diasSemReuniao} dia${e.diasSemReuniao !== 1 ? 's' : ''}</strong> sem registrar uma conversa com o time.`;
  } else {
    banner.innerHTML = `⚠️ Já são <strong>${e.diasSemReuniao} dias</strong> sem registrar uma conversa com o time — pode ser hora de agendar um 1:1.`;
  }

  const lista = document.getElementById('ranking-conversas-lista');
  if (!e || e.porLiderado.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Cadastre liderados pra acompanhar aqui.</p></div>`;
    return;
  }
  const max = Math.max(1, ...e.porLiderado.map(p => p.total));
  lista.innerHTML = e.porLiderado.map(p => `
    <div class="ranking-item">
      <span class="ranking-nome">${p.nome}</span>
      <div class="ranking-barra"><div class="ranking-barra-fill" style="width:${(p.total / max) * 100}%"></div></div>
      <span class="ranking-total ${p.total === 0 ? 'zero' : ''}">${p.total === 0 ? 'Nenhuma ainda' : p.total + ' conversa' + (p.total !== 1 ? 's' : '')}</span>
    </div>
  `).join('');
}

// ============================================================
// AUTOAVALIAÇÃO MENSAL + ANÁLISE DE MELHORIA
// ============================================================
function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todosItensAutoavaliacao() {
  return [...ERROS_PLANEJAMENTO_ITENS, ...CHECKLIST_LIDER_ITENS];
}

function renderAutoavaliacaoItens() {
  document.getElementById('autoavaliacao-itens').innerHTML = todosItensAutoavaliacao().map(it => `
    <div class="autoavaliacao-item">
      <span class="autoavaliacao-texto">${it.texto}</span>
      <div class="btn-group">
        <button type="button" class="tag-btn" data-group="aa-${it.id}" data-value="sim">Sim</button>
        <button type="button" class="tag-btn" data-group="aa-${it.id}" data-value="nao">Não</button>
      </div>
    </div>
  `).join('');
}

function preencherRespostasAutoavaliacao(respostas) {
  todosItensAutoavaliacao().forEach(it => {
    const v = respostas[it.id];
    setTagValue('aa-' + it.id, v === true ? 'sim' : v === false ? 'nao' : '');
  });
}

function lerRespostasAutoavaliacao() {
  const respostas = {};
  todosItensAutoavaliacao().forEach(it => {
    const v = getTagValue('aa-' + it.id);
    if (v) respostas[it.id] = v === 'sim';
  });
  return respostas;
}

async function carregarAutoavaliacaoDoMes() {
  const mes = document.getElementById('aa-mes').value || mesAtualISO();
  try {
    const dados = await Api.obterAutoavaliacao(mes);
    preencherRespostasAutoavaliacao(dados.respostas || {});
  } catch (err) {
    preencherRespostasAutoavaliacao({});
  }
}

let autoavaliacaoSalvarTimeout = null;
function agendarSalvarAutoavaliacao() {
  clearTimeout(autoavaliacaoSalvarTimeout);
  autoavaliacaoSalvarTimeout = setTimeout(async () => {
    const mes = document.getElementById('aa-mes').value || mesAtualISO();
    try {
      await Api.salvarAutoavaliacao(mes, lerRespostasAutoavaliacao());
    } catch (err) { mostrarToast(err.message, 'error'); }
  }, 400);
}

function initAutoavaliacao() {
  renderAutoavaliacaoItens();
  document.getElementById('aa-mes').value = mesAtualISO();
  document.getElementById('aa-mes').addEventListener('change', carregarAutoavaliacaoDoMes);
  document.getElementById('autoavaliacao-itens').addEventListener('click', e => {
    if (e.target.closest('.tag-btn')) agendarSalvarAutoavaliacao();
  });
  document.getElementById('btn-gerar-analise').addEventListener('click', gerarAnaliseMelhoria);

  document.getElementById('modal-analise-close').addEventListener('click', fecharModalAnalise);
  document.getElementById('modal-overlay-analise').addEventListener('click', fecharModalAnalise);
  document.getElementById('modal-analise-fechar').addEventListener('click', fecharModalAnalise);
  document.getElementById('modal-analise-imprimir').addEventListener('click', () => window.print());
}

function fecharModalAnalise() {
  document.getElementById('modal-analise').style.display = 'none';
}

async function gerarAnaliseMelhoria() {
  const mes = document.getElementById('aa-mes').value || mesAtualISO();
  const respostas = lerRespostasAutoavaliacao();

  const pontosAtencao = [];
  const pontosPositivos = [];

  ERROS_PLANEJAMENTO_ITENS.forEach(it => {
    if (respostas[it.id] === true) pontosAtencao.push({ texto: it.texto, dica: DICAS_MELHORIA[it.id] });
    else if (respostas[it.id] === false) pontosPositivos.push(`Não tem caído nisso: "${it.texto}"`);
  });
  CHECKLIST_LIDER_ITENS.forEach(it => {
    if (respostas[it.id] === false) pontosAtencao.push({ texto: it.texto, dica: DICAS_MELHORIA[it.id] });
    else if (respostas[it.id] === true) pontosPositivos.push(it.texto);
  });

  let estat = null;
  try { estat = await Api.estatisticasDiario(); } catch (err) { /* segue sem essa parte */ }

  const [ano, mesNum] = mes.split('-');
  const mesLabel = new Date(Number(ano), Number(mesNum) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const html = `
    <div class="resumo-cabecalho">
      <h2>Análise de Melhoria — ${mesLabel}</h2>
      <p class="resumo-periodo-label">Gerado em ${formatarData(hojeISO())}</p>
    </div>

    ${estat ? `
    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">📅 Como anda sua conexão com o time</div>
      <p>${estat.ultimos30Dias} conversa(s)/feedback(s) nos últimos 30 dias · ${estat.acumuladoAno} no acumulado do ano.</p>
      <p>${estat.diasSemReuniao === null ? 'Você ainda não registrou nenhuma conversa com o time — comece pelo Diário de Bordo.' : estat.diasSemReuniao === 0 ? 'Você registrou uma conversa com o time hoje. 👏' : `Já são <strong>${estat.diasSemReuniao} dia${estat.diasSemReuniao !== 1 ? 's' : ''}</strong> sem registrar uma conversa com o time.`}</p>
    </div>` : ''}

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">⚠️ Pontos de atenção (${pontosAtencao.length})</div>
      ${pontosAtencao.length === 0
        ? '<p>Nenhum ponto de atenção identificado nas respostas deste mês. 🎉</p>'
        : pontosAtencao.map(p => `<div class="analise-item"><span class="analise-item-icon">💡</span><div><strong>${p.texto}</strong><br>${p.dica}</div></div>`).join('')}
    </div>

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">✅ Pontos fortes (${pontosPositivos.length})</div>
      ${pontosPositivos.length === 0
        ? '<p>Responda a autoavaliação do mês pra ver seus pontos fortes aqui.</p>'
        : pontosPositivos.map(t => `<div class="analise-item positivo"><span class="analise-item-icon">✅</span><div>${t}</div></div>`).join('')}
    </div>
  `;

  document.getElementById('modal-analise-body').innerHTML = html;
  document.getElementById('modal-analise').style.display = 'flex';
}

// ============================================================
// RENDERIZAÇÃO GERAL / INICIALIZAÇÃO
// ============================================================
function renderTudo() {
  renderLiderados();
  renderDiarioSeletor();
  renderDiarioConteudo();
  renderAtividades();
  renderMetas();
  renderMatriz();
  renderDashboardAll();
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavegacao();
  initTagButtons();
  initTagButtonsMulti();
  initSidebarToggle();
  initTelaAuth();

  // Liderados
  initFormLiderado();
  initModalLiderado();

  // Diário de Bordo
  initFormConhecer();
  initFormRegistroDiario();
  initResumoFeedback();

  // Atividades / Kanban
  initFormAtividade();
  initFiltrosAtividades();
  initModalAtividade();
  initSubtabs();
  initKanbanDrop();

  // Metas
  initFormMeta();

  // Matriz
  initFormMatriz();
  initSelectAtividadeMatriz();

  // Dashboard
  initFormRotina();
  initPlanoAcao();
  initAutoavaliacao();

  carregarAuth();
  if (AUTH.token && AUTH.user) {
    await entrarNaSessao();
  } else {
    mostrarTela('auth');
  }
});
