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
  projetos: [],
  estatisticasDiario: null,
  arquivos: [],        // arquivos da aula que o líder subiu
  arquivosTurma: [],   // (visão do liderado) arquivos disponibilizados pelo seu líder
  mensagensIndividuais: [],  // (visão do líder) mensagens que o Trainer mandou só pra ele
  arquivosIndividuais: [],   // (visão do líder) arquivos que o Trainer mandou só pra ele
  desafios: [],        // trilha de passo a passo da turma do líder, com o progresso dele
  planoGestao: null,   // Passo 1 — Criação do Plano (visão, metas do ano, combinados)
  diagnostico: [],     // brainstorm de Desafios e Oportunidades da equipe/área
  filtroResultado: 'todos',
  filtroTipo: 'todos',
  filtroResponsavel: 'todos',
  filtroMatrizResponsavel: 'todos',
  filtroMeta: 'todos',
  lideradoSelecionado: null,
  // Visão do liderado (papel "liderado")
  meuPerfil: null,
  minhasAtividades: [],
  minhasMetas: [],
  meusFeedbacks: [],
  // Visão do administrador (papel "admin")
  turmas: [],
  turmaSelecionadaId: null,
  turmaLideres: [],
  turmaDesafios: [],   // trilha (template) da turma selecionada, sem progresso individual
  turmaArquivos: [],   // arquivos da aula da turma selecionada
  lideresSemTurma: [],
  areaIndividualLiderId: null,   // qual líder está com o painel de Área Individual aberto (um por vez)
  areaIndividualMensagens: [],
  areaIndividualArquivos: [],
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

// Contraponto positivo da checagem de riscos — mesmo padrão de múltipla
// escolha, só que pra registrar o que está indo bem.
const EVOLUCAO_LABELS = {
  superou_expectativa: '🌟 Superou a expectativa',
  iniciativa: '🚀 Iniciativa',
  inovacao: '💡 Inovação',
};

// Feedback formal — 3 ferramentas do material de aula, cada uma com seus
// próprios campos (ver diario_registros no schema.sql).
const FERRAMENTAS_FEEDBACK_LABELS = {
  sanduiche: '🥪 Sanduíche',
  feedforward: '🔄 Feedforward (+ e Delta)',
  comece_pare_continue: '🚦 Comece, Pare e Continue',
};

// Seed do Plano de Ação padrão de um líder novo: agora fica no backend (ver
// PLANO_ACAO_PADRAO em src/routes/admin.js), aplicado quando o admin cadastra
// o líder — antes disso, era feito daqui mesmo, no frontend, na hora que o
// próprio líder se autocadastrava.

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

// "Visualizar como" (admin): guarda a sessão do admin de lado (sobrevive a
// um F5 sem perder o caminho de volta) e entra com o token somenteLeitura do
// líder escolhido — reaproveita entrarNaSessao() inteiro, então a tela do
// líder carrega normal, só que travada pra edição (ver ativarModoSomenteLeitura).
function entrarModoVisualizacao(token, user) {
  localStorage.setItem('pl_admin_stash', JSON.stringify({ token: AUTH.token, user: AUTH.user }));
  salvarAuth(token, user);
}

async function sairModoVisualizacao() {
  const bruto = localStorage.getItem('pl_admin_stash');
  localStorage.removeItem('pl_admin_stash');
  if (!bruto) { sair(); return; }
  try {
    const stash = JSON.parse(bruto);
    salvarAuth(stash.token, stash.user);
    await entrarNaSessao();
  } catch (e) { sair(); }
}

// Trava toda a edição do painel do líder por cima do bloqueio que já existe
// no backend (ver requireAuth) — evita que o admin clique em algo, tente
// salvar e só descubra pelo erro 403 que aquilo não ia funcionar mesmo.
// bloquear=false desfaz tudo — chamado sempre que um líder de verdade loga
// nesse mesmo navegador depois, pra garantir que nada fica travado por engano.
function aplicarBloqueioEdicao(bloquear) {
  document.querySelectorAll('#app-shell .main-content input, #app-shell .main-content select, #app-shell .main-content textarea').forEach(el => {
    el.disabled = bloquear;
  });
  document.querySelectorAll('#app-shell .main-content button').forEach(btn => {
    if (btn.classList.contains('subtab-btn') || btn.classList.contains('btn-baixar-arquivo')) return;
    btn.disabled = bloquear;
  });
  document.querySelectorAll('#app-shell .main-content [draggable="true"]').forEach(el => el.removeAttribute('draggable'));
}

function ativarModoSomenteLeitura(nomeLider) {
  document.getElementById('faixa-modo-visualizacao-nome').textContent = nomeLider || '';
  document.getElementById('faixa-modo-visualizacao').style.display = '';
  aplicarBloqueioEdicao(true);
}

function desativarModoSomenteLeitura() {
  document.getElementById('faixa-modo-visualizacao').style.display = 'none';
  aplicarBloqueioEdicao(false);
}

// Chamado pelo botão 👁️ na lista de líderes do admin.
async function visualizarLider(id, nome, botao) {
  const restaurar = iniciarCarregamentoBotao(botao, '');
  try {
    const resp = await Api.visualizarLider(id);
    entrarModoVisualizacao(resp.token, resp.user);
    await entrarNaSessao();
  } catch (err) {
    mostrarToast(err.message, 'error');
    restaurar();
  }
}

// Chamado pelo botão 📧 — não dá pra reenviar a MESMA senha (só o hash é
// guardado), então o backend gera uma nova e já atualiza o acesso. Se o
// e-mail não sair (não configurado ou falha do Resend), mostra a senha nova
// num alert pra o admin ter tempo de copiar e repassar por outro canal —
// um toast de 3s sumiria rápido demais pra isso.
async function reenviarConviteLider(id, nome, botao) {
  const restaurar = iniciarCarregamentoBotao(botao, '');
  try {
    const resp = await Api.reenviarConviteLider(id);
    if (resp.enviado) {
      mostrarToast(`Convite reenviado para ${nome}!`);
    } else {
      alert(`Não foi possível enviar o e-mail para ${nome}.\n\nUma nova senha foi gerada — repasse manualmente:\n\n${resp.senha}`);
    }
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    restaurar();
  }
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
  login: (email, senha, contaId) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha, contaId }) }),
  minhasContas: () => api('/auth/minhas-contas'),
  trocarConta: contaId => api('/auth/trocar-conta', { method: 'POST', body: JSON.stringify({ contaId }) }),

  listarTurmas: () => api('/admin/turmas'),
  criarTurma: nome => api('/admin/turmas', { method: 'POST', body: JSON.stringify({ nome }) }),
  atualizarTurma: (id, nome) => api(`/admin/turmas/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) }),
  excluirTurma: id => api(`/admin/turmas/${id}`, { method: 'DELETE' }),
  listarTodosLideres: () => api('/admin/lideres'),
  listarLideresDaTurma: turmaId => api(`/admin/turmas/${turmaId}/lideres`),
  criarLiderNaTurma: (turmaId, dados) => api(`/admin/turmas/${turmaId}/lideres`, { method: 'POST', body: JSON.stringify(dados) }),
  moverLiderDeTurma: (liderId, turmaId) => api(`/admin/lideres/${liderId}`, { method: 'PUT', body: JSON.stringify({ turmaId }) }),
  redefinirSenhaLider: (liderId, senha) => api(`/admin/lideres/${liderId}/senha`, { method: 'PUT', body: JSON.stringify({ senha }) }),
  reenviarConviteLider: liderId => api(`/admin/lideres/${liderId}/reenviar-convite`, { method: 'POST' }),
  visualizarLider: liderId => api(`/admin/lideres/${liderId}/visualizar`, { method: 'POST' }),
  listarDesafiosDaTurma: turmaId => api(`/admin/turmas/${turmaId}/desafios`),
  criarDesafioAdmin: (turmaId, dados) => api(`/admin/turmas/${turmaId}/desafios`, { method: 'POST', body: JSON.stringify(dados) }),
  atualizarDesafioAdmin: (id, dados) => api(`/admin/desafios/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirDesafioAdmin: id => api(`/admin/desafios/${id}`, { method: 'DELETE' }),

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

  listarProjetos: () => api('/projetos'),
  criarProjeto: dados => api('/projetos', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarProjeto: (id, dados) => api('/projetos/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirProjeto: id => api('/projetos/' + id, { method: 'DELETE' }),

  getDashboardConfig: () => api('/dashboard-config'),
  atualizarDashboardConfig: dados => api('/dashboard-config', { method: 'PUT', body: JSON.stringify(dados) }),

  estatisticasDiario: () => api('/diario/estatisticas'),

  obterAutoavaliacao: mesRef => api('/autoavaliacoes/' + mesRef),
  salvarAutoavaliacao: (mesRef, respostas) => api('/autoavaliacoes/' + mesRef, { method: 'PUT', body: JSON.stringify({ respostas }) }),

  listarDesafios: () => api('/desafios'),
  criarDesafio: dados => api('/desafios', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarDesafio: (id, dados) => api('/desafios/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirDesafio: id => api('/desafios/' + id, { method: 'DELETE' }),

  getPlanoGestao: () => api('/plano-gestao'),
  salvarPlanoGestao: dados => api('/plano-gestao', { method: 'PUT', body: JSON.stringify(dados) }),

  listarDiagnostico: () => api('/diagnostico'),
  criarDiagnostico: dados => api('/diagnostico', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarDiagnostico: (id, dados) => api('/diagnostico/' + id, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirDiagnostico: id => api('/diagnostico/' + id, { method: 'DELETE' }),

  // Upload/edição/exclusão de arquivos agora são só do administrador, por
  // turma — líder e liderado só listam e baixam os da turma do seu líder.
  listarArquivos: () => api('/arquivos'),
  listarArquivosTurma: () => api('/arquivos/minha-turma'),
  listarArquivosDaTurma: turmaId => api(`/admin/turmas/${turmaId}/arquivos`),
  atualizarArquivoAdmin: (id, dados) => api(`/admin/arquivos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirArquivoDaTurma: (turmaId, id) => api(`/admin/turmas/${turmaId}/arquivos/${id}`, { method: 'DELETE' }),
  vincularArquivoATurma: (id, turmaId) => api(`/admin/arquivos/${id}/vincular`, { method: 'POST', body: JSON.stringify({ turmaId }) }),
  vincularPastaATurma: (turmaId, pasta, turmaDestinoId) => api(`/admin/turmas/${turmaId}/pastas/vincular`, { method: 'POST', body: JSON.stringify({ pasta: pasta || null, turmaDestinoId }) }),
  transferirPastaATurma: (turmaId, pasta, turmaDestinoId) => api(`/admin/turmas/${turmaId}/pastas/transferir`, { method: 'POST', body: JSON.stringify({ pasta: pasta || null, turmaDestinoId }) }),
  // Upload é multipart — não passa pelo helper api() (que sempre manda Content-Type: application/json).
  enviarArquivoNaTurma: async (turmaId, formData) => {
    const res = await fetch(API_BASE + `/admin/turmas/${turmaId}/arquivos`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + AUTH.token },
      body: formData,
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) throw new Error((corpo && corpo.erro) || `Erro ${res.status}.`);
    return corpo;
  },

  // Área Individual (Trainer → um líder específico): mensagens e arquivos
  // que não aparecem em Arquivos da Aula, só na conta daquele líder.
  listarMensagensIndividuais: liderId => api(`/admin/lideres/${liderId}/mensagens`),
  criarMensagemIndividual: (liderId, dados) => api(`/admin/lideres/${liderId}/mensagens`, { method: 'POST', body: JSON.stringify(dados) }),
  atualizarMensagemIndividual: (id, dados) => api(`/admin/mensagens/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirMensagemIndividual: id => api(`/admin/mensagens/${id}`, { method: 'DELETE' }),
  listarArquivosIndividuaisAdmin: liderId => api(`/admin/lideres/${liderId}/arquivos-individuais`),
  excluirArquivoIndividualAdmin: (liderId, id) => api(`/admin/lideres/${liderId}/arquivos-individuais/${id}`, { method: 'DELETE' }),
  enviarArquivoIndividual: async (liderId, formData) => {
    const res = await fetch(API_BASE + `/admin/lideres/${liderId}/arquivos-individuais`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + AUTH.token },
      body: formData,
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) throw new Error((corpo && corpo.erro) || `Erro ${res.status}.`);
    return corpo;
  },
  // Visão do líder: o que o Trainer mandou só pra ele.
  listarMensagensRecebidas: () => api('/individual/mensagens'),
  marcarMensagemLida: id => api(`/individual/mensagens/${id}/lida`, { method: 'PUT' }),
  listarArquivosIndividuaisRecebidos: () => api('/individual/arquivos'),
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
    metaId: a.meta_id || '', tipoVinculo: a.tipo_vinculo || '', planoAcaoId: a.plano_acao_id || '',
    obs: a.obs || '', criadoEm: a.criado_em,
  };
}
function mapMeta(m) {
  return {
    id: m.id, nome: m.nome, tipo: m.tipo, indicador: m.indicador || '', valor: m.valor || '',
    prazo: m.prazo ? String(m.prazo).slice(0, 10) : '', descricao: m.descricao || '',
    criadoEm: m.criado_em,
    // Painel do Líder — Direção/Objetivo, Meta e Medição completa, Mini-BSC, OKR e Execução.
    porqueImporta: m.porque_importa || '', pontoPartida: m.ponto_partida || '',
    frequenciaAcompanhamento: m.frequencia_acompanhamento || '', perspectivaBsc: m.perspectiva_bsc || '',
    okrObjetivo: m.okr_objetivo || '', okrKr1: m.okr_kr1 || '', okrKr2: m.okr_kr2 || '', okrKr3: m.okr_kr3 || '',
    acaoPrioritaria: m.acao_prioritaria || '', responsavelAcao: m.responsavel_acao || '',
    evidenciaConclusao: m.evidencia_conclusao || '', proximaVerificacao: m.proxima_verificacao ? String(m.proxima_verificacao).slice(0, 10) : '',
    statusExecucao: m.status_execucao || 'no_prazo',
    _totalAtividades: m.total_atividades !== undefined ? Number(m.total_atividades) : undefined,
    _atividadesConcluidas: m.atividades_concluidas !== undefined ? Number(m.atividades_concluidas) : undefined,
  };
}
function mapMatriz(m) {
  return {
    id: m.id, titulo: m.titulo, resultado: m.resultado, esforco: m.esforco, obs: m.obs || '', criadoEm: m.criado_em,
    responsavelId: m.responsavel_eu ? 'eu' : (m.responsavel_id || ''),
  };
}
function mapRotina(r) {
  return { id: r.id, data: String(r.data).slice(0, 10), inicio: r.inicio.slice(0, 5), fim: r.fim.slice(0, 5), atividade: r.atividade, tipo: r.tipo, impacto: r.impacto || '', energia: r.energia || '', criadoEm: r.criado_em };
}
function mapDiario(d) {
  return {
    id: d.id, lideradoId: d.liderado_id, tipo: d.tipo, data: String(d.data).slice(0, 10),
    riscos: d.riscos || [], evolucao: d.evolucao || [],
    sinais: d.sinais || '', conversa: d.conversa || '', plano: d.plano || '', criadoEm: d.criado_em,
    ferramentaFeedback: d.ferramenta_feedback || '',
    fbSanduichePositivo1: d.fb_sanduiche_positivo1 || '', fbSanduicheMelhoria: d.fb_sanduiche_melhoria || '', fbSanduichePositivo2: d.fb_sanduiche_positivo2 || '',
    fbFeedforwardMais: d.fb_feedforward_mais || '', fbFeedforwardDelta: d.fb_feedforward_delta || '',
    fbCpcComece: d.fb_cpc_comece || '', fbCpcPare: d.fb_cpc_pare || '', fbCpcContinue: d.fb_cpc_continue || '',
  };
}
// Plano de Ação é uma lista independente de itens de ação (Passo 5, item 2
// do material) — não é mais "puxada" dos Projetos/Iniciativas: cada item
// tem seu próprio nome (acao), responsável, meta, datas, status e lições.
function mapPlanoAcao(p) {
  return {
    id: p.id, acao: p.acao || '',
    responsavelId: p.responsavel_eu ? 'eu' : (p.responsavel_id || ''),
    metaId: p.meta_id || '',
    dataInicio: p.data_inicio ? String(p.data_inicio).slice(0, 10) : '',
    dataFim: p.data_fim ? String(p.data_fim).slice(0, 10) : '',
    status: p.status || 'novo',
    licoesAprendidas: p.licoes_aprendidas || '',
  };
}

// Projetos/Iniciativas segue o modelo "Estrutura de Acompanhamento de
// Projetos e Iniciativas" do material impresso: nome, objetivo, responsável,
// prazo, impedimentos, status, resultado esperado.
function mapProjeto(p) {
  return {
    id: p.id, nome: p.nome || '', objetivo: p.objetivo || '',
    responsavelId: p.responsavel_eu ? 'eu' : (p.responsavel_id || ''),
    prazo: p.prazo ? String(p.prazo).slice(0, 10) : '',
    impedimentos: p.impedimentos || '', status: p.status || 'novo',
    resultadoEsperado: p.resultado_esperado || '',
  };
}
function mapDesafio(d) {
  return {
    id: d.id, titulo: d.titulo, descricao: d.descricao || '', secaoAlvo: d.secao_alvo || '',
    prazo: d.prazo ? String(d.prazo).slice(0, 10) : '', pontos: Number(d.pontos) || 0,
    concluido: !!d.concluido, concluidoEm: d.concluido_em ? String(d.concluido_em).slice(0, 10) : '',
    ordem: Number(d.ordem) || 0,
  };
}
// Um desafio concluído no prazo vale os pontos; concluído depois do prazo vale 0
// (mas continua contando como concluído na trilha — só não pontua).
function desafioNoPrazo(d) {
  if (!d.concluido) return null;
  if (!d.prazo || !d.concluidoEm) return true;
  return d.concluidoEm <= d.prazo;
}
function pontosDoDesafio(d) {
  if (!d.concluido) return 0;
  return desafioNoPrazo(d) ? d.pontos : 0;
}
function calcularPontuacaoDesafios() {
  const pontosPossiveis = STATE.desafios.reduce((soma, d) => soma + (d.pontos || 0), 0);
  const pontosGanhos = STATE.desafios.reduce((soma, d) => soma + pontosDoDesafio(d), 0);
  return { pontosGanhos, pontosPossiveis };
}
function mapPlanoGestao(p) {
  return {
    expectativasAno: p.expectativas_ano || '', pontosFortesEquipe: p.pontos_fortes_equipe || '',
    visaoMissao: p.visao_missao || '', metaDesempenho: p.meta_desempenho || '',
    metaProcessos: p.meta_processos || '', lemaDoAno: p.lema_do_ano || '', combinados: p.combinados || '',
    deOndeViemos: p.de_onde_viemos || '', comoNosGuiamos: p.como_nos_guiamos || '',
    paraQuemValor: p.para_quem_valor || '', oQueDaPoder: p.o_que_da_poder || '', paraOndeVamos: p.para_onde_vamos || '',
  };
}
function mapDiagnostico(d) {
  return { id: d.id, tipo: d.tipo, texto: d.texto, ordem: Number(d.ordem) || 0 };
}
function mapFeedback(f) {
  return {
    id: f.id, data: String(f.data).slice(0, 10), conversa: f.conversa || '', plano: f.plano || '', criadoEm: f.criado_em,
    ferramentaFeedback: f.ferramenta_feedback || '',
    fbSanduichePositivo1: f.fb_sanduiche_positivo1 || '', fbSanduicheMelhoria: f.fb_sanduiche_melhoria || '', fbSanduichePositivo2: f.fb_sanduiche_positivo2 || '',
    fbFeedforwardMais: f.fb_feedforward_mais || '', fbFeedforwardDelta: f.fb_feedforward_delta || '',
    fbCpcComece: f.fb_cpc_comece || '', fbCpcPare: f.fb_cpc_pare || '', fbCpcContinue: f.fb_cpc_continue || '',
  };
}
function mapArquivo(a) {
  return { id: a.id, nome: a.nome, descricao: a.descricao || '', pasta: a.pasta || '', tipoMime: a.tipo_mime, tamanhoBytes: Number(a.tamanho_bytes), criadoEm: a.criado_em };
}
function mapMensagemIndividual(m) {
  return { id: m.id, titulo: m.titulo, mensagem: m.mensagem, lida: !!m.lida, criadoEm: m.criado_em };
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

function formatarTamanho(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function iconeArquivo(tipoMime) {
  if (!tipoMime) return '📄';
  if (tipoMime.includes('pdf')) return '📕';
  if (tipoMime.includes('presentation') || tipoMime.includes('powerpoint')) return '📊';
  if (tipoMime.includes('sheet') || tipoMime.includes('excel')) return '📗';
  if (tipoMime.includes('word') || tipoMime.includes('document')) return '📘';
  if (tipoMime.startsWith('image/')) return '🖼️';
  if (tipoMime.startsWith('video/')) return '🎬';
  if (tipoMime.startsWith('audio/')) return '🎧';
  if (tipoMime.includes('zip') || tipoMime.includes('compressed')) return '🗜️';
  return '📄';
}

// Baixa o arquivo via fetch (pra levar o Authorization) e dispara o download
// como se fosse um link normal — usado tanto no líder quanto no liderado.
// Arquivos grandes demoram pra vir do servidor, então o botão troca pra um
// spinner nesse meio tempo (mesmo padrão de iniciarCarregamentoBotao),
// evitando a impressão de que o clique não fez nada.
async function baixarArquivo(id, nome, botao, base = '/arquivos') {
  const restaurar = botao ? iniciarCarregamentoBotao(botao, 'Baixando...') : () => {};
  try {
    const res = await fetch(API_BASE + base + '/' + id + '/download', {
      headers: { Authorization: 'Bearer ' + AUTH.token },
    });
    if (!res.ok) {
      const corpo = await res.json().catch(() => null);
      throw new Error((corpo && corpo.erro) || `Não foi possível baixar o arquivo (erro ${res.status}).`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    restaurar();
  }
}

function mostrarToast(msg, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${tipo}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Trava o botão e mostra um "girando" enquanto a chamada à API está em andamento
// (a rede — e às vezes o servidor gratuito acordando — pode levar alguns segundos).
// Uso: const restaurar = iniciarCarregamentoBotao(botao, 'Salvando...'); try {...} finally { restaurar(); }
function iniciarCarregamentoBotao(botao, textoTemporario) {
  if (!botao) return () => {};
  const original = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = `<span class="spinner-inline"></span> ${textoTemporario}`;
  return () => {
    botao.disabled = false;
    botao.innerHTML = original;
  };
}

// ============================================================
// TELAS — auth / carregando / líder / liderado
// ============================================================
function mostrarTela(nome) {
  document.getElementById('tela-carregando').style.display = nome === 'carregando' ? '' : 'none';
  document.getElementById('tela-auth').style.display = nome === 'auth' ? '' : 'none';
  document.getElementById('app-shell').style.display = nome === 'lider' ? '' : 'none';
  document.getElementById('app-liderado').style.display = nome === 'liderado' ? '' : 'none';
  document.getElementById('app-admin').style.display = nome === 'admin' ? '' : 'none';
  document.getElementById('btn-sidebar-toggle').style.display = nome === 'lider' ? '' : 'none';
  document.body.classList.remove('sidebar-open');
}

function initTelaAuth() {
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('lg-email').value.trim();
    const senha = document.getElementById('lg-senha').value;
    await tentarAuth(document.querySelector('#form-login button[type=submit]'), () => Api.login(email, senha));
  });

  document.getElementById('btn-lg-confirmar-conta').addEventListener('click', async () => {
    const contaId = document.getElementById('lg-conta-select').value;
    const { email, senha } = STATE.loginPendente || {};
    if (!contaId || !email) return;
    await tentarAuth(document.getElementById('btn-lg-confirmar-conta'), () => Api.login(email, senha, contaId));
  });

  document.getElementById('btn-lg-voltar').addEventListener('click', () => {
    document.getElementById('auth-escolha-conta').style.display = 'none';
    document.getElementById('form-login').style.display = '';
    STATE.loginPendente = null;
  });

  document.getElementById('btn-sair').addEventListener('click', sair);
  document.getElementById('btn-sair-liderado').addEventListener('click', sair);
  document.getElementById('btn-sair-admin').addEventListener('click', sair);
  document.getElementById('btn-sair-modo-visualizacao').addEventListener('click', sairModoVisualizacao);

  document.getElementById('lider-conta-trocar').addEventListener('change', e => trocarParaConta(e.target.value));
  document.getElementById('admin-conta-trocar').addEventListener('change', e => trocarParaConta(e.target.value));
}

const ROTULO_ROLE_CONTA = { admin: 'Administrador', lider: 'Líder', liderado: 'Liderado' };

// Mostra o seletor de conta quando o mesmo e-mail/senha bate com mais de uma
// conta (ex: administrador que também é líder em uma ou mais turmas) — o
// backend devolve `{ contas }` em vez de `{ token, user }` nesse caso.
function mostrarEscolhaDeConta(contas, email, senha) {
  STATE.loginPendente = { email, senha };
  const select = document.getElementById('lg-conta-select');
  select.innerHTML = contas.map(c => {
    const detalhe = c.turmaNome ? ` — turma ${c.turmaNome}` : '';
    return `<option value="${c.id}">${ROTULO_ROLE_CONTA[c.role] || c.role} — ${c.nome}${detalhe}</option>`;
  }).join('');
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('auth-escolha-conta').style.display = '';
}

// Mostra o botão "Trocar de conta" no cabeçalho (admin/líder) quando o e-mail
// logado também é dono de outra(s) conta(s) — ex: o mesmo e-mail é admin e
// líder de uma turma. Troca sem pedir senha de novo (ver /auth/trocar-conta).
async function carregarBotaoTrocarConta(selectId) {
  const select = document.getElementById(selectId);
  try {
    const contas = await Api.minhasContas();
    const outras = contas.filter(c => c.id !== AUTH.user.id);
    if (!outras.length) { select.style.display = 'none'; select.innerHTML = ''; return; }
    select.innerHTML = `<option value="">🔀 Trocar de conta...</option>` + outras.map(c => {
      const detalhe = c.turmaNome ? ` — turma ${c.turmaNome}` : '';
      return `<option value="${c.id}">${ROTULO_ROLE_CONTA[c.role] || c.role} — ${c.nome}${detalhe}</option>`;
    }).join('');
    select.style.display = '';
  } catch (err) {
    select.style.display = 'none'; // não é crítico pro uso normal — falha silenciosa
  }
}

async function trocarParaConta(contaId) {
  if (!contaId) return;
  try {
    const { token, user } = await Api.trocarConta(contaId);
    salvarAuth(token, user);
    await entrarNaSessao();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function tentarAuth(botao, chamada) {
  const erroEl = document.getElementById('auth-erro');
  erroEl.style.display = 'none';
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Só um instante...';
  try {
    const resposta = await chamada();
    if (resposta.contas) {
      const { email, senha } = STATE.loginPendente || {
        email: document.getElementById('lg-email').value.trim(),
        senha: document.getElementById('lg-senha').value,
      };
      mostrarEscolhaDeConta(resposta.contas, email, senha);
      return;
    }
    document.getElementById('auth-escolha-conta').style.display = 'none';
    document.getElementById('form-login').style.display = '';
    STATE.loginPendente = null;
    salvarAuth(resposta.token, resposta.user);
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
  if (AUTH.user.role === 'admin') {
    carregarBotaoTrocarConta('admin-conta-trocar');
    await carregarTudoAdmin();
    mostrarTela('admin');
  } else if (AUTH.user.role === 'lider') {
    renderHeaderLider();
    carregarBotaoTrocarConta('lider-conta-trocar');
    await carregarTudoLider();
    mostrarTela('lider');
    irParaSecao('desafios');
    if (AUTH.user.somenteLeitura) ativarModoSomenteLeitura(AUTH.user.nome);
    else desativarModoSomenteLeitura();
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
  localStorage.removeItem('pl_admin_stash'); // sair de vez encerra também uma "Visualizar como" pendente
  desativarModoSomenteLeitura();
  STATE.liderados = []; STATE.atividades = []; STATE.matriz = []; STATE.metas = [];
  STATE.diario = []; STATE.diarioResumoEquipe = []; STATE.rotina = []; STATE.planoAcao = []; STATE.projetos = [];
  STATE.estatisticasDiario = null;
  STATE.arquivos = []; STATE.arquivosTurma = [];
  STATE.mensagensIndividuais = []; STATE.arquivosIndividuais = [];
  STATE.desafios = [];
  STATE.planoGestao = null; STATE.diagnostico = [];
  STATE.meuPerfil = null; STATE.minhasAtividades = []; STATE.minhasMetas = []; STATE.meusFeedbacks = [];
  STATE.turmas = []; STATE.turmaSelecionadaId = null; STATE.turmaLideres = []; STATE.turmaDesafios = []; STATE.turmaArquivos = []; STATE.lideresSemTurma = [];
  STATE.areaIndividualLiderId = null; STATE.areaIndividualMensagens = []; STATE.areaIndividualArquivos = [];
  STATE.agendaRotinaSemana = null;
  document.getElementById('form-login').reset();
  document.getElementById('auth-erro').style.display = 'none';
  mostrarTela('auth');
}

async function carregarTudoLider() {
  try {
    const [liderados, atividades, metas, matriz, rotina, planoAcao, projetos, config] = await Promise.all([
      Api.listarLiderados(), Api.listarAtividades(), Api.listarMetas(), Api.listarMatriz(),
      Api.listarRotina(), Api.listarPlanoAcao(), Api.listarProjetos(), Api.getDashboardConfig(),
    ]);
    STATE.liderados = liderados.map(mapLiderado);
    STATE.atividades = atividades.map(mapAtividade);
    STATE.metas = metas.map(mapMeta);
    STATE.matriz = matriz.map(mapMatriz);
    STATE.rotina = rotina.map(mapRotina);
    STATE.planoAcao = planoAcao.map(mapPlanoAcao);
    STATE.projetos = projetos.map(mapProjeto);
    STATE.metaIdeal = { operacional: config.ideal_operacional, tatico: config.ideal_tatico, estrategico: config.ideal_estrategico };
    STATE.diario = [];
    STATE.diarioSelecionadoId = null;

    try { STATE.diarioResumoEquipe = (await Api.diarioResumoEquipe()).map(mapDiario); }
    catch (e) { STATE.diarioResumoEquipe = []; }

    try { STATE.desafios = (await Api.listarDesafios()).map(mapDesafio); }
    catch (e) { STATE.desafios = []; }

    try { STATE.planoGestao = mapPlanoGestao(await Api.getPlanoGestao()); }
    catch (e) { STATE.planoGestao = mapPlanoGestao({}); }

    try { STATE.diagnostico = (await Api.listarDiagnostico()).map(mapDiagnostico); }
    catch (e) { STATE.diagnostico = []; }

    renderTudo();
    await carregarEstatisticasDiario();
    await carregarAutoavaliacaoDoMes();
    await carregarArquivos();
    await carregarMensagensIndividuais();
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
    await carregarArquivosTurma();
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
        ${htmlFerramentaFeedback(f)}
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
  renderDesafios();
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
          ${!l.email ? `<span class="liderado-sem-acesso" title="Cadastrado só com o perfil — edite pra liberar o acesso">🔒 Sem acesso ainda</span>` : ''}
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
  renderPlanoAcaoItens(); // opções de responsável (liderados) podem ter mudado
}

function initFormLiderado() {
  const form = document.getElementById('form-liderado');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('l-nome').value.trim();
    const cargo = document.getElementById('l-cargo').value.trim();
    const email = document.getElementById('l-email').value.trim();
    const senha = document.getElementById('l-senha').value;
    if (!nome || !cargo) { mostrarToast('Preencha nome e cargo.', 'error'); return; }

    // E-mail e senha de acesso são opcionais — dá pra cadastrar só o perfil
    // e liberar o acesso depois. Mas se um dos dois vier preenchido, os dois
    // têm que vir juntos (senão fica um login pela metade).
    const podeDefinirAcesso = document.getElementById('grupo-senha-liderado').style.display !== 'none';
    const tentandoDefinirAcesso = podeDefinirAcesso && (email || senha);
    if (tentandoDefinirAcesso) {
      if (!email || !senha) { mostrarToast('Informe e-mail e senha juntos pra liberar o acesso, ou deixe os dois em branco.', 'error'); return; }
      if (senha.length < 6) { mostrarToast('A senha precisa ter pelo menos 6 caracteres.', 'error'); return; }
    }

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
    if (tentandoDefinirAcesso) { dadosComuns.email = email; dadosComuns.senha = senha; }

    const id = document.getElementById('l-id').value;
    const restaurar = iniciarCarregamentoBotao(form.querySelector('button[type=submit]'), 'Salvando...');
    try {
      if (id) {
        const atualizado = mapLiderado(await Api.atualizarLiderado(id, dadosComuns));
        const idx = STATE.liderados.findIndex(l => l.id === id);
        STATE.liderados[idx] = atualizado;
        mostrarToast('Liderado atualizado com sucesso!');
      } else {
        const criado = mapLiderado(await Api.criarLiderado(dadosComuns));
        STATE.liderados.push(criado);
        mostrarToast(tentandoDefinirAcesso ? 'Liderado cadastrado! Combine o e-mail e a senha de acesso com ele(a).' : 'Liderado cadastrado! Você pode liberar o acesso dele(a) quando quiser, editando o cadastro.');
      }
      renderLiderados();
      resetFormLiderado();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
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
  const temAcesso = !!l.email;
  document.getElementById('l-email').value = l.email || '';
  document.getElementById('l-email').readOnly = temAcesso;
  document.getElementById('l-senha').value = '';
  // Se ainda não tem e-mail, deixa o campo de senha aberto pra liberar o
  // acesso agora; se já tem, mantém escondido (trocar senha é outra tela).
  document.getElementById('grupo-senha-liderado').style.display = temAcesso ? 'none' : 'block';
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

  resetCamposRegistroDiario();

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
    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Salvando...');
    try {
      const atualizado = mapLiderado(await Api.atualizarLiderado(id, dados));
      const idx = STATE.liderados.findIndex(l => l.id === id);
      if (idx !== -1) STATE.liderados[idx] = atualizado;
      renderDiarioEquipe();
      mostrarToast('Perfil do liderado atualizado!');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
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
      ${(r.evolucao && r.evolucao.length) ? `<div class="atividade-tags">${r.evolucao.map(v => `<span class="tag-pill tag-evolucao">${EVOLUCAO_LABELS[v] || v}</span>`).join('')}</div>` : ''}
      ${r.sinais ? `<div class="diario-timeline-campo"><strong>👁️ Sinais observados:</strong> ${r.sinais}</div>` : ''}
      ${r.conversa ? `<div class="diario-timeline-campo"><strong>💬 Conversa:</strong> ${r.conversa}</div>` : ''}
      ${htmlFerramentaFeedback(r)}
      ${r.plano ? `<div class="diario-timeline-campo"><strong>📋 Plano de ação:</strong> ${r.plano}</div>` : ''}
      <button class="btn-icon btn-icon-sm btn-icon-danger diario-timeline-excluir" title="Excluir registro" onclick="excluirRegistroDiario('${r.id}')">🗑️</button>
    </div>
  `).join('');
}

// Monta o bloco da ferramenta de feedback usada (Sanduíche/Feedforward/
// Comece-Pare-Continue) pra exibir na linha do tempo — cada uma com seus
// próprios campos, então o HTML muda conforme qual foi escolhida.
function htmlFerramentaFeedback(r) {
  if (!r.ferramentaFeedback) return '';
  const titulo = FERRAMENTAS_FEEDBACK_LABELS[r.ferramentaFeedback] || r.ferramentaFeedback;
  let campos = '';
  if (r.ferramentaFeedback === 'sanduiche') {
    campos = `
      ${r.fbSanduichePositivo1 ? `<div>😊 <strong>Positivo:</strong> ${r.fbSanduichePositivo1}</div>` : ''}
      ${r.fbSanduicheMelhoria ? `<div>🎯 <strong>A melhorar:</strong> ${r.fbSanduicheMelhoria}</div>` : ''}
      ${r.fbSanduichePositivo2 ? `<div>😊 <strong>Positivo:</strong> ${r.fbSanduichePositivo2}</div>` : ''}`;
  } else if (r.ferramentaFeedback === 'feedforward') {
    campos = `
      ${r.fbFeedforwardMais ? `<div>➕ <strong>O que funcionou:</strong> ${r.fbFeedforwardMais}</div>` : ''}
      ${r.fbFeedforwardDelta ? `<div>Δ <strong>O que fazer diferente:</strong> ${r.fbFeedforwardDelta}</div>` : ''}`;
  } else if (r.ferramentaFeedback === 'comece_pare_continue') {
    campos = `
      ${r.fbCpcComece ? `<div>▶️ <strong>Comece:</strong> ${r.fbCpcComece}</div>` : ''}
      ${r.fbCpcPare ? `<div>⏹️ <strong>Pare:</strong> ${r.fbCpcPare}</div>` : ''}
      ${r.fbCpcContinue ? `<div>⏩ <strong>Continue:</strong> ${r.fbCpcContinue}</div>` : ''}`;
  }
  if (!campos.trim()) return '';
  return `<div class="diario-timeline-ferramenta"><div class="diario-timeline-ferramenta-titulo">${titulo}</div>${campos}</div>`;
}

// Mostra/esconde o seletor de ferramenta (só faz sentido em Feedback formal)
// e os campos específicos da ferramenta escolhida.
function atualizarVisibilidadeRegistroDiario() {
  const tipo = getTagValue('registro-tipo') || 'observacao';
  document.getElementById('wrap-feedback-ferramenta').style.display = tipo === 'feedback' ? '' : 'none';

  const ferramenta = tipo === 'feedback' ? getTagValue('feedback-ferramenta') : '';
  document.getElementById('wrap-fb-sanduiche').style.display = ferramenta === 'sanduiche' ? '' : 'none';
  document.getElementById('wrap-fb-feedforward').style.display = ferramenta === 'feedforward' ? '' : 'none';
  document.getElementById('wrap-fb-cpc').style.display = ferramenta === 'comece_pare_continue' ? '' : 'none';
}

function resetCamposRegistroDiario() {
  document.getElementById('form-registro-diario').reset();
  document.getElementById('rd-data').value = hojeISO();
  clearMultiGroup('riscos');
  clearMultiGroup('evolucao');
  clearTagGroup('feedback-ferramenta');
  setTagValue('registro-tipo', 'observacao');
  atualizarVisibilidadeRegistroDiario();
}

function initFormRegistroDiario() {
  // Escuta no document (não nos grupos), e registrado DEPOIS de initTagButtons
  // no cascade de init — assim o clique já trocou a classe "selected" antes
  // de ler o estado aqui. Ouvir direto no grupo faria o bubbling chegar
  // primeiro no listener local (lendo o estado ainda desatualizado) e só
  // depois no listener de document que faz o toggle de fato.
  document.addEventListener('click', e => {
    if (e.target.closest('#grupo-registro-tipo, #grupo-feedback-ferramenta')) {
      atualizarVisibilidadeRegistroDiario();
    }
  });

  document.getElementById('form-registro-diario').addEventListener('submit', async e => {
    e.preventDefault();
    if (!STATE.diarioSelecionadoId) return;
    const riscos = getMultiValues('riscos');
    const evolucao = getMultiValues('evolucao');
    const sinais = document.getElementById('rd-sinais').value.trim();
    const conversa = document.getElementById('rd-conversa').value.trim();
    const plano = document.getElementById('rd-plano').value.trim();
    const tipo = getTagValue('registro-tipo') || 'observacao';
    const ferramentaFeedback = tipo === 'feedback' ? getTagValue('feedback-ferramenta') : '';

    const dadosFerramenta = {
      fbSanduichePositivo1: document.getElementById('fb-sanduiche-positivo1').value.trim(),
      fbSanduicheMelhoria: document.getElementById('fb-sanduiche-melhoria').value.trim(),
      fbSanduichePositivo2: document.getElementById('fb-sanduiche-positivo2').value.trim(),
      fbFeedforwardMais: document.getElementById('fb-feedforward-mais').value.trim(),
      fbFeedforwardDelta: document.getElementById('fb-feedforward-delta').value.trim(),
      fbCpcComece: document.getElementById('fb-cpc-comece').value.trim(),
      fbCpcPare: document.getElementById('fb-cpc-pare').value.trim(),
      fbCpcContinue: document.getElementById('fb-cpc-continue').value.trim(),
    };
    const temCampoFerramenta = Object.values(dadosFerramenta).some(Boolean);

    if (!riscos.length && !evolucao.length && !sinais && !conversa && !plano && !temCampoFerramenta) {
      mostrarToast('Preencha ao menos um campo do registro.', 'error');
      return;
    }

    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Registrando...');
    try {
      const novo = mapDiario(await Api.criarRegistroDiario({
        liderado_id: STATE.diarioSelecionadoId, tipo,
        data: document.getElementById('rd-data').value || hojeISO(),
        riscos, evolucao, sinais, conversa, plano, ferramentaFeedback, ...dadosFerramenta,
      }));
      STATE.diario.push(novo);
      STATE.diarioResumoEquipe = STATE.diarioResumoEquipe.filter(d => !(d.lideradoId === novo.lideradoId && d.tipo === novo.tipo));
      STATE.diarioResumoEquipe.push(novo);

      renderTimelineDiario();
      renderDiarioEquipe();
      resetCamposRegistroDiario();
      atualizarPillUltimoFeedback(STATE.diarioSelecionadoId);
      mostrarToast(tipo === 'feedback' ? 'Feedback lançado com sucesso!' : 'Registro adicionado ao diário de bordo!');
      carregarEstatisticasDiario();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
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
  renderDesafios();
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
          ${(r.evolucao && r.evolucao.length) ? `<p><strong>Evolução:</strong> ${r.evolucao.map(v => EVOLUCAO_LABELS[v] || v).join(', ')}</p>` : ''}
          ${r.sinais ? `<p><strong>Sinais:</strong> ${r.sinais}</p>` : ''}
          ${r.conversa ? `<p><strong>Conversa:</strong> ${r.conversa}</p>` : ''}
          ${htmlFerramentaFeedback(r)}
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

// Painel do Líder — item 3 (Mini-BSC): cada meta pode marcar UMA das 4
// perspectivas; o Dashboard agrega as metas por perspectiva pra formar a
// visão de conjunto das 4 juntas, em vez de pedir o preenchimento repetido
// das 4 em cada meta individual.
const BSC_CONFIG = {
  aprendizado: { label: '🌱 Aprendizado e Crescimento', cor: '#16a085', bg: '#eafaf6' },
  processos:   { label: '⚙️ Processos Internos',        cor: '#2980b9', bg: '#eaf4fb' },
  clientes:    { label: '👥 Clientes',                  cor: '#8e44ad', bg: '#f5eef8' },
  financeira:  { label: '📊 Financeira / Resultado',    cor: '#c0392b', bg: '#fdf0ef' },
};

// Painel do Líder — item 5 (Execução e Acompanhamento).
const EXECUCAO_STATUS_CONFIG = {
  no_prazo:  { label: '🟢 No prazo',  cor: '#27ae60', bg: '#eafaf1' },
  atencao:   { label: '🟡 Atenção',   cor: '#f39c12', bg: '#fef9ec' },
  atrasado:  { label: '🔴 Atrasado',  cor: '#e74c3c', bg: '#fdf0ef' },
  concluido: { label: '✅ Concluído', cor: '#2980b9', bg: '#eaf4fb' },
};

const FREQUENCIA_LABELS = { semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', trimestral: 'Trimestral' };

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
  ['a-responsavel', 'ma-responsavel', 'm-responsavel'].forEach(id => {
    const atual = document.getElementById(id).value;
    document.getElementById(id).innerHTML = opcoes;
    document.getElementById(id).value = atual;
  });
  const atualFiltro = document.getElementById('filtro-responsavel').value;
  document.getElementById('filtro-responsavel').innerHTML = '<option value="todos">Todos</option><option value="eu">👤 Eu (Líder)</option>' +
    STATE.liderados.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
  document.getElementById('filtro-responsavel').value = atualFiltro || 'todos';

  const atualFiltroMatriz = document.getElementById('filtro-matriz-responsavel').value;
  document.getElementById('filtro-matriz-responsavel').innerHTML = '<option value="todos">👥 Toda a área (gestão)</option><option value="eu">👤 Eu (Líder)</option>' +
    STATE.liderados.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
  document.getElementById('filtro-matriz-responsavel').value = atualFiltroMatriz || 'todos';
}

// A atividade pode se vincular a uma Meta/Indicador, ao OKR ou à perspectiva
// do BSC de uma meta (as 3 opções listam metas, só filtradas de forma
// diferente — OKR só mostra metas com OKR preenchido, BSC só as que têm
// perspectiva marcada), ou a um item do Plano de Ação. `prefixo` é 'a'
// (formulário da tela) ou 'ma' (modal de edição rápida) — os dois têm os
// mesmos ids de elemento com prefixos diferentes.
function opcoesMetaParaVinculo(tipoVinculo) {
  if (tipoVinculo === 'okr') return STATE.metas.filter(m => m.okrObjetivo);
  if (tipoVinculo === 'bsc') return STATE.metas.filter(m => m.perspectivaBsc);
  return STATE.metas;
}

const ROTULO_LABEL_META_VINCULO = {
  meta: 'Meta / Indicador', okr: 'Meta com OKR definido', bsc: 'Meta com perspectiva do BSC',
};

function atualizarVinculoAtividade(prefixo) {
  const selectTipo = document.getElementById(`${prefixo}-tipovinculo`);
  const wrapMeta = document.getElementById(`wrap-${prefixo}-meta`);
  const wrapPlano = document.getElementById(`wrap-${prefixo}-plano-acao`);
  const selectMeta = document.getElementById(`${prefixo}-meta`);
  const selectPlano = document.getElementById(`${prefixo}-plano-acao`);
  const labelMeta = document.getElementById(`label-${prefixo}-meta`);
  if (!selectTipo || !selectMeta) return;

  const tipoVinculo = selectTipo.value;
  const ehPlanoAcao = tipoVinculo === 'plano_acao';
  const ehMetaOkrOuBsc = ['meta', 'okr', 'bsc'].includes(tipoVinculo);

  wrapMeta.style.display = ehMetaOkrOuBsc ? '' : 'none';
  wrapPlano.style.display = ehPlanoAcao ? '' : 'none';
  labelMeta.textContent = ROTULO_LABEL_META_VINCULO[tipoVinculo] || 'Meta / Indicador';

  const metasFiltradas = opcoesMetaParaVinculo(tipoVinculo);
  const metaAtual = selectMeta.value;
  selectMeta.innerHTML = '<option value="">— Selecione —</option>' +
    metasFiltradas.map(m => `<option value="${m.id}">${TIPO_CONFIG[m.tipo]?.label.split(' ')[0] || ''} ${m.nome}</option>`).join('');
  if (metasFiltradas.some(m => m.id === metaAtual)) selectMeta.value = metaAtual;

  const acoesComTexto = STATE.planoAcao.filter(p => p.acao);
  const planoAtual = selectPlano.value;
  selectPlano.innerHTML = '<option value="">— Selecione —</option>' +
    acoesComTexto.map(p => `<option value="${p.id}">${p.acao}</option>`).join('');
  if (acoesComTexto.some(p => p.id === planoAtual)) selectPlano.value = planoAtual;
}

function popularSelectsMeta() {
  atualizarVinculoAtividade('a');
  atualizarVinculoAtividade('ma');

  const atualFiltro = document.getElementById('filtro-meta').value;
  document.getElementById('filtro-meta').innerHTML = '<option value="todos">Todas</option>' +
    STATE.metas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
  document.getElementById('filtro-meta').value = atualFiltro || 'todos';

  renderProjetosIniciativas(); // opções de meta vinculável podem ter mudado
  renderPlanoAcaoItens();
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

const ICONE_TIPO_VINCULO = { meta: '🎯', okr: '🔑', bsc: '🧭', plano_acao: '✅' };

// Rótulo do vínculo da atividade (Meta/OKR/BSC apontam pra metas.id — o que
// muda é só o enquadramento; Plano de Ação aponta pra plano_acao_itens).
function vinculoAtividadeTexto(a) {
  if (!a.tipoVinculo) return '';
  if (a.tipoVinculo === 'plano_acao') {
    const item = STATE.planoAcao.find(p => p.id === a.planoAcaoId);
    return item && item.acao ? `${ICONE_TIPO_VINCULO.plano_acao} ${item.acao}` : '';
  }
  const m = STATE.metas.find(x => x.id === a.metaId);
  return m ? `${ICONE_TIPO_VINCULO[a.tipoVinculo] || '🎯'} ${m.nome}` : '';
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
  const vinculo = vinculoAtividadeTexto(a);
  return `
    ${a.resultado ? `<span class="tag-pill" style="background:${rc.bg};color:${rc.cor}">${rc.label}</span>` : ''}
    ${a.tipo ? `<span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label}</span>` : ''}
    ${a.prazo ? `<span class="tag-pill tag-prazo ${estaAtrasada(a) ? 'tag-prazo-atrasado' : ''}">📅 ${formatarData(a.prazo)}</span>` : ''}
    ${resp ? `<span class="tag-pill tag-responsavel">${resp}</span>` : ''}
    ${vinculo ? `<span class="tag-pill tag-meta">${vinculo}</span>` : ''}
  `;
}

function renderAtividades() {
  renderDesafios();
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
  document.getElementById('a-tipovinculo').addEventListener('change', () => atualizarVinculoAtividade('a'));
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
      tipoVinculo: document.getElementById('a-tipovinculo').value,
      metaId: document.getElementById('a-meta').value,
      planoAcaoId: document.getElementById('a-plano-acao').value,
      obs: document.getElementById('a-obs').value.trim(),
    };

    const id = document.getElementById('a-id').value;
    const restaurar = iniciarCarregamentoBotao(form.querySelector('button[type=submit]'), 'Salvando...');
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
    } finally {
      restaurar();
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
  document.getElementById('a-tipovinculo').value = '';
  document.getElementById('a-meta').value = '';
  document.getElementById('a-plano-acao').value = '';
  atualizarVinculoAtividade('a');
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
  document.getElementById('a-tipovinculo').value = a.tipoVinculo || '';
  atualizarVinculoAtividade('a');
  document.getElementById('a-meta').value = a.metaId || '';
  document.getElementById('a-plano-acao').value = a.planoAcaoId || '';
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
  document.getElementById('ma-tipovinculo').value = a.tipoVinculo || '';
  atualizarVinculoAtividade('ma');
  document.getElementById('ma-meta').value = a.metaId || '';
  document.getElementById('ma-plano-acao').value = a.planoAcaoId || '';
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
  document.getElementById('ma-tipovinculo').addEventListener('change', () => atualizarVinculoAtividade('ma'));

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
      tipoVinculo: document.getElementById('ma-tipovinculo').value,
      metaId: document.getElementById('ma-meta').value,
      planoAcaoId: document.getElementById('ma-plano-acao').value,
      obs: document.getElementById('ma-obs').value.trim(),
    };

    const restaurar = iniciarCarregamentoBotao(document.getElementById('modal-atividade-salvar'), 'Salvando...');
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
    } finally {
      restaurar();
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

// Checklist de validação do material (Perguntas de Validação) — calculado a
// partir do que já foi preenchido, em vez de mais uma lista de checkboxes
// manuais: só aponta o que falta pra meta ficar completa.
// Checklist SMART — cada letra checada a partir do que já foi preenchido no
// formulário, sem exigir mais nenhum checkbox manual. "Atingível" não tem
// como ser verificado automaticamente (é um julgamento de quem está
// definindo a meta), então fica como "não avaliável" em vez de forçar uma
// resposta certa/errada.
function checklistSmart(m) {
  return [
    { letra: 'S', rotulo: 'Específica', ok: !!m.nome },
    { letra: 'M', rotulo: 'Mensurável', ok: !!(m.indicador && m.pontoPartida && m.valor) },
    { letra: 'A', rotulo: 'Atingível', ok: null },
    { letra: 'R', rotulo: 'Relevante', ok: !!m.porqueImporta },
    { letra: 'T', rotulo: 'Temporal', ok: !!(m.prazo && m.frequenciaAcompanhamento) },
  ];
}

function renderMetas() {
  renderDesafios();
  const container = document.getElementById('lista-metas');
  document.getElementById('badge-total-metas').textContent = STATE.metas.length;

  if (STATE.metas.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Nenhuma meta cadastrada ainda.<br>Use o formulário acima para começar.</p></div>`;
  } else {
    container.innerHTML = STATE.metas.map(m => {
      const tc = TIPO_CONFIG[m.tipo] || {};
      const bsc = BSC_CONFIG[m.perspectivaBsc];
      const execCfg = EXECUCAO_STATUS_CONFIG[m.statusExecucao] || EXECUCAO_STATUS_CONFIG.no_prazo;
      const prog = metaProgresso(m.id);
      const krs = [m.okrKr1, m.okrKr2, m.okrKr3].filter(Boolean);
      const smart = checklistSmart(m);
      return `
      <div class="meta-card" data-id="${m.id}">
        <div class="meta-card-topo">
          <span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label || ''}</span>
          ${bsc ? `<span class="tag-pill" style="background:${bsc.bg};color:${bsc.cor}">${bsc.label}</span>` : ''}
          <span class="tag-pill" style="background:${execCfg.bg};color:${execCfg.cor}">${execCfg.label}</span>
          <div class="meta-card-acoes">
            <button class="btn-icon btn-icon-sm" title="Editar" onclick="editarMeta('${m.id}')">✏️</button>
            <button class="btn-icon btn-icon-sm btn-icon-danger" title="Excluir" onclick="excluirMeta('${m.id}')">🗑️</button>
          </div>
        </div>
        <div class="meta-card-nome">${m.nome}</div>
        ${m.porqueImporta ? `<div class="meta-card-porque">💭 ${m.porqueImporta}</div>` : ''}
        ${(m.indicador || m.pontoPartida || m.valor) ? `
          <div class="meta-card-indicador">
            ${m.indicador ? `📈 ${m.indicador}` : ''}${(m.pontoPartida || m.valor) ? `${m.indicador ? ' · ' : ''}${m.pontoPartida || '?'} → ${m.valor || '?'}` : ''}
          </div>` : ''}
        ${m.prazo ? `<div class="meta-card-prazo">📅 ${formatarData(m.prazo)}${m.frequenciaAcompanhamento ? ' · 🔁 ' + FREQUENCIA_LABELS[m.frequenciaAcompanhamento] : ''}</div>` : ''}
        ${m.descricao ? `<div class="meta-card-desc">${m.descricao}</div>` : ''}
        ${(m.okrObjetivo || krs.length) ? `
          <div class="meta-card-okr">
            <div class="meta-card-okr-titulo">🔑 OKR${m.okrObjetivo ? ': ' + m.okrObjetivo : ''}</div>
            ${krs.length ? `<ul>${krs.map(k => `<li>${k}</li>`).join('')}</ul>` : ''}
          </div>` : ''}
        ${(m.acaoPrioritaria || m.responsavelAcao || m.proximaVerificacao || m.evidenciaConclusao) ? `
          <div class="meta-card-execucao">
            ${m.acaoPrioritaria ? `<div>🚀 <strong>Próxima ação:</strong> ${m.acaoPrioritaria}</div>` : ''}
            ${m.responsavelAcao ? `<div>👤 <strong>Responsável:</strong> ${m.responsavelAcao}</div>` : ''}
            ${m.proximaVerificacao ? `<div>🔎 <strong>Próxima verificação:</strong> ${formatarData(m.proximaVerificacao)}</div>` : ''}
            ${m.evidenciaConclusao ? `<div>📎 <strong>Evidência:</strong> ${m.evidenciaConclusao}</div>` : ''}
          </div>` : ''}
        <div class="meta-progresso">
          <div class="meta-progresso-barra"><div class="meta-progresso-fill" style="width:${prog.pct}%;background:${tc.cor || '#667eea'}"></div></div>
          <div class="meta-progresso-texto">${prog.concluidas}/${prog.total} atividades concluídas (${prog.pct}%)</div>
        </div>
        <div class="meta-card-checklist meta-card-checklist-smart">
          ${smart.map(s => {
            const icone = s.ok === null ? '➖' : (s.ok ? '✅' : '⚠️');
            const classe = s.ok === null ? 'smart-pill-na' : (s.ok ? 'smart-pill-ok' : 'smart-pill-falta');
            return `<span class="smart-pill ${classe}" title="${s.rotulo}${s.ok === null ? ' — julgamento de quem definiu a meta, não dá pra checar sozinho' : ''}">${icone} ${s.letra}</span>`;
          }).join('')}
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
      porqueImporta: document.getElementById('me-porque').value.trim(),
      pontoPartida: document.getElementById('me-ponto-partida').value.trim(),
      frequenciaAcompanhamento: getTagValue('me-frequencia'),
      perspectivaBsc: getTagValue('me-bsc'),
      okrObjetivo: document.getElementById('me-okr-objetivo').value.trim(),
      okrKr1: document.getElementById('me-okr-kr1').value.trim(),
      okrKr2: document.getElementById('me-okr-kr2').value.trim(),
      okrKr3: document.getElementById('me-okr-kr3').value.trim(),
      acaoPrioritaria: document.getElementById('me-acao').value.trim(),
      responsavelAcao: document.getElementById('me-responsavel').value.trim(),
      evidenciaConclusao: document.getElementById('me-evidencia').value.trim(),
      proximaVerificacao: document.getElementById('me-proxima-verificacao').value,
      statusExecucao: getTagValue('me-status') || 'no_prazo',
    };

    const id = document.getElementById('me-id').value;
    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Salvando...');
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
    } finally {
      restaurar();
    }
  });

  document.getElementById('btn-cancelar-meta').addEventListener('click', resetFormMeta);
}

function resetFormMeta() {
  document.getElementById('me-id').value = '';
  document.getElementById('form-meta').reset();
  clearTagGroup('me-tipo');
  clearTagGroup('me-frequencia');
  clearTagGroup('me-bsc');
  setTagValue('me-status', 'no_prazo');
  document.querySelectorAll('#form-meta details.meta-secao-opcional').forEach(d => { d.open = false; });
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
  document.getElementById('me-porque').value = m.porqueImporta || '';
  document.getElementById('me-ponto-partida').value = m.pontoPartida || '';
  document.getElementById('me-okr-objetivo').value = m.okrObjetivo || '';
  document.getElementById('me-okr-kr1').value = m.okrKr1 || '';
  document.getElementById('me-okr-kr2').value = m.okrKr2 || '';
  document.getElementById('me-okr-kr3').value = m.okrKr3 || '';
  document.getElementById('me-acao').value = m.acaoPrioritaria || '';
  document.getElementById('me-responsavel').value = m.responsavelAcao || '';
  document.getElementById('me-evidencia').value = m.evidenciaConclusao || '';
  document.getElementById('me-proxima-verificacao').value = m.proximaVerificacao || '';
  setTagValue('me-tipo', m.tipo);
  setTagValue('me-frequencia', m.frequenciaAcompanhamento || '');
  setTagValue('me-bsc', m.perspectivaBsc || '');
  setTagValue('me-status', m.statusExecucao || 'no_prazo');

  // Abre as seções opcionais que já têm conteúdo, pra quem tá editando não
  // precisar clicar pra descobrir o que já foi preenchido.
  const secaoBsc = document.getElementById('grupo-me-bsc').closest('details');
  const secaoOkr = document.getElementById('me-okr-objetivo').closest('details');
  const secaoExecucao = document.getElementById('me-acao').closest('details');
  secaoBsc.open = !!m.perspectivaBsc;
  secaoOkr.open = !!(m.okrObjetivo || m.okrKr1 || m.okrKr2 || m.okrKr3);
  secaoExecucao.open = !!(m.acaoPrioritaria || m.responsavelAcao || m.evidenciaConclusao || m.proximaVerificacao || (m.statusExecucao && m.statusExecucao !== 'no_prazo'));

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
    STATE.atividades.forEach(a => { if (a.metaId === id) { a.metaId = ''; a.tipoVinculo = ''; } });
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
  renderDesafios();
  const filtro = STATE.filtroMatrizResponsavel;
  const itensFiltrados = filtro === 'todos' ? STATE.matriz : STATE.matriz.filter(m => (m.responsavelId || '') === filtro);
  ['q1','q2','q3','q4'].forEach(q => {
    const items = itensFiltrados.filter(m => getQuadrante(m.resultado, m.esforco) === q);
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
        ${filtro === 'todos' && nomeResponsavel(m) ? `<div class="q-item-responsavel">${nomeResponsavel(m)}</div>` : ''}
        <div class="q-item-acoes">
          <button class="btn-icon btn-icon-sm" title="Editar" onclick="editarMatriz('${m.id}')">✏️</button>
          <button class="btn-icon btn-icon-sm btn-icon-danger" title="Excluir" onclick="excluirMatriz('${m.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  });
}

function initFiltroMatrizResponsavel() {
  document.getElementById('filtro-matriz-responsavel').addEventListener('change', e => {
    STATE.filtroMatrizResponsavel = e.target.value;
    renderMatriz();
  });
}

// As duas listas de "puxar de" só mostram itens do responsável selecionado
// no topo do formulário — escolher o responsável primeiro é o que define o
// que pode ser puxado, por isso este re-popula sempre que o responsável ou
// as listas de origem (atividades/projetos/plano de ação) mudam.
function popularSelectAtividadeMatriz() {
  const respAtual = document.getElementById('m-responsavel').value;

  const selectAtividade = document.getElementById('m-atividade-existente');
  const atualAtividade = selectAtividade.value;
  const atividadesDoResponsavel = STATE.atividades.filter(a => (a.responsavelId || '') === respAtual);
  selectAtividade.innerHTML = '<option value="">— Escrever uma descrição nova —</option>' +
    atividadesDoResponsavel.map(a => `<option value="${a.id}">${a.titulo}</option>`).join('');
  selectAtividade.value = atividadesDoResponsavel.some(a => a.id === atualAtividade) ? atualAtividade : '';

  const selectProjPlano = document.getElementById('m-projeto-planoacao-existente');
  const atualProjPlano = selectProjPlano.value;
  const projetosDoResponsavel = STATE.projetos.filter(p => (p.responsavelId || '') === respAtual);
  const planoAcaoDoResponsavel = STATE.planoAcao.filter(p => (p.responsavelId || '') === respAtual);
  let html = '<option value="">— Nenhum —</option>';
  if (projetosDoResponsavel.length) {
    html += '<optgroup label="📋 Projetos / Iniciativas">' +
      projetosDoResponsavel.map(p => `<option value="proj:${p.id}">${p.nome || '(sem nome)'}</option>`).join('') + '</optgroup>';
  }
  if (planoAcaoDoResponsavel.length) {
    html += '<optgroup label="✅ Plano de Ação">' +
      planoAcaoDoResponsavel.map(p => `<option value="plano:${p.id}">${p.acao || '(sem nome)'}</option>`).join('') + '</optgroup>';
  }
  selectProjPlano.innerHTML = html;
  const idsValidos = [...projetosDoResponsavel.map(p => `proj:${p.id}`), ...planoAcaoDoResponsavel.map(p => `plano:${p.id}`)];
  selectProjPlano.value = idsValidos.includes(atualProjPlano) ? atualProjPlano : '';
}

function initSelectAtividadeMatriz() {
  document.getElementById('m-responsavel').addEventListener('change', popularSelectAtividadeMatriz);

  document.getElementById('m-atividade-existente').addEventListener('change', e => {
    const a = STATE.atividades.find(x => x.id === e.target.value);
    if (!a) return;
    document.getElementById('m-titulo').value = a.titulo;
    if (a.resultado === 'alto' || a.resultado === 'baixo') setTagValue('m-resultado', a.resultado);
    if (a.obs) document.getElementById('m-obs').value = a.obs;
  });

  document.getElementById('m-projeto-planoacao-existente').addEventListener('change', e => {
    const [tipo, id] = e.target.value.split(':');
    if (!tipo) return;
    if (tipo === 'proj') {
      const p = STATE.projetos.find(x => x.id === id);
      if (p) document.getElementById('m-titulo').value = p.nome || '';
    } else if (tipo === 'plano') {
      const p = STATE.planoAcao.find(x => x.id === id);
      if (p) document.getElementById('m-titulo').value = p.acao || '';
    }
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

    const dados = { titulo, resultado, esforco, obs: document.getElementById('m-obs').value.trim(), responsavelId: document.getElementById('m-responsavel').value };
    const id = document.getElementById('m-id').value;
    const restaurar = iniciarCarregamentoBotao(form.querySelector('button[type=submit]'), 'Salvando...');
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
    } finally {
      restaurar();
    }
  });

  document.getElementById('btn-cancelar-matriz').addEventListener('click', resetFormMatriz);
}

function resetFormMatriz() {
  document.getElementById('m-id').value = '';
  document.getElementById('form-matriz').reset();
  document.getElementById('m-responsavel').value = '';
  popularSelectAtividadeMatriz();
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
  document.getElementById('m-responsavel').value = m.responsavelId || '';
  popularSelectAtividadeMatriz();
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
  renderDesafios();
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

// ============================================================
// AGENDA DA SEMANA — visão visual de Seg a Sex da Rotina Diária, como um
// calendário: cada dia é uma coluna, cada registro vira um bloco
// posicionado pela hora de início e com altura proporcional à duração.
// Mesmo dado do STATE.rotina que já alimenta a Lista — só outra forma de
// olhar, sem estado novo no servidor.
// ============================================================
const AGENDA_ROTINA_HORA_INICIO = 6;
const AGENDA_ROTINA_HORA_FIM = 21;
const AGENDA_ROTINA_ALTURA_HORA = 48; // px
const AGENDA_ROTINA_ALTURA_MIN_BLOCO = 34; // px — abaixo disso a hora+título ficam cortados

function segundaFeiraDaSemana(dataISO) {
  const d = new Date(dataISO + 'T00:00:00');
  const diaSemana = d.getDay(); // 0 = domingo ... 6 = sábado
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  return somarDias(dataISO, deslocamento);
}

const NOMES_DIA_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
function nomeDiaSemanaCurto(dataISO) {
  return NOMES_DIA_SEMANA_CURTO[new Date(dataISO + 'T00:00:00').getDay()];
}

function minutosDesdeInicioAgenda(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m) - AGENDA_ROTINA_HORA_INICIO * 60;
}

function irParaSemanaAgenda(delta) {
  const base = STATE.agendaRotinaSemana || segundaFeiraDaSemana(hojeISO());
  STATE.agendaRotinaSemana = somarDias(base, delta * 7);
  renderAgendaRotina();
}

function irParaSemanaAtualAgenda() {
  STATE.agendaRotinaSemana = segundaFeiraDaSemana(hojeISO());
  renderAgendaRotina();
}

function renderAgendaRotina() {
  const cabecalhoEl = document.getElementById('agenda-rotina-cabecalho');
  const corpoEl = document.getElementById('agenda-rotina-corpo');
  if (!cabecalhoEl || !corpoEl) return; // seção só existe na visão do líder

  if (!STATE.agendaRotinaSemana) STATE.agendaRotinaSemana = segundaFeiraDaSemana(hojeISO());
  const segunda = STATE.agendaRotinaSemana;
  const dias = [0, 1, 2, 3, 4].map(i => somarDias(segunda, i));
  const hoje = hojeISO();

  document.getElementById('agenda-rotina-periodo').textContent = `${formatarData(dias[0])} a ${formatarData(dias[4])}`;

  const horas = [];
  for (let h = AGENDA_ROTINA_HORA_INICIO; h <= AGENDA_ROTINA_HORA_FIM; h++) horas.push(h);
  const alturaTotal = (horas.length - 1) * AGENDA_ROTINA_ALTURA_HORA;

  cabecalhoEl.innerHTML = `
    <div class="agenda-rotina-canto"></div>
    ${dias.map(d => `
      <div class="agenda-rotina-dia-titulo ${d === hoje ? 'hoje' : ''}">
        ${nomeDiaSemanaCurto(d)}<br><span class="label-hint">${formatarData(d)}</span>
      </div>`).join('')}
  `;

  corpoEl.innerHTML = `
    <div class="agenda-rotina-coluna-horas" style="height:${alturaTotal}px">
      ${horas.map(h => `<div class="agenda-rotina-hora-label" style="height:${AGENDA_ROTINA_ALTURA_HORA}px">${String(h).padStart(2, '0')}:00</div>`).join('')}
    </div>
    ${dias.map(d => {
      const itensDoDia = STATE.rotina.filter(r => r.data === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
      return `
      <div class="agenda-rotina-coluna ${d === hoje ? 'hoje' : ''}" data-dia="${d}" style="height:${alturaTotal}px; background-size:100% ${AGENDA_ROTINA_ALTURA_HORA}px">
        ${itensDoDia.map(r => {
          const tc = TIPO_CONFIG[r.tipo] || {};
          const top = Math.max(0, minutosDesdeInicioAgenda(r.inicio)) / 60 * AGENDA_ROTINA_ALTURA_HORA;
          const duracaoMin = Math.max(0, minutosDesdeInicioAgenda(r.fim) - minutosDesdeInicioAgenda(r.inicio));
          // Piso em pixel (não em minutos): um compromisso de 15-20min renderizaria
          // menor que a altura de "hora + título" e cortaria o texto — o bloco fica
          // visualmente maior que a duração real, mas o nome continua legível.
          const altura = Math.min(alturaTotal - top, Math.max(AGENDA_ROTINA_ALTURA_MIN_BLOCO, duracaoMin / 60 * AGENDA_ROTINA_ALTURA_HORA));
          return `
            <div class="agenda-rotina-bloco" style="top:${top}px;height:${altura}px;background:${tc.bg};border-left-color:${tc.cor}" title="${r.atividade} (${r.inicio}–${r.fim})">
              <button class="agenda-rotina-bloco-excluir" title="Excluir" onclick="excluirRotina('${r.id}')">🗑️</button>
              <div class="agenda-rotina-bloco-hora">${r.inicio}–${r.fim}</div>
              <div class="agenda-rotina-bloco-titulo">${r.atividade}</div>
            </div>`;
        }).join('')}
      </div>`;
    }).join('')}
  `;
}

// Criar direto na Agenda, clicando exatamente no dia/horário desejado (como
// no Google Agenda) — sem precisar rolar até o formulário e clicar em
// "Adicionar ao Registro". Um mini-formulário (popover) abre ancorado no
// ponto clicado, já com o horário de início naquele ponto (arredondado pros
// 30 minutos mais próximos) e 1h de duração padrão, tudo editável antes de
// salvar.
function minutosParaHHMM(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fecharPopoverAgenda() {
  document.querySelectorAll('.agenda-rotina-popover').forEach(el => el.remove());
  clearTagGroup('agenda-popover-tipo');
}

function abrirPopoverNovoRegistro(coluna, offsetY) {
  fecharPopoverAgenda();
  const dia = coluna.dataset.dia;

  const minutosClicados = AGENDA_ROTINA_HORA_INICIO * 60 + (offsetY / AGENDA_ROTINA_ALTURA_HORA) * 60;
  let minutosSnap = Math.round(minutosClicados / 30) * 30;
  minutosSnap = Math.max(AGENDA_ROTINA_HORA_INICIO * 60, Math.min(AGENDA_ROTINA_HORA_FIM * 60 - 30, minutosSnap));
  const horaInicio = minutosParaHHMM(minutosSnap);
  const horaFim = minutosParaHHMM(Math.min(AGENDA_ROTINA_HORA_FIM * 60, minutosSnap + 60));
  const top = (minutosSnap - AGENDA_ROTINA_HORA_INICIO * 60) / 60 * AGENDA_ROTINA_ALTURA_HORA;

  const diasSemana = [0, 1, 2, 3, 4].map(i => somarDias(STATE.agendaRotinaSemana, i));
  const ancoraDireita = diasSemana.indexOf(dia) >= 3; // qui/sex: abre pra esquerda, senão vaza da tela

  coluna.insertAdjacentHTML('beforeend', `
    <div class="agenda-rotina-popover" style="top:${top}px; ${ancoraDireita ? 'right:2px' : 'left:2px'}" data-dia="${dia}">
      <div class="agenda-rotina-popover-horarios">
        <input type="time" class="agenda-popover-inicio" value="${horaInicio}" step="900" />
        <span>–</span>
        <input type="time" class="agenda-popover-fim" value="${horaFim}" step="900" />
      </div>
      <input type="text" class="agenda-popover-atividade" placeholder="O que você vai fazer?" />
      <div class="btn-group agenda-rotina-popover-tipo">
        <button type="button" class="tag-btn tag-btn-sm" data-group="agenda-popover-tipo" data-value="estrategico" title="Estratégico">🏆</button>
        <button type="button" class="tag-btn tag-btn-sm" data-group="agenda-popover-tipo" data-value="tatico" title="Tático">⚙️</button>
        <button type="button" class="tag-btn tag-btn-sm" data-group="agenda-popover-tipo" data-value="operacional" title="Operacional">🔧</button>
      </div>
      <div class="agenda-rotina-popover-acoes">
        <button type="button" class="btn-secondary btn-sm agenda-popover-cancelar">Cancelar</button>
        <button type="button" class="btn-primary btn-sm agenda-popover-salvar">✓ Adicionar</button>
      </div>
    </div>`);

  const input = coluna.querySelector('.agenda-popover-atividade');
  if (input) input.focus();
}

async function salvarPopoverAgenda() {
  const popover = document.querySelector('.agenda-rotina-popover');
  if (!popover) return;
  const dia = popover.dataset.dia;
  const inicio = popover.querySelector('.agenda-popover-inicio').value;
  const fim = popover.querySelector('.agenda-popover-fim').value;
  const atividade = popover.querySelector('.agenda-popover-atividade').value.trim();
  const tipo = getTagValue('agenda-popover-tipo');

  if (!atividade) { mostrarToast('Descreva a atividade.', 'error'); return; }
  if (!tipo) { mostrarToast('Selecione o tipo da atividade.', 'error'); return; }
  if (!inicio || !fim || fim <= inicio) { mostrarToast('Confira os horários — o fim deve ser depois do início.', 'error'); return; }

  const botao = popover.querySelector('.agenda-popover-salvar');
  const restaurar = iniciarCarregamentoBotao(botao, '...');
  try {
    const novo = mapRotina(await Api.criarRotina({ data: dia, inicio, fim, atividade, tipo, impacto: '', energia: '' }));
    STATE.rotina.push(novo);
    renderDashboardAll(); // recria o corpo da agenda, o que já remove o popover da tela
    mostrarToast('Registrado na rotina do dia!');
  } catch (err) {
    mostrarToast(err.message, 'error');
    restaurar();
  }
}

function initAgendaRotinaCliqueParaCriar() {
  const corpo = document.getElementById('agenda-rotina-corpo');
  if (!corpo) return;

  corpo.addEventListener('click', e => {
    if (e.target.closest('.agenda-popover-salvar')) { salvarPopoverAgenda(); return; }
    if (e.target.closest('.agenda-popover-cancelar')) { fecharPopoverAgenda(); return; }
    if (e.target.closest('.agenda-rotina-popover')) return; // clique dentro do popover não abre outro
    if (e.target.closest('.agenda-rotina-bloco')) return; // registro existente já tem seu próprio botão de excluir

    const coluna = e.target.closest('.agenda-rotina-coluna');
    if (!coluna) return;
    const rect = coluna.getBoundingClientRect();
    abrirPopoverNovoRegistro(coluna, e.clientY - rect.top);
  });

  corpo.addEventListener('keydown', e => {
    if (!e.target.closest('.agenda-rotina-popover')) return;
    if (e.key === 'Enter') { e.preventDefault(); salvarPopoverAgenda(); }
    else if (e.key === 'Escape') { fecharPopoverAgenda(); }
  });
}

// ============================================================
// IMPORTAÇÃO DE PLANILHA (Excel) — Rotina Diária e Metas
// ============================================================
// Reaproveita os mesmos endpoints de criação (POST /rotina, POST /metas),
// uma chamada por linha — não existe (nem precisa existir) uma rota de
// carga em lote no backend. O ganho pro líder é não digitar registro por
// registro na tela: preenche a planilha uma vez, importa, e cada linha vira
// exatamente a mesma chamada que o formulário já faz.
function normalizarTexto(s) {
  return String(s == null ? '' : s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Aceita tanto a chave técnica ("estrategico") quanto o rótulo em português
// ("Estratégico") na planilha, sem diferenciar maiúsculas/acentos — reduz o
// risco de uma linha inteira falhar só por causa de uma vírgula fora do lugar.
function mapearOpcao(valor, mapa) {
  const chave = normalizarTexto(valor);
  if (!chave) return '';
  if (mapa[chave] !== undefined) return mapa[chave];
  const achado = Object.values(mapa).find(v => normalizarTexto(v) === chave);
  return achado || '';
}

const OPCOES_TIPO_PLANILHA = { estrategico: 'estrategico', tatico: 'tatico', operacional: 'operacional' };
const OPCOES_IMPACTO_PLANILHA = { alto: 'alto', medio: 'medio', baixo: 'baixo' };
const OPCOES_ENERGIA_PLANILHA = { alta: 'alta', media: 'media', baixa: 'baixa' };
const OPCOES_FREQUENCIA_PLANILHA = { semanal: 'semanal', quinzenal: 'quinzenal', mensal: 'mensal', trimestral: 'trimestral' };
const OPCOES_BSC_PLANILHA = {
  aprendizado: 'aprendizado', 'aprendizado e crescimento': 'aprendizado',
  processos: 'processos', 'processos internos': 'processos',
  clientes: 'clientes',
  financeira: 'financeira', 'financeira / resultado': 'financeira', financeiro: 'financeira',
};
const OPCOES_STATUS_EXEC_PLANILHA = { 'no prazo': 'no_prazo', atencao: 'atencao', atrasado: 'atrasado', concluido: 'concluido' };

// Datas/horas do Excel chegam como objeto Date (quando a célula tem formato
// de data/hora) OU como texto puro (quando a célula é texto livre) — aceita
// os dois pra não depender de como cada pessoa formatou a planilha.
function excelParaDataISO(valor) {
  if (valor === '' || valor == null) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const s = String(valor).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const ano = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

function excelParaHora(valor) {
  if (valor === '' || valor == null) return '';
  if (valor instanceof Date) return `${String(valor.getUTCHours()).padStart(2, '0')}:${String(valor.getUTCMinutes()).padStart(2, '0')}`;
  const m = String(valor).trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

const IMPORTACOES = {
  rotina: {
    titulo: 'Registro da Rotina Diária',
    colunas: [
      { header: 'Data (dd/mm/aaaa)', campo: 'data', tipo: 'data' },
      { header: 'Início (hh:mm)', campo: 'inicio', tipo: 'hora' },
      { header: 'Fim (hh:mm)', campo: 'fim', tipo: 'hora' },
      { header: 'Atividade', campo: 'atividade', tipo: 'texto' },
      { header: 'Tipo (Estratégico/Tático/Operacional)', campo: 'tipo', tipo: 'opcao', mapa: OPCOES_TIPO_PLANILHA },
      { header: 'Impacto (Alto/Médio/Baixo)', campo: 'impacto', tipo: 'opcao', mapa: OPCOES_IMPACTO_PLANILHA },
      { header: 'Energia (Alta/Média/Baixa)', campo: 'energia', tipo: 'opcao', mapa: OPCOES_ENERGIA_PLANILHA },
    ],
    linhaExemplo: ['01/10/2026', '08:00', '09:00', 'Reunião de alinhamento com o time', 'Estratégico', 'Alto', 'Alta'],
    validar(dados) {
      const erros = [];
      if (!dados.data) erros.push('data inválida (use dd/mm/aaaa)');
      if (!dados.inicio) erros.push('início inválido (use hh:mm)');
      if (!dados.fim) erros.push('fim inválido (use hh:mm)');
      if (dados.inicio && dados.fim && dados.fim <= dados.inicio) erros.push('fim deve ser depois do início');
      if (!dados.atividade) erros.push('atividade em branco');
      if (!dados.tipo) erros.push('tipo inválido (Estratégico/Tático/Operacional)');
      return erros;
    },
    resumo: d => `${d.data || '—'} ${d.inicio || ''}–${d.fim || ''} · ${d.atividade || '(sem atividade)'}`,
    importar: dados => Api.criarRotina(dados).then(mapRotina),
    aoImportarTudo(novos) {
      STATE.rotina.push(...novos);
      renderDashboardAll();
    },
  },
  metas: {
    titulo: 'Metas & Indicadores',
    colunas: [
      { header: 'Nome da meta', campo: 'nome', tipo: 'texto' },
      { header: 'Categoria (Estratégico/Tático/Operacional)', campo: 'tipo', tipo: 'opcao', mapa: OPCOES_TIPO_PLANILHA },
      { header: 'Indicador (KPI)', campo: 'indicador', tipo: 'texto' },
      { header: 'Ponto de partida', campo: 'pontoPartida', tipo: 'texto' },
      { header: 'Resultado esperado', campo: 'valor', tipo: 'texto' },
      { header: 'Prazo (dd/mm/aaaa)', campo: 'prazo', tipo: 'data' },
      { header: 'Frequência (Semanal/Quinzenal/Mensal/Trimestral)', campo: 'frequenciaAcompanhamento', tipo: 'opcao', mapa: OPCOES_FREQUENCIA_PLANILHA },
      { header: 'Por que é importante', campo: 'porqueImporta', tipo: 'texto' },
      { header: 'Perspectiva BSC (Aprendizado/Processos/Clientes/Financeira)', campo: 'perspectivaBsc', tipo: 'opcao', mapa: OPCOES_BSC_PLANILHA },
      { header: 'Descrição', campo: 'descricao', tipo: 'texto' },
      { header: 'OKR - Objetivo', campo: 'okrObjetivo', tipo: 'texto' },
      { header: 'OKR - KR1', campo: 'okrKr1', tipo: 'texto' },
      { header: 'OKR - KR2', campo: 'okrKr2', tipo: 'texto' },
      { header: 'OKR - KR3', campo: 'okrKr3', tipo: 'texto' },
      { header: 'Ação prioritária', campo: 'acaoPrioritaria', tipo: 'texto' },
      { header: 'Responsável pela ação', campo: 'responsavelAcao', tipo: 'texto' },
      { header: 'Evidência de conclusão', campo: 'evidenciaConclusao', tipo: 'texto' },
      { header: 'Próxima verificação (dd/mm/aaaa)', campo: 'proximaVerificacao', tipo: 'data' },
      { header: 'Status (No prazo/Atenção/Atrasado/Concluído)', campo: 'statusExecucao', tipo: 'opcao', mapa: OPCOES_STATUS_EXEC_PLANILHA },
    ],
    linhaExemplo: [
      'Aumentar NPS da área', 'Estratégico', 'NPS', '42', '60', '31/12/2026', 'Mensal',
      'NPS baixo está gerando churn de clientes internos.', 'Clientes', '',
      'Elevar a satisfação percebida pelos clientes internos', 'NPS de 42 para 60', 'Reduzir tempo de resposta em 30%', '',
      'Mapear os 3 principais motivos de detração', 'Carla Mendes', '', '01/11/2026', 'Atenção',
    ],
    validar(dados) {
      const erros = [];
      if (!dados.nome) erros.push('nome em branco');
      if (!dados.tipo) erros.push('categoria inválida (Estratégico/Tático/Operacional)');
      return erros;
    },
    resumo: d => d.nome || '(sem nome)',
    importar: dados => Api.criarMeta(dados).then(mapMeta),
    aoImportarTudo(novos) {
      STATE.metas.push(...novos);
      renderMetas();
    },
  },
  liderados: {
    titulo: 'Liderados',
    colunas: [
      { header: 'Nome completo', campo: 'nome', tipo: 'texto' },
      { header: 'Cargo / Função', campo: 'cargo', tipo: 'texto' },
      { header: 'E-mail de acesso (opcional)', campo: 'email', tipo: 'texto' },
      { header: 'Senha de acesso (opcional)', campo: 'senha', tipo: 'texto' },
      { header: 'Data de início (dd/mm/aaaa)', campo: 'dataInicio', tipo: 'data' },
      { header: 'Perfil comportamental', campo: 'perfilComportamental', tipo: 'texto' },
      { header: 'Principais habilidades', campo: 'habilidades', tipo: 'texto' },
      { header: 'Expectativas do líder', campo: 'expectativas', tipo: 'texto' },
      { header: 'Metas individuais', campo: 'metasTexto', tipo: 'texto' },
      { header: 'Plano de desenvolvimento', campo: 'desenvolvimento', tipo: 'texto' },
      { header: 'Observações', campo: 'obs', tipo: 'texto' },
    ],
    linhaExemplo: [
      'Ana Beatriz Souza', 'Analista de Marketing', '', '', '15/03/2025', 'Comunicador',
      'Boa comunicação, organização', 'Assumir mais autonomia em projetos',
      'Concluir a certificação X até dezembro', 'Mentoria quinzenal com o líder', '',
    ],
    validar(dados) {
      const erros = [];
      if (!dados.nome) erros.push('nome em branco');
      if ((dados.email && !dados.senha) || (!dados.email && dados.senha)) erros.push('e-mail e senha devem vir juntos (ou os dois em branco)');
      if (dados.senha && dados.senha.length < 6) erros.push('senha precisa ter pelo menos 6 caracteres');
      return erros;
    },
    resumo: d => `${d.nome || '(sem nome)'}${d.cargo ? ' — ' + d.cargo : ''}`,
    importar(dados) {
      const payload = {
        nome: dados.nome, cargo: dados.cargo, dataInicio: dados.dataInicio,
        perfilComportamental: dados.perfilComportamental, habilidades: dados.habilidades,
        expectativas: dados.expectativas, metasTexto: dados.metasTexto,
        desenvolvimento: dados.desenvolvimento, obs: dados.obs,
      };
      if (dados.email) { payload.email = dados.email; payload.senha = dados.senha; }
      return Api.criarLiderado(payload).then(mapLiderado);
    },
    aoImportarTudo(novos) {
      STATE.liderados.push(...novos);
      renderLiderados();
    },
  },
};

function baixarModeloPlanilha(tipoImportacao) {
  const cfg = IMPORTACOES[tipoImportacao];
  const cabecalho = cfg.colunas.map(c => c.header);
  const ws = XLSX.utils.aoa_to_sheet([cabecalho, cfg.linhaExemplo]);
  ws['!cols'] = cabecalho.map(h => ({ wch: Math.max(18, h.length) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, cfg.titulo.slice(0, 31));
  XLSX.writeFile(wb, `modelo-${tipoImportacao}.xlsx`);
}

let IMPORTACAO_EM_ANDAMENTO = null;

function processarArquivoImportado(tipoImportacao, file) {
  if (!file) return;
  const cfg = IMPORTACOES[tipoImportacao];
  const leitor = new FileReader();
  leitor.onload = e => {
    let linhas;
    try {
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      linhas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    } catch (err) {
      mostrarToast('Não foi possível ler essa planilha. Confira se é um arquivo .xlsx válido.', 'error');
      return;
    }
    if (linhas.length < 2) { mostrarToast('A planilha está vazia.', 'error'); return; }

    const cabecalho = linhas[0].map(normalizarTexto);
    const indices = cfg.colunas.map(c => cabecalho.indexOf(normalizarTexto(c.header)));

    const linhasProcessadas = linhas.slice(1)
      .filter(linha => linha.some(v => String(v == null ? '' : v).trim() !== ''))
      .map((linha, i) => {
        const dados = {};
        cfg.colunas.forEach((c, idx) => {
          const bruto = indices[idx] >= 0 ? linha[indices[idx]] : '';
          if (c.tipo === 'data') dados[c.campo] = excelParaDataISO(bruto);
          else if (c.tipo === 'hora') dados[c.campo] = excelParaHora(bruto);
          else if (c.tipo === 'opcao') dados[c.campo] = mapearOpcao(bruto, c.mapa);
          else dados[c.campo] = String(bruto == null ? '' : bruto).trim();
        });
        return { numero: i + 2, dados, erros: cfg.validar(dados) };
      });

    IMPORTACAO_EM_ANDAMENTO = { tipoImportacao, linhas: linhasProcessadas };
    mostrarPreviewImportacao();
  };
  leitor.readAsArrayBuffer(file);
}

function mostrarPreviewImportacao() {
  const { tipoImportacao, linhas } = IMPORTACAO_EM_ANDAMENTO;
  const cfg = IMPORTACOES[tipoImportacao];
  const validas = linhas.filter(l => l.erros.length === 0);
  const invalidas = linhas.filter(l => l.erros.length > 0);

  document.getElementById('modal-importar-titulo').textContent = `Importar — ${cfg.titulo}`;
  document.getElementById('modal-importar-resumo').textContent =
    `${linhas.length} linha(s) na planilha · ${validas.length} pronta(s) pra importar` +
    (invalidas.length ? ` · ${invalidas.length} com erro (serão ignoradas)` : '') + '.';

  document.getElementById('modal-importar-tabela').innerHTML = linhas.length === 0
    ? `<p class="label-hint">Nenhuma linha preenchida foi encontrada na planilha.</p>`
    : `<table class="tabela-importar-preview">
        <thead><tr><th>Linha</th><th>Resumo</th><th>Situação</th></tr></thead>
        <tbody>
          ${linhas.map(l => `
            <tr class="${l.erros.length ? 'linha-invalida' : ''}">
              <td>${l.numero}</td>
              <td>${cfg.resumo(l.dados)}</td>
              <td>${l.erros.length ? `<span class="erro-linha">⚠️ ${l.erros.join('; ')}</span>` : '<span class="ok-linha">✅ pronta</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  document.getElementById('modal-importar-confirmar').disabled = validas.length === 0;
  document.getElementById('modal-importar-planilha').style.display = 'flex';
}

function fecharModalImportar() {
  document.getElementById('modal-importar-planilha').style.display = 'none';
  IMPORTACAO_EM_ANDAMENTO = null;
}

function initImportarPlanilha() {
  document.getElementById('modal-importar-close').addEventListener('click', fecharModalImportar);
  document.getElementById('modal-overlay-importar-planilha').addEventListener('click', fecharModalImportar);
  document.getElementById('modal-importar-cancelar').addEventListener('click', fecharModalImportar);

  document.getElementById('modal-importar-confirmar').addEventListener('click', async () => {
    if (!IMPORTACAO_EM_ANDAMENTO) return;
    const { tipoImportacao, linhas } = IMPORTACAO_EM_ANDAMENTO;
    const cfg = IMPORTACOES[tipoImportacao];
    const validas = linhas.filter(l => l.erros.length === 0);
    if (!validas.length) return;

    const botao = document.getElementById('modal-importar-confirmar');
    const restaurar = iniciarCarregamentoBotao(botao, `Importando 0/${validas.length}...`);
    const importados = [];
    let falhas = 0;
    for (let i = 0; i < validas.length; i++) {
      botao.innerHTML = `<span class="spinner-inline"></span> Importando ${i + 1}/${validas.length}...`;
      try {
        importados.push(await cfg.importar(validas[i].dados));
      } catch (err) {
        falhas++;
      }
    }
    cfg.aoImportarTudo(importados);
    restaurar();
    fecharModalImportar();
    mostrarToast(
      falhas ? `${importados.length} importado(s), ${falhas} falharam.` : `${importados.length} registro(s) importado(s) com sucesso!`,
      falhas ? 'error' : 'success'
    );
  });
}

function initFormRotina() {
  document.getElementById('rt-data').value = hojeISO();
  document.getElementById('rt-data').addEventListener('change', renderTabelaRotina);

  document.getElementById('btn-agenda-semana-anterior').addEventListener('click', () => irParaSemanaAgenda(-1));
  document.getElementById('btn-agenda-semana-seguinte').addEventListener('click', () => irParaSemanaAgenda(1));
  document.getElementById('btn-agenda-semana-hoje').addEventListener('click', irParaSemanaAtualAgenda);

  document.getElementById('form-rotina').addEventListener('submit', async e => {
    e.preventDefault();
    const inicio = document.getElementById('rt-inicio').value;
    const fim = document.getElementById('rt-fim').value;
    const atividade = document.getElementById('rt-atividade').value.trim();
    const tipo = getTagValue('rt-tipo');
    if (!inicio || !fim || !atividade) { mostrarToast('Preencha horário de início, fim e a atividade.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione o tipo da atividade.', 'error'); return; }
    if (fim <= inicio) { mostrarToast('O horário de fim deve ser depois do início.', 'error'); return; }

    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Salvando...');
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
    } finally {
      restaurar();
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

// ============================================================
// PLANO DE AÇÃO / PROJETOS — tela própria (Passo 5 do material). Duas listas
// INDEPENDENTES (cada uma com seu próprio cadastro, edição e exclusão):
// - Projetos/Iniciativas (STATE.projetos): modelo "Estrutura de
//   Acompanhamento de Projetos e Iniciativas" do material impresso — nome,
//   objetivo, responsável, prazo, impedimentos, status, resultado esperado.
// - Plano de Ação (STATE.planoAcao): itens de ação — nome, responsável,
//   início/fim, meta, status, lições aprendidas.
// Não há vínculo 1:1 entre as duas — um item do Plano de Ação não "puxa"
// nome nem nenhum outro campo de um Projeto.
// ============================================================

// Opções de responsável reutilizadas por Projetos, Plano de Ação e Matriz —
// mesmo tri-estado 'eu'/liderado/não-atribuído usado em toda a tela.
function opcoesResponsavel(respAtual) {
  return `
    <option value="">— Não atribuído —</option>
    <option value="eu" ${respAtual === 'eu' ? 'selected' : ''}>👤 Eu (Líder)</option>
    ${STATE.liderados.map(l => `<option value="${l.id}" ${l.id === respAtual ? 'selected' : ''}>${l.nome}</option>`).join('')}
  `;
}

// Opções de status reutilizadas por Projetos e Plano de Ação — mesmo domínio
// novo/andamento/bloqueado/concluido em toda a tela.
function opcoesStatus(statusAtual) {
  return STATUS_ORDEM.map(k => `<option value="${k}" ${k === statusAtual ? 'selected' : ''}>${STATUS_CONFIG[k].label}</option>`).join('');
}

function renderProjetosIniciativas() {
  const container = document.getElementById('tabela-projetos-iniciativas');
  if (!container) return; // seção só existe na visão do líder

  if (STATE.projetos.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhum projeto/iniciativa cadastrado ainda.</p></div>`;
    return;
  }

  container.innerHTML = `
    <table class="tabela-simples tabela-plano">
      <thead><tr><th>Projeto / Iniciativa</th><th>Objetivo</th><th>Responsável</th><th>Prazo</th><th>Impedimentos</th><th>Status</th><th>Resultado Esperado</th><th></th></tr></thead>
      <tbody>
        ${STATE.projetos.map(p => `
          <tr data-id="${p.id}">
            <td><input type="text" data-campo="nome" value="${p.nome || ''}" placeholder="Nome do projeto/iniciativa" /></td>
            <td><input type="text" data-campo="objetivo" value="${p.objetivo || ''}" placeholder="O que se quer alcançar..." /></td>
            <td><select data-campo="responsavelId">${opcoesResponsavel(p.responsavelId)}</select></td>
            <td><input type="date" data-campo="prazo" value="${p.prazo || ''}" /></td>
            <td><input type="text" data-campo="impedimentos" value="${p.impedimentos || ''}" placeholder="O que pode travar..." /></td>
            <td><select data-campo="status">${opcoesStatus(p.status)}</select></td>
            <td><input type="text" data-campo="resultadoEsperado" value="${p.resultadoEsperado || ''}" placeholder="O que se espera entregar..." /></td>
            <td><button class="btn-icon btn-icon-sm btn-icon-danger" title="Remover" onclick="excluirLinhaProjeto('${p.id}')">🗑️</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  container.querySelectorAll('input[data-campo], select[data-campo]').forEach(el => {
    el.addEventListener('change', () => salvarCampoProjeto(el));
  });

  popularSelectAtividadeMatriz(); // nome/responsável do projeto podem ter mudado
}

async function salvarCampoProjeto(el) {
  const id = el.closest('tr').dataset.id;
  const item = STATE.projetos.find(p => p.id === id);
  if (!item) return;
  item[el.dataset.campo] = el.value;
  try {
    await Api.atualizarProjeto(id, { [el.dataset.campo]: el.value });
    popularSelectAtividadeMatriz();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function excluirLinhaProjeto(id) {
  try {
    await Api.excluirProjeto(id);
    STATE.projetos = STATE.projetos.filter(p => p.id !== id);
    renderProjetosIniciativas();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function renderPlanoAcaoItens() {
  const container = document.getElementById('tabela-acompanhamento-planos');
  if (!container) return;

  if (STATE.planoAcao.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Nenhum item de ação cadastrado ainda.</p></div>`;
  } else {
    const opcoesMeta = metaIdAtual => `<option value="">— Nenhuma —</option>` +
      STATE.metas.map(m => `<option value="${m.id}" ${m.id === metaIdAtual ? 'selected' : ''}>${m.nome}</option>`).join('');

    container.innerHTML = `
      <table class="tabela-simples tabela-plano">
        <thead><tr><th>Plano de Ação</th><th>Responsável</th><th>Início</th><th>Fim</th><th>Meta</th><th>Status</th><th>Lições Aprendidas</th><th></th></tr></thead>
        <tbody>
          ${STATE.planoAcao.map(p => `
            <tr data-id="${p.id}">
              <td><input type="text" data-campo="acao" value="${p.acao || ''}" placeholder="O que precisa ser feito?" /></td>
              <td><select data-campo="responsavelId">${opcoesResponsavel(p.responsavelId)}</select></td>
              <td><input type="date" data-campo="dataInicio" value="${p.dataInicio || ''}" /></td>
              <td><input type="date" data-campo="dataFim" value="${p.dataFim || ''}" /></td>
              <td><select data-campo="metaId">${opcoesMeta(p.metaId)}</select></td>
              <td><select data-campo="status">${opcoesStatus(p.status)}</select></td>
              <td><input type="text" data-campo="licoesAprendidas" value="${p.licoesAprendidas || ''}" placeholder="O que aprendemos..." /></td>
              <td><button class="btn-icon btn-icon-sm btn-icon-danger" title="Remover" onclick="excluirLinhaPlanoAcao('${p.id}')">🗑️</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    container.querySelectorAll('input[data-campo], select[data-campo]').forEach(el => {
      el.addEventListener('change', () => salvarCampoPlanoAcao(el));
    });
  }

  atualizarVinculoAtividade('a');
  atualizarVinculoAtividade('ma');
  popularSelectAtividadeMatriz(); // nome/responsável do item podem ter mudado
}

// Salva só o campo que mudou (PUT parcial de verdade).
async function salvarCampoPlanoAcao(el) {
  const tr = el.closest('tr');
  const id = tr.dataset.id;
  const item = STATE.planoAcao.find(p => p.id === id);
  if (!item) return;
  item[el.dataset.campo] = el.value;
  try {
    await Api.atualizarPlanoAcao(id, { [el.dataset.campo]: el.value });
    if (el.dataset.campo === 'acao') {
      atualizarVinculoAtividade('a');
      atualizarVinculoAtividade('ma');
    }
    renderDashboardPlanoAcao();
    popularSelectAtividadeMatriz();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function excluirLinhaPlanoAcao(id) {
  try {
    await Api.excluirPlanoAcao(id);
    STATE.planoAcao = STATE.planoAcao.filter(p => p.id !== id);
    STATE.atividades.forEach(a => { if (a.planoAcaoId === id) { a.planoAcaoId = ''; a.tipoVinculo = ''; } });
    renderPlanoAcaoItens();
    renderAtividades();
    renderDashboardPlanoAcao();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function initPlanoAcao() {
  document.getElementById('btn-add-projeto').addEventListener('click', async () => {
    try {
      const novo = mapProjeto(await Api.criarProjeto({ nome: '', ordem: STATE.projetos.length }));
      STATE.projetos.push(novo);
      renderProjetosIniciativas();
    } catch (err) { mostrarToast(err.message, 'error'); }
  });

  document.getElementById('btn-add-item-plano-acao').addEventListener('click', async () => {
    try {
      const novo = mapPlanoAcao(await Api.criarPlanoAcao({ acao: '', ordem: STATE.planoAcao.length }));
      STATE.planoAcao.push(novo);
      renderPlanoAcaoItens();
      renderDashboardPlanoAcao();
    } catch (err) { mostrarToast(err.message, 'error'); }
  });
}

function renderDashboardAll() {
  renderTabelaRotina();
  renderAgendaRotina();
  renderGraficoDashAtual();
  renderGraficoDashIdeal();
  renderGargalos();
  renderDashboardDesafios();
  renderDashboardMetas();
  renderDashboardPlanoAcao();
}

// Espelha as Metas & Indicadores no Dashboard: status de execução (item 5 —
// Execução e Acompanhamento) e o Mini-BSC agregado (item 3 — cada meta marca
// UMA perspectiva; aqui juntamos todas pra formar a visão das 4 juntas), lido
// direto de STATE.metas — mesma fonte da aba Metas, sem duplicar dado.
function renderDashboardMetas() {
  const badge = document.getElementById('dash-metas-badge');
  const vazio = document.getElementById('dash-metas-vazio');
  const conteudo = document.getElementById('dash-metas-conteudo');
  if (!badge) return;

  badge.textContent = STATE.metas.length;
  vazio.style.display = STATE.metas.length === 0 ? '' : 'none';
  conteudo.style.display = STATE.metas.length === 0 ? 'none' : '';
  if (STATE.metas.length === 0) return;

  const statusEl = document.getElementById('dash-metas-status');
  statusEl.innerHTML = Object.entries(EXECUCAO_STATUS_CONFIG).map(([chave, cfg]) => {
    const qtd = STATE.metas.filter(m => (m.statusExecucao || 'no_prazo') === chave).length;
    return `<div class="stat-card"><div class="stat-num" style="color:${cfg.cor}">${qtd}</div><div class="stat-label">${cfg.label}</div></div>`;
  }).join('');

  const bscEl = document.getElementById('dash-metas-bsc');
  bscEl.innerHTML = Object.entries(BSC_CONFIG).map(([chave, cfg]) => {
    const metasDaPerspectiva = STATE.metas.filter(m => m.perspectivaBsc === chave);
    return `
      <div class="dash-metas-bsc-quadrante" style="background:${cfg.bg}">
        <div class="dash-metas-bsc-quadrante-titulo" style="color:${cfg.cor}"><span>${cfg.label}</span><span>${metasDaPerspectiva.length}</span></div>
        ${metasDaPerspectiva.length
          ? `<ul>${metasDaPerspectiva.map(m => `<li>${m.nome}</li>`).join('')}</ul>`
          : `<p class="label-hint">Nenhuma meta marcada ainda.</p>`}
      </div>`;
  }).join('');
}

// "Atrasado" não é um status gravado — é calculado (prazo passou e o item
// não foi concluído) — mesma ideia de estaAtrasada() já usada em Atividades.
function planoAcaoAtrasado(p) {
  return !!p.dataFim && p.dataFim < hojeISO() && p.status !== 'concluido';
}

// Resumo do Plano de Ação no Dashboard: quantos itens em cada status (com
// "Atrasado" calculado por cima do prazo), mais os próximos vencimentos —
// lido direto de STATE.planoAcao, sem duplicar dado.
function renderDashboardPlanoAcao() {
  const badge = document.getElementById('dash-plano-acao-badge');
  const vazio = document.getElementById('dash-plano-acao-vazio');
  const conteudo = document.getElementById('dash-plano-acao-conteudo');
  if (!badge) return;

  badge.textContent = STATE.planoAcao.length;
  vazio.style.display = STATE.planoAcao.length === 0 ? '' : 'none';
  conteudo.style.display = STATE.planoAcao.length === 0 ? 'none' : '';
  if (STATE.planoAcao.length === 0) return;

  const atrasados = STATE.planoAcao.filter(planoAcaoAtrasado);
  const statusEl = document.getElementById('dash-plano-acao-status');
  const statusHtml = STATUS_ORDEM.map(k => {
    const qtd = STATE.planoAcao.filter(p => p.status === k && !planoAcaoAtrasado(p)).length;
    return `<div class="stat-card"><div class="stat-num" style="color:${STATUS_CONFIG[k].cor}">${qtd}</div><div class="stat-label">${STATUS_CONFIG[k].label}</div></div>`;
  }).join('');
  statusEl.innerHTML = statusHtml +
    `<div class="stat-card"><div class="stat-num" style="color:#e74c3c">${atrasados.length}</div><div class="stat-label">🔴 Atrasado</div></div>`;

  const proximasEl = document.getElementById('dash-plano-acao-proximas');
  const proximas = STATE.planoAcao
    .filter(p => p.dataFim && p.status !== 'concluido')
    .sort((a, b) => a.dataFim.localeCompare(b.dataFim))
    .slice(0, 5);

  proximasEl.innerHTML = proximas.length === 0
    ? `<p class="label-hint">Nenhuma entrega com prazo definido ainda.</p>`
    : proximas.map(p => {
        const atrasado = planoAcaoAtrasado(p);
        const resp = p.responsavelId === 'eu' ? 'Eu (Líder)' : (STATE.liderados.find(l => l.id === p.responsavelId)?.nome || '—');
        return `
          <div class="dash-plano-acao-item ${atrasado ? 'atrasado' : ''}">
            <span class="dash-plano-acao-item-nome">${p.acao || '(sem nome)'}</span>
            <span class="dash-plano-acao-item-resp">${resp}</span>
            <span class="dash-plano-acao-item-data">${atrasado ? '🔴' : '📅'} ${formatarData(p.dataFim)}</span>
          </div>`;
      }).join('');
}

// Espelha o progresso e a pontuação da trilha de Desafios direto no
// Dashboard, junto com um resumo rápido de gestão de pessoas — assim o líder
// não precisa trocar de seção pra ver como está andando.
function renderDashboardDesafios() {
  const badge = document.getElementById('dash-desafios-badge');
  const barra = document.getElementById('dash-desafios-barra');
  const statsEl = document.getElementById('dash-gestao-stats');
  if (!badge || !barra || !statsEl) return;

  const desafios = STATE.desafios;
  const concluidos = desafios.filter(d => d.concluido).length;
  const { pontosGanhos, pontosPossiveis } = calcularPontuacaoDesafios();
  badge.textContent = `${concluidos}/${desafios.length} · 🏆 ${pontosGanhos}/${pontosPossiveis} pts`;
  barra.style.width = desafios.length ? `${Math.round((concluidos / desafios.length) * 100)}%` : '0%';

  const totalLiderados = STATE.liderados.length;
  const comPerfil = STATE.liderados.filter(l => (l.perfil || '').trim()).length;
  const comFeedback = new Set(STATE.diarioResumoEquipe.filter(d => d.tipo === 'feedback').map(d => d.lideradoId)).size;

  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-num">${totalLiderados}</div><div class="stat-label">Liderados na equipe</div></div>
    <div class="stat-card"><div class="stat-num">${totalLiderados ? Math.round((comPerfil / totalLiderados) * 100) : 0}%</div><div class="stat-label">Com perfil preenchido</div></div>
    <div class="stat-card"><div class="stat-num">${comFeedback}</div><div class="stat-label">Já receberam feedback formal</div></div>
  `;
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

// #aa-mes é um <input type="date"> (o <input type="month"> antigo tinha
// suporte ruim em vários navegadores/celulares) — a autoavaliação continua
// mensal, então aqui é só pegar o "AAAA-MM" de qualquer data escolhida.
function mesRefAutoavaliacao() {
  const valor = document.getElementById('aa-mes').value;
  return valor ? valor.slice(0, 7) : mesAtualISO();
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
  const mes = mesRefAutoavaliacao();
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
    const mes = mesRefAutoavaliacao();
    try {
      await Api.salvarAutoavaliacao(mes, lerRespostasAutoavaliacao());
    } catch (err) { mostrarToast(err.message, 'error'); }
  }, 400);
}

function initAutoavaliacao() {
  renderAutoavaliacaoItens();
  document.getElementById('aa-mes').value = hojeISO();
  document.getElementById('aa-mes').addEventListener('change', carregarAutoavaliacaoDoMes);
  document.getElementById('autoavaliacao-itens').addEventListener('click', e => {
    if (e.target.closest('.tag-btn')) agendarSalvarAutoavaliacao();
  });
  document.getElementById('btn-gerar-analise').addEventListener('click', gerarAnaliseMelhoria);

  document.getElementById('modal-analise-close').addEventListener('click', fecharModalAnalise);
  document.getElementById('modal-overlay-analise').addEventListener('click', fecharModalAnalise);
  document.getElementById('modal-analise-fechar').addEventListener('click', fecharModalAnalise);
  document.getElementById('modal-analise-imprimir').addEventListener('click', gerarDocAnaliseMelhoria);
}

function fecharModalAnalise() {
  document.getElementById('modal-analise').style.display = 'none';
}

let ANALISE_MELHORIA_ATUAL = null;

async function gerarAnaliseMelhoria() {
  const mes = mesRefAutoavaliacao();
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

  ANALISE_MELHORIA_ATUAL = { mesLabel, estat, pontosAtencao, pontosPositivos };
}

// Monta a Análise de Melhoria como .docx de verdade (biblioteca docx.js, via
// CDN — mesma usada na Pauta - Roteiro de Apresentação), no lugar do antigo
// "Imprimir/Salvar PDF" via window.print(), que dependia do CSS de tela e
// bagunçava a paginação em outras exportações deste mesmo app.
function montarDocxAnaliseMelhoria() {
  const { Document, Paragraph, TextRun, HeadingLevel } = docx;
  const { mesLabel, estat, pontosAtencao, pontosPositivos } = ANALISE_MELHORIA_ATUAL;

  const COR_TITULO = '391694';
  const COR_TEXTO = '24153E';
  const COR_MUTED = '6F667E';
  const COR_ATENCAO = 'B9770E';
  const COR_POSITIVO = '1E8449';

  const paragrafo = (texto, opts = {}) => new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: texto || '', color: opts.color || COR_TEXTO, bold: !!opts.bold, size: 22 })],
  });

  const tituloSecao = titulo => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text: titulo, color: COR_TITULO, bold: true, size: 26 })],
  });

  const itemComDica = (texto, dica) => [
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 20 },
      children: [new TextRun({ text: texto, color: COR_TEXTO, bold: true, size: 22 })],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 140 },
      children: [new TextRun({ text: dica || '', color: COR_MUTED, italics: true, size: 20 })],
    }),
  ];

  const itemSimples = (texto, cor) => new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text: texto, color: cor, size: 22 })],
  });

  const secaoConexao = [];
  if (estat) {
    secaoConexao.push(
      tituloSecao('📅 Como anda sua conexão com o time'),
      paragrafo(`${estat.ultimos30Dias} conversa(s)/feedback(s) nos últimos 30 dias · ${estat.acumuladoAno} no acumulado do ano.`),
      paragrafo(
        estat.diasSemReuniao === null
          ? 'Você ainda não registrou nenhuma conversa com o time — comece pelo Diário de Bordo.'
          : estat.diasSemReuniao === 0
            ? 'Você registrou uma conversa com o time hoje.'
            : `Já são ${estat.diasSemReuniao} dia${estat.diasSemReuniao !== 1 ? 's' : ''} sem registrar uma conversa com o time.`
      )
    );
  }

  return new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `Análise de Melhoria — ${mesLabel}`, color: COR_TITULO, bold: true, size: 36 })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: `Gerado em ${formatarData(hojeISO())}`, color: COR_MUTED, size: 18 })],
        }),

        ...secaoConexao,

        tituloSecao(`⚠️ Pontos de atenção (${pontosAtencao.length})`),
        ...(pontosAtencao.length
          ? pontosAtencao.flatMap(p => itemComDica(p.texto, p.dica))
          : [paragrafo('Nenhum ponto de atenção identificado nas respostas deste mês.', { color: COR_POSITIVO })]),

        tituloSecao(`✅ Pontos fortes (${pontosPositivos.length})`),
        ...(pontosPositivos.length
          ? pontosPositivos.map(t => itemSimples(t, COR_POSITIVO))
          : [paragrafo('Responda a autoavaliação do mês pra ver seus pontos fortes aqui.', { color: COR_MUTED })]),
      ],
    }],
  });
}

async function gerarDocAnaliseMelhoria() {
  if (!ANALISE_MELHORIA_ATUAL) return;
  if (typeof docx === 'undefined') {
    mostrarToast('Não foi possível carregar o gerador de Word. Verifique sua conexão e tente novamente.', 'error');
    return;
  }
  const doc = montarDocxAnaliseMelhoria();
  const blob = await docx.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Analise de Melhoria - ${ANALISE_MELHORIA_ATUAL.mesLabel} - ${AUTH.user.nome}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// MÓDULO NOVO — ARQUIVOS DA AULA
// ============================================================
async function carregarArquivos() {
  try {
    STATE.arquivos = (await Api.listarArquivos()).map(mapArquivo);
  } catch (err) {
    STATE.arquivos = [];
  }
  renderArquivos();
}

// Agrupa por pasta preservando a ordem de chegada (mais recente primeiro,
// já que a API devolve ORDER BY criado_em DESC) — "Sem pasta" sempre por último.
function agruparPorPasta(lista) {
  const grupos = new Map();
  lista.forEach(a => {
    const chave = a.pasta || '';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(a);
  });
  const nomeadas = [...grupos.keys()].filter(k => k).sort((x, y) => x.localeCompare(y, 'pt-BR'));
  const ordem = grupos.has('') ? [...nomeadas, ''] : nomeadas;
  return ordem.map(chave => ({ pasta: chave || 'Sem pasta', itens: grupos.get(chave) }));
}

// Escapa texto pra caber com segurança dentro de um atributo HTML
// (data-nome etc.) — evita quebrar o HTML quando o nome do arquivo tem aspas.
function escapeAtributo(texto) {
  return String(texto || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// comAcoesAdmin: true só na visão do administrador (única que edita/exclui
// agora) — líder e liderado sempre veem a lista somente-leitura.
function htmlItemArquivo(a, comAcoesAdmin, opcoesVincularTurma) {
  return `
    <div class="arquivo-item">
      <span class="arquivo-icone">${iconeArquivo(a.tipoMime)}</span>
      <div class="arquivo-info">
        <div class="arquivo-nome">${a.nome}</div>
        <div class="arquivo-meta">${formatarTamanho(a.tamanhoBytes)} · ${formatarData(a.criadoEm?.split('T')[0])}</div>
        ${a.descricao ? `<div class="arquivo-desc">${a.descricao}</div>` : ''}
      </div>
      <div class="arquivo-acoes">
        <button class="btn-icon btn-baixar-arquivo" title="Baixar" data-id="${a.id}" data-nome="${escapeAtributo(a.nome)}">⬇️</button>
        ${comAcoesAdmin ? `
          <button class="btn-icon" title="Editar" onclick="editarArquivoAdmin('${a.id}')">✏️</button>
          ${opcoesVincularTurma ? `
            <select class="select-vincular" title="Vincular a outra turma" onchange="vincularArquivo('${a.id}', this.value); this.value='';">
              <option value="">🔗 Vincular a...</option>
              ${opcoesVincularTurma}
            </select>
          ` : ''}
          <button class="btn-icon btn-icon-danger" title="Remover desta turma" onclick="excluirArquivoAdminItem('${a.id}')">🗑️</button>
        ` : ''}
      </div>
    </div>`;
}

// comAcoesAdmin habilita editar/remover/vincular a outra turma — só faz
// sentido na visão do administrador, dentro de uma turma selecionada.
function renderListaArquivosAgrupada(containerId, lista, comAcoesAdmin, baseDownload = '/arquivos') {
  const container = document.getElementById(containerId);
  if (lista.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><p>${comAcoesAdmin ? 'Nenhum arquivo enviado ainda.' : 'Nenhum material disponível ainda.'}</p></div>`;
    return;
  }
  const opcoesVincularTurma = comAcoesAdmin
    ? STATE.turmas.filter(t => t.id !== STATE.turmaSelecionadaId).map(t => `<option value="${t.id}">${t.nome}</option>`).join('')
    : '';
  const grupos = agruparPorPasta(lista);
  container.innerHTML = grupos.map((g, i) => {
    const pastaReal = g.itens[0].pasta || '';
    return `
    <details class="pasta-grupo" open>
      <summary class="pasta-titulo">
        📁 ${g.pasta} <span class="badge">${g.itens.length}</span>
        ${opcoesVincularTurma ? `
          <select class="select-vincular select-vincular-pasta" title="Vincular pasta a outra turma" data-pasta="${escapeAtributo(pastaReal)}" onclick="event.stopPropagation()">
            <option value="">🔗 Vincular pasta a...</option>
            ${opcoesVincularTurma}
          </select>
          <select class="select-vincular select-transferir-pasta" title="Transferir pasta pra outra turma (fica uma cópia lá e outra aqui)" data-pasta="${escapeAtributo(pastaReal)}" onclick="event.stopPropagation()">
            <option value="">📦 Transferir (com cópia) pra...</option>
            ${opcoesVincularTurma}
          </select>
        ` : ''}
      </summary>
      ${g.itens.map(a => htmlItemArquivo(a, comAcoesAdmin, opcoesVincularTurma)).join('')}
    </details>
  `;
  }).join('');

  container.querySelectorAll('.btn-baixar-arquivo').forEach(btn => {
    btn.addEventListener('click', () => baixarArquivo(btn.dataset.id, btn.dataset.nome, btn, baseDownload));
  });
  container.querySelectorAll('.select-vincular-pasta').forEach(sel => {
    sel.addEventListener('change', () => { vincularPasta(sel.dataset.pasta, sel.value); sel.value = ''; });
  });
  container.querySelectorAll('.select-transferir-pasta').forEach(sel => {
    sel.addEventListener('change', () => { transferirPasta(sel.dataset.pasta, sel.value); sel.value = ''; });
  });
}

function renderArquivos() {
  document.getElementById('badge-total-arquivos').textContent = STATE.arquivos.length;
  renderListaArquivosAgrupada('lista-arquivos', STATE.arquivos, false);
}

async function carregarArquivosTurma() {
  try {
    STATE.arquivosTurma = (await Api.listarArquivosTurma()).map(mapArquivo);
  } catch (err) {
    STATE.arquivosTurma = [];
  }
  renderArquivosTurma();
}

function renderArquivosTurma() {
  document.getElementById('badge-arquivos-turma').textContent = STATE.arquivosTurma.length;
  renderListaArquivosAgrupada('lista-arquivos-turma', STATE.arquivosTurma, false);
}

// ============================================================
// ÁREA INDIVIDUAL (visão do líder) — o que o Trainer mandou só pra ele,
// separado dos Arquivos da Aula (abertos pra turma toda).
// ============================================================
async function carregarMensagensIndividuais() {
  try {
    STATE.mensagensIndividuais = (await Api.listarMensagensRecebidas()).map(mapMensagemIndividual);
  } catch (err) {
    STATE.mensagensIndividuais = [];
  }
  try {
    STATE.arquivosIndividuais = (await Api.listarArquivosIndividuaisRecebidos()).map(mapArquivo);
  } catch (err) {
    STATE.arquivosIndividuais = [];
  }
  renderMensagensIndividuais();

  // Ver a lista já conta como "ler" — marca em segundo plano, sem travar a tela.
  STATE.mensagensIndividuais.filter(m => !m.lida).forEach(m => {
    Api.marcarMensagemLida(m.id).then(() => { m.lida = true; }).catch(() => {});
  });
}

function renderMensagensIndividuais() {
  document.getElementById('badge-individual').textContent = STATE.mensagensIndividuais.length + STATE.arquivosIndividuais.length;

  const listaMsg = document.getElementById('lista-mensagens-individuais');
  listaMsg.innerHTML = STATE.mensagensIndividuais.length === 0
    ? `<div class="empty-state"><div class="empty-icon">💬</div><p>Nenhuma mensagem do Trainer ainda.</p></div>`
    : STATE.mensagensIndividuais.map(m => `
      <div class="mensagem-individual-item ${m.lida ? '' : 'nao-lida'}">
        <div class="mensagem-individual-topo">
          <strong>${m.titulo}</strong>
          <span class="mensagem-individual-data">${formatarData(m.criadoEm?.split('T')[0])}</span>
        </div>
        <p>${m.mensagem}</p>
      </div>
    `).join('');

  renderListaArquivosAgrupada('lista-arquivos-individuais', STATE.arquivosIndividuais, false, '/individual/arquivos');
}

// ============================================================
// PLANO DE GESTÃO — "Passo 1: Criação do Plano" + Diagnóstico
// (Desafios e Oportunidades) do material oficial do Instituto
// ============================================================
// Mostra (ou esconde, se vazio) a resposta atual salva de um campo-avulso
// acima do formulário de preenchimento — mesmo padrão visual do Diagnóstico
// (diagnostico-item), só que aqui é um valor único, não uma lista: "incluir"
// substitui a resposta anterior em vez de somar mais um item.
function atualizarRespostaAtualCampo(campo, valor) {
  const el = document.querySelector(`.campo-resposta-atual[data-campo="${campo}"]`);
  if (!el) return;
  if (valor) {
    el.querySelector('span').textContent = valor;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

function renderPlanoGestao() {
  const p = STATE.planoGestao;
  const campo = document.getElementById('pg-expectativas');
  if (!p || !campo) return; // seção só existe na visão do líder

  [
    ['expectativasAno', 'pg-expectativas'], ['visaoMissao', 'pg-visao'], ['pontosFortesEquipe', 'pg-pontos-fortes'],
    ['metaDesempenho', 'pg-desempenho'], ['metaProcessos', 'pg-processos'], ['lemaDoAno', 'pg-lema'], ['combinados', 'pg-combinados'],
    ['deOndeViemos', 'av-de-onde-viemos'], ['comoNosGuiamos', 'av-como-guiamos'], ['paraQuemValor', 'av-para-quem'],
    ['oQueDaPoder', 'av-o-que-poder'], ['paraOndeVamos', 'av-para-onde'],
  ].forEach(([nomeCampo, idInput]) => {
    atualizarRespostaAtualCampo(nomeCampo, p[nomeCampo]);
    document.getElementById(idInput).value = ''; // o campo fica livre pra uma nova resposta, como no Diagnóstico
  });

  renderRecapPlano();
}

// Cada listener é preso separado (initSeguro) — se um bloco falhar (elemento
// não encontrado, erro qualquer), os outros formulários da mesma tela
// continuam funcionando em vez de nenhum deles responder ao clique. Sem
// isso, um erro em qualquer bloco anterior impedia os de baixo de sequer
// registrar o listener — e um <button type="submit"> sem handler nenhum faz
// o navegador submeter o form de verdade (recarrega a página e perde tudo).
function initPlanoGestao() {
  // Cada campo da Criação do Plano e da Ferramenta Avião é seu próprio
  // formulário (mesmo espírito do Diagnóstico: adicionar/salvar cada resposta
  // por conta própria, em vez de um formulário gigante com um botão só —
  // além de mais robusto, um campo falhar não trava os outros).
  initSeguro('formsCampoUnico', () => {
    document.querySelectorAll('.form-campo-unico').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const campo = form.dataset.campo;
        const input = form.querySelector('textarea, input');
        const valor = input.value.trim();
        if (!valor) return; // mesmo comportamento do Diagnóstico: não inclui resposta vazia
        const ehAviao = form.classList.contains('form-campo-aviao');
        const restaurar = iniciarCarregamentoBotao(form.querySelector('button[type=submit]'), 'Incluindo...');
        try {
          STATE.planoGestao = mapPlanoGestao(await Api.salvarPlanoGestao({ [campo]: valor }));
          atualizarRespostaAtualCampo(campo, valor);
          input.value = '';
          renderRecapPlano();
          destacarRecapPlano();
          const marcados = await marcarDesafiosDaSecaoConcluidos(ehAviao ? 'plano-apresentacao' : 'plano-criacao');
          mostrarToast(marcados ? `Incluído! ${marcados} desafio(s) da trilha marcado(s) como concluído.` : 'Incluído!');
        } catch (err) {
          mostrarToast(err.message, 'error');
        } finally {
          restaurar();
        }
      });
    });
  });

  initSeguro('botoesApresentacaoPlano', () => {
    document.getElementById('btn-gerar-apresentacao-plano').addEventListener('click', gerarApresentacaoPlano);
    document.getElementById('modal-plano-apresentacao-close').addEventListener('click', fecharModalApresentacaoPlano);
    document.getElementById('modal-overlay-plano-apresentacao').addEventListener('click', fecharModalApresentacaoPlano);
    document.getElementById('modal-plano-apresentacao-fechar').addEventListener('click', fecharModalApresentacaoPlano);
    document.getElementById('modal-plano-apresentacao-imprimir').addEventListener('click', gerarDocApresentacaoPlano);
  });

  initSeguro('formsDiagnostico', () => {
    document.querySelectorAll('.diagnostico-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const input = form.querySelector('input');
        const texto = input.value.trim();
        if (!texto) return;
        const tipo = form.dataset.tipo;
        try {
          const novo = mapDiagnostico(await Api.criarDiagnostico({ tipo, texto, ordem: STATE.diagnostico.filter(d => d.tipo === tipo).length }));
          STATE.diagnostico.push(novo);
          renderDiagnostico();
          renderRecapPlano();
          input.value = '';
          input.focus();
          await marcarDesafiosDaSecaoConcluidos('diagnostico');
        } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
  });
}

function fecharModalApresentacaoPlano() {
  document.getElementById('modal-plano-apresentacao').style.display = 'none';
}

// Conteúdo compartilhado entre o recap inline (aba Apresentação) e o modal de
// impressão — visão, metas do ano, combinados, diagnóstico e as 5 respostas
// da Ferramenta Avião, tudo junto (é o que vai ser apresentado pra equipe).
function montarHtmlApresentacaoPlano() {
  const p = STATE.planoGestao || mapPlanoGestao({});
  const desafios = STATE.diagnostico.filter(d => d.tipo === 'desafio');
  const oportunidades = STATE.diagnostico.filter(d => d.tipo === 'oportunidade');
  const listaLinhas = texto => (texto || '').split('\n').map(l => l.trim()).filter(Boolean);

  return `
    <div class="resumo-cabecalho">
      <h2>${AUTH.user.nome}</h2>
      <p class="resumo-periodo-label">Plano de Gestão · Gerado em ${formatarData(hojeISO())}</p>
    </div>

    ${p.visaoMissao ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">🧭 Visão e Missão</div><p>${p.visaoMissao}</p></div>` : ''}
    ${p.lemaDoAno ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">🎯 Lema do Ano</div><p>${p.lemaDoAno}</p></div>` : ''}

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">📋 As expectativas para esse ano</div>
      ${listaLinhas(p.expectativasAno).length ? `<ul class="resumo-lista-atividades">${listaLinhas(p.expectativasAno).map(l => `<li>${l}</li>`).join('')}</ul>` : '<p>Ainda não preenchido.</p>'}
    </div>

    ${p.pontosFortesEquipe ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">⭐ 3 Pontos Fortes da Equipe</div><p>${p.pontosFortesEquipe}</p></div>` : ''}

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">📈 Metas e Objetivos</div>
      ${p.metaDesempenho ? `<p><strong>1) Desempenho:</strong> ${p.metaDesempenho}</p>` : ''}
      ${p.metaProcessos ? `<p><strong>2) Processos:</strong> ${p.metaProcessos}</p>` : ''}
      ${(!p.metaDesempenho && !p.metaProcessos) ? '<p>Ainda não preenchido.</p>' : ''}
    </div>

    ${p.combinados ? `<div class="detalhe-secao"><div class="detalhe-secao-titulo">🤝 Combinados</div><p>${p.combinados}</p></div>` : ''}

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">🧭 Diagnóstico — Desafios e Oportunidades</div>
      <div class="apresentacao-diagnostico-grid">
        <div>
          <strong>⚠️ Desafios</strong>
          ${desafios.length ? `<ul class="resumo-lista-atividades">${desafios.map(d => `<li>${d.texto}</li>`).join('')}</ul>` : '<p>Nenhum registrado ainda.</p>'}
        </div>
        <div>
          <strong>💡 Oportunidades</strong>
          ${oportunidades.length ? `<ul class="resumo-lista-atividades">${oportunidades.map(d => `<li>${d.texto}</li>`).join('')}</ul>` : '<p>Nenhuma registrada ainda.</p>'}
        </div>
      </div>
    </div>

    <div class="detalhe-secao">
      <div class="detalhe-secao-titulo">✈️ Ferramenta Avião — Anatomia do Alinhamento</div>
      <p><strong>De onde viemos?</strong> ${p.deOndeViemos || 'Ainda não preenchido.'}</p>
      <p><strong>Como nos guiamos?</strong> ${p.comoNosGuiamos || 'Ainda não preenchido.'}</p>
      <p><strong>Para quem desempenhamos valor?</strong> ${p.paraQuemValor || 'Ainda não preenchido.'}</p>
      <p><strong>O que nos dá poder?</strong> ${p.oQueDaPoder || 'Ainda não preenchido.'}</p>
      <p><strong>Para onde vamos?</strong> ${p.paraOndeVamos || 'Ainda não preenchido.'}</p>
    </div>
  `;
}

function renderRecapPlano() {
  const container = document.getElementById('recap-plano-gestao');
  if (!container) return;
  container.innerHTML = montarHtmlApresentacaoPlano();
}

// Gera a Pauta - Roteiro de Apresentação como um .docx de verdade (biblioteca
// docx, via CDN — window.docx), não mais HTML impresso nem HTML-como-.doc: o
// .doc antigo (HTML com namespace do Word) não abria de forma confiável no
// Word para Mac/Pages, e o "Imprimir/Salvar PDF" do navegador bagunçava a
// paginação (blocos vazios enormes, seções cortadas) por herdar CSS de tela.
// Monta o roteiro no formato padrão do Instituto (Propósito, Participantes,
// Pauta, Conteúdo do Plano, Itens de Ação, Próxima Reunião) preenchido com o
// conteúdo do Plano de Gestão — pronto para guiar a reunião de apresentação.
function montarDocxPautaApresentacao() {
  const {
    Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
    ShadingType, WidthType, AlignmentType, BorderStyle, VerticalAlign,
  } = docx;

  const COR_TITULO = '391694';
  const COR_TEXTO = '24153E';
  const COR_MUTED = '6F667E';
  const COR_BORDA = 'D9D3EC';

  const p = STATE.planoGestao || mapPlanoGestao({});
  const desafios = STATE.diagnostico.filter(d => d.tipo === 'desafio');
  const oportunidades = STATE.diagnostico.filter(d => d.tipo === 'oportunidade');
  const listaLinhas = texto => (texto || '').split('\n').map(l => l.trim()).filter(Boolean);
  const NAO_PREENCHIDO = 'Ainda não preenchido.';

  const bordaFina = { style: BorderStyle.SINGLE, size: 4, color: COR_BORDA };
  const bordasCelula = { top: bordaFina, bottom: bordaFina, left: bordaFina, right: bordaFina };

  const paragrafo = (texto, opts = {}) => new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: texto || '', color: COR_TEXTO, bold: !!opts.bold, size: 22 })],
  });

  const itemLista = texto => new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: texto, color: COR_TEXTO, size: 22 })],
  });

  const tituloSecao = (n, titulo) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COR_BORDA, space: 4 } },
    children: [new TextRun({ text: `${n}. ${titulo}`, color: COR_TITULO, bold: true, size: 28 })],
  });

  const subTitulo = titulo => new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: titulo, color: COR_TITULO, bold: true, size: 22 })],
  });

  const nota = texto => new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: texto, color: COR_MUTED, italics: true, size: 18 })],
  });

  // Largura útil da página (Letter, margens padrão de 1" = 1440 twips de
  // cada lado): 12240 - 2*1440 = 9360 twips. Usamos DXA (twips) explícito
  // em vez de WidthType.PERCENTAGE porque esta versão do docx.js grava
  // "100%" literal no XML (w:w="100%"), que não é um valor válido de
  // ST_MeasurementOrPercent — o Word ignora a tabela e some com um layout
  // mínimo de ~100 twips por coluna, deixando tudo espremido à esquerda.
  const LARGURA_PAGINA_TWIPS = 9360;

  const celulaTexto = (texto, largura, opts = {}) => new TableCell({
    width: { size: largura, type: WidthType.DXA },
    borders: bordasCelula,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.cabecalho ? { type: ShadingType.CLEAR, fill: COR_TITULO } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({
        text: texto || '',
        color: opts.cabecalho ? 'FFFFFF' : COR_TEXTO,
        bold: !!opts.cabecalho,
        size: 20,
      })],
    })],
  });

  // `larguras` distribui LARGURA_PAGINA_TWIPS entre as colunas; se omitido,
  // divide igualmente pelo nº de colunas do cabeçalho.
  const tabela = (cabecalhos, linhas, larguras) => {
    const colunas = larguras || cabecalhos.map(() => Math.floor(LARGURA_PAGINA_TWIPS / cabecalhos.length));
    return new Table({
      width: { size: LARGURA_PAGINA_TWIPS, type: WidthType.DXA },
      columnWidths: colunas,
      rows: [
        new TableRow({ children: cabecalhos.map((c, i) => celulaTexto(c, colunas[i], { cabecalho: true })) }),
        ...linhas.map(linha => new TableRow({ children: linha.map((c, i) => celulaTexto(c, colunas[i])) })),
      ],
    });
  };

  const participantesLinhas = STATE.liderados.length
    ? STATE.liderados.map(l => [l.nome, l.cargo, l.email, '', ''])
    : [['', '', '', '', '']];

  const acoesComTexto = STATE.planoAcao.filter(a => a.acao);
  const acoesLinhas = acoesComTexto.length
    ? acoesComTexto.map(a => [a.acao, '', a.prazo || '', ''])
    : [['', '', '', '']];

  const blocosDiagnostico = [
    subTitulo('Diagnóstico — Desafios'),
    ...(desafios.length ? desafios.map(d => itemLista(d.texto)) : [paragrafo('Nenhum registrado ainda.')]),
    subTitulo('Diagnóstico — Oportunidades'),
    ...(oportunidades.length ? oportunidades.map(d => itemLista(d.texto)) : [paragrafo('Nenhuma registrada ainda.')]),
  ];

  const blocosMetas = [];
  if (p.metaDesempenho) blocosMetas.push(paragrafo(`1) Desempenho: ${p.metaDesempenho}`));
  if (p.metaProcessos) blocosMetas.push(paragrafo(`2) Processos: ${p.metaProcessos}`));
  if (!p.metaDesempenho && !p.metaProcessos) blocosMetas.push(paragrafo(NAO_PREENCHIDO));

  const linhasExpectativas = listaLinhas(p.expectativasAno);

  return new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: 'Pauta - Roteiro de Apresentação', color: COR_TITULO, bold: true, size: 40 })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: `Gerado em ${formatarData(hojeISO())}`, color: COR_MUTED, size: 18 })],
        }),

        tabela(['', ''], [
          [`Data da Reunião:`, `Local:`],
          [`Hora de Início:`, `Hora de Término:`],
          [`Redator: ${AUTH.user.nome}`, ''],
        ]),

        tituloSecao(1, 'Propósito da Reunião'),
        paragrafo('Apresentar o Plano de Gestão do ano à equipe e alinhar visão, metas, combinados e próximos passos.'),

        tituloSecao(2, 'Participantes'),
        nota('(adicione linhas conforme necessário)'),
        tabela(['Nome', 'Cargo', 'E-mail', 'Telefone', 'Assinatura'], participantesLinhas, [2200, 1600, 2400, 1560, 1600]),

        tituloSecao(3, 'Pauta da Reunião'),
        ...[
          'Abertura e diagnóstico — Desafios e Oportunidades da equipe/área',
          'Visão, Missão e Lema do Ano',
          'Metas e Objetivos (Desempenho e Processos)',
          'Combinados da equipe',
          'Ferramenta Avião — Anatomia do Alinhamento',
          'Itens de ação e próximos passos',
        ].map(itemLista),

        tituloSecao(4, 'Conteúdo do Plano de Gestão'),
        ...blocosDiagnostico,
        subTitulo('Visão e Missão'),
        paragrafo(p.visaoMissao || NAO_PREENCHIDO),
        subTitulo('Lema do Ano'),
        paragrafo(p.lemaDoAno || NAO_PREENCHIDO),
        subTitulo('Expectativas para esse ano'),
        ...(linhasExpectativas.length ? linhasExpectativas.map(itemLista) : [paragrafo(NAO_PREENCHIDO)]),
        subTitulo('3 Pontos Fortes da Equipe'),
        paragrafo(p.pontosFortesEquipe || NAO_PREENCHIDO),
        subTitulo('Metas e Objetivos'),
        ...blocosMetas,
        subTitulo('Combinados'),
        paragrafo(p.combinados || NAO_PREENCHIDO),
        subTitulo('Ferramenta Avião — Anatomia do Alinhamento'),
        paragrafo(`De onde viemos? ${p.deOndeViemos || NAO_PREENCHIDO}`),
        paragrafo(`Como nos guiamos? ${p.comoNosGuiamos || NAO_PREENCHIDO}`),
        paragrafo(`Para quem desempenhamos valor? ${p.paraQuemValor || NAO_PREENCHIDO}`),
        paragrafo(`O que nos dá poder? ${p.oQueDaPoder || NAO_PREENCHIDO}`),
        paragrafo(`Para onde vamos? ${p.paraOndeVamos || NAO_PREENCHIDO}`),

        tituloSecao(5, 'Itens de Ação'),
        nota('(adicione linhas conforme necessário)'),
        tabela(['Ação', 'Responsável', 'Data Esperada', 'Situação'], acoesLinhas, [3600, 2200, 1800, 1760]),

        tituloSecao(6, 'Próxima Reunião'),
        nota('[Opcional]'),
        tabela(['', ''], [['Data:', 'Hora:'], ['Local:', '']]),
      ],
    }],
  });
}

// Baixa a Pauta - Roteiro de Apresentação como .docx de verdade (via docx.js,
// carregado por CDN em index.html) — abre corretamente no Word, LibreOffice,
// Google Docs e Pages (Mac), diferente do antigo .doc HTML.
async function gerarDocApresentacaoPlano() {
  if (typeof docx === 'undefined') {
    mostrarToast('Não foi possível carregar o gerador de Word. Verifique sua conexão e tente novamente.', 'error');
    return;
  }
  const doc = montarDocxPautaApresentacao();
  const blob = await docx.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Pauta - Roteiro de Apresentacao - ${AUTH.user.nome}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Depois de salvar (Criação do Plano ou Ferramenta Avião), o recap fica lá em
// cima — fora da tela pra quem está com o formulário aberto embaixo. Rola até
// ele e pisca a borda, senão o toast passa despercebido e parece que salvar
// "não fez nada".
function destacarRecapPlano() {
  const card = document.getElementById('recap-plano-gestao')?.closest('.card');
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.remove('card-destaque');
  void card.offsetWidth; // força reflow pra reiniciar a animação se já rodou antes
  card.classList.add('card-destaque');
}

// Reaproveita o mesmo modal+CSS de impressão já usados no Resumo p/ Feedback
// e na Análise de Melhoria.
function gerarApresentacaoPlano() {
  document.getElementById('modal-plano-apresentacao-body').innerHTML = montarHtmlApresentacaoPlano();
  document.getElementById('modal-plano-apresentacao').style.display = 'flex';
}

function renderDiagnostico() {
  const containerDesafio = document.getElementById('lista-diagnostico-desafio');
  const containerOportunidade = document.getElementById('lista-diagnostico-oportunidade');
  if (!containerDesafio || !containerOportunidade) return;

  const render = (container, tipo) => {
    const itens = STATE.diagnostico.filter(d => d.tipo === tipo);
    container.innerHTML = itens.length === 0
      ? `<p class="label-hint">Nenhum item ainda.</p>`
      : itens.map(d => `
        <div class="diagnostico-item">
          <span>${d.texto}</span>
          <button type="button" class="btn-icon btn-icon-sm btn-icon-danger" title="Remover" onclick="excluirDiagnostico('${d.id}')">🗑️</button>
        </div>
      `).join('');
  };
  render(containerDesafio, 'desafio');
  render(containerOportunidade, 'oportunidade');
}

async function excluirDiagnostico(id) {
  try {
    await Api.excluirDiagnostico(id);
    STATE.diagnostico = STATE.diagnostico.filter(d => d.id !== id);
    renderDiagnostico();
    renderRecapPlano();
  } catch (err) { mostrarToast(err.message, 'error'); }
}

// ============================================================
// RENDERIZAÇÃO GERAL / INICIALIZAÇÃO
// ============================================================
// DESAFIOS DO LÍDER — trilha de passo a passo (parametrizável) +
// painel consolidado da equipe
// ============================================================
// A trilha em si (STATE.desafios) é 100% definida pelo líder — uma seed
// padrão entra na conta na hora do cadastro (ver desafiosPadrao()), e a tela
// de Parametrização deixa adicionar, editar, reordenar e remover itens.
// "Concluído" é um checkbox manual (não é calculado a partir de outros
// módulos), porque um desafio pode ser qualquer coisa que o líder queira
// acompanhar — inclusive uma funcionalidade que ainda nem existe no planner.
const SECOES_DESAFIO = {
  liderados: 'Liderados',
  diagnostico: 'Plano de Gestão — 1. Diagnóstico',
  'plano-criacao': 'Plano de Gestão — 2. Criação do Plano',
  'plano-apresentacao': 'Plano de Gestão — 3. Apresentação',
  plano: 'Plano de Gestão', // legado — desafios criados antes das 3 abas existirem
  diario: 'Diário de Bordo', atividades: 'Atividades',
  metas: 'Metas', matriz: 'Prioridades', dashboard: 'Dashboard', aula: 'Arquivos da Aula',
};

// As 3 sub-etapas do Plano de Gestão vivem todas na mesma página
// (section-plano), só mudando a subaba — "plano" (legado) cai na 1ª por padrão.
// "plano" (legado) não entra aqui de propósito — cai no fallback por título
// dentro de irParaSecaoDesafio, senão os 3 desafios antigos empurrariam todo
// mundo pra mesma aba.
const SUBTAB_DO_SECAO_DESAFIO = { diagnostico: 'diagnostico', 'plano-criacao': 'criacao', 'plano-apresentacao': 'apresentacao' };

// Recebe o id (não o secaoAlvo direto) pra poder cair pro título quando o
// desafio ainda tem a tag genérica "plano" de antes das 3 abas existirem —
// sem isso, todo desafio criado antes dessa mudança levaria pra mesma aba.
function irParaSecaoDesafio(desafioId) {
  const d = STATE.desafios.find(x => x.id === desafioId);
  if (!d || !d.secaoAlvo) return;

  let subview = SUBTAB_DO_SECAO_DESAFIO[d.secaoAlvo];
  if (!subview && d.secaoAlvo === 'plano') {
    const t = (d.titulo || '').toLowerCase();
    subview = t.includes('apresent') ? 'apresentacao' : t.includes('cri') ? 'criacao' : 'diagnostico';
  }

  const pagina = (d.secaoAlvo in SUBTAB_DO_SECAO_DESAFIO || d.secaoAlvo === 'plano') ? 'plano' : d.secaoAlvo;
  irParaSecao(pagina);
  if (subview) {
    const btn = document.querySelector(`#section-plano .subtab-btn[data-subview="${subview}"]`);
    if (btn) btn.click();
  }
}

function somarDias(dataISO, dias) {
  const d = new Date(dataISO + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Segue o "Passo a Passo do Líder" oficial do Instituto (EQUIPE → DIAGNÓSTICO →
// PLANEJAMENTO → MONITORAMENTO → FEEDBACK → ENTREGA → GESTÃO). Os prazos são
// sugestões relativas ao dia do cadastro — o líder ajusta como quiser depois.
function desafiosPadrao() {
  const hoje = hojeISO();
  return [
    { titulo: 'Monte sua equipe', descricao: 'Cadastre pelo menos um liderado.', secaoAlvo: 'liderados', prazo: somarDias(hoje, 7), pontos: 10 },
    { titulo: 'Conheça cada liderado', descricao: 'Preencha o perfil comportamental de todos os liderados cadastrados.', secaoAlvo: 'liderados', prazo: somarDias(hoje, 14), pontos: 10 },
    { titulo: 'Faça o brainstorm de Desafios e Oportunidades', descricao: 'Diagnóstico: liste os principais desafios e oportunidades da sua equipe/área.', secaoAlvo: 'diagnostico', prazo: somarDias(hoje, 14), pontos: 15 },
    { titulo: 'Crie seu Plano de Gestão', descricao: 'Expectativas do ano, visão e missão, pontos fortes da equipe, metas do ano e combinados.', secaoAlvo: 'plano-criacao', prazo: somarDias(hoje, 21), pontos: 15 },
    { titulo: 'Defina metas organizacionais', descricao: 'Cadastre ao menos uma meta ou indicador.', secaoAlvo: 'metas', prazo: somarDias(hoje, 21), pontos: 10 },
    { titulo: 'Vincule atividades às metas', descricao: 'Cadastre uma atividade ligada a uma meta.', secaoAlvo: 'atividades', prazo: somarDias(hoje, 28), pontos: 10 },
    { titulo: 'Priorize com a Matriz', descricao: 'Adicione ao menos um item na Matriz de Prioridades.', secaoAlvo: 'matriz', prazo: somarDias(hoje, 28), pontos: 10 },
    { titulo: 'Registre sua rotina diária', descricao: 'Lance ao menos um bloco de tempo na sua rotina, dentro do Dashboard.', secaoAlvo: 'dashboard', prazo: somarDias(hoje, 30), pontos: 5 },
    { titulo: 'Registre no Diário de Bordo', descricao: 'Faça seu primeiro registro de observação ou feedback com um liderado.', secaoAlvo: 'diario', prazo: somarDias(hoje, 30), pontos: 10 },
    { titulo: 'Monte seu Plano de Ação', descricao: 'Defina ao menos uma ação no Plano de Ação, dentro do Dashboard.', secaoAlvo: 'dashboard', prazo: somarDias(hoje, 35), pontos: 10 },
    { titulo: 'Apresente seu Plano de Gestão à equipe', descricao: 'Entrega: preencha a Ferramenta Avião e gere a apresentação do plano pra compartilhar com o time.', secaoAlvo: 'plano-apresentacao', prazo: somarDias(hoje, 35), pontos: 15 },
    { titulo: 'Faça sua Autoavaliação mensal', descricao: 'Gestão: responda a autoavaliação e gere sua Análise de Melhoria, dentro do Dashboard.', secaoAlvo: 'dashboard', prazo: somarDias(hoje, 30), pontos: 10 },
  ].map((item, i) => ({ ...item, ordem: i }));
}

function statusPrazoDesafio(d) {
  if (d.concluido) {
    return desafioNoPrazo(d)
      ? { texto: `✅ No prazo · +${d.pontos} pts`, classe: 'desafio-tag-ok' }
      : { texto: '⚠️ Concluído com atraso · 0 pts', classe: 'desafio-tag-atraso' };
  }
  if (d.prazo && d.prazo < hojeISO()) {
    return { texto: `⏰ Atrasado desde ${formatarData(d.prazo)}`, classe: 'desafio-tag-atraso' };
  }
  if (d.prazo) {
    return { texto: `Prazo: ${formatarData(d.prazo)}`, classe: 'desafio-tag-prazo' };
  }
  return null;
}

function renderDesafios() {
  const badge = document.getElementById('desafios-progresso-badge');
  const barra = document.getElementById('desafios-barra-preenchida');
  const lista = document.getElementById('lista-desafios');
  if (!badge || !barra || !lista) return; // seção só existe na visão do líder

  const desafios = STATE.desafios;
  const concluidos = desafios.filter(d => d.concluido).length;
  const { pontosGanhos, pontosPossiveis } = calcularPontuacaoDesafios();
  badge.textContent = `${concluidos}/${desafios.length} · 🏆 ${pontosGanhos}/${pontosPossiveis} pts`;
  barra.style.width = desafios.length ? `${Math.round((concluidos / desafios.length) * 100)}%` : '0%';

  if (desafios.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Nenhum desafio parametrizado ainda.<br>Clique em "⚙️ Parametrizar" para montar sua trilha.</p></div>`;
  } else {
    lista.innerHTML = desafios.map(d => {
      const status = statusPrazoDesafio(d);
      return `
      <div class="desafio-card ${d.concluido ? 'desafio-concluido' : ''}">
        <button type="button" class="desafio-check" title="${d.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}" onclick="toggleDesafioConcluido('${d.id}')">${d.concluido ? '✅' : '⬜'}</button>
        <div class="desafio-corpo">
          <div class="desafio-titulo">${d.titulo}</div>
          ${d.descricao ? `<p class="desafio-descricao">${d.descricao}</p>` : ''}
          ${status ? `<span class="desafio-tag ${status.classe}">${status.texto}</span>` : ''}
        </div>
        <div class="desafio-acao">
          ${d.secaoAlvo ? `<button type="button" class="btn-secondary" onclick="irParaSecaoDesafio('${d.id}')">Ir para ${SECOES_DESAFIO[d.secaoAlvo] || 'lá'}</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  renderConsolidado();
  renderDashboardDesafios();
}

async function toggleDesafioConcluido(id) {
  const item = STATE.desafios.find(d => d.id === id);
  if (!item) return;
  item.concluido = !item.concluido;
  renderDesafios();
  try {
    await Api.atualizarDesafio(id, { concluido: item.concluido });
  } catch (err) {
    item.concluido = !item.concluido; // desfaz se a API recusar
    renderDesafios();
    mostrarToast(err.message, 'error');
  }
}

// Marca como concluído, de uma vez, todo desafio pendente da trilha vinculado
// a uma seção — usado quando completar uma ação em outro módulo (ex: salvar
// o Plano de Gestão) já deveria contar como ter cumprido aquele desafio,
// sem o líder precisar marcar o checkbox manualmente. Retorna quantos marcou.
async function marcarDesafiosDaSecaoConcluidos(secaoAlvo) {
  const pendentes = STATE.desafios.filter(d => d.secaoAlvo === secaoAlvo && !d.concluido);
  if (!pendentes.length) return 0;
  for (const d of pendentes) {
    d.concluido = true;
    try { await Api.atualizarDesafio(d.id, { concluido: true }); } catch (err) { /* não bloqueia a ação principal */ }
  }
  renderDesafios();
  return pendentes.length;
}

// A parametrização da trilha (título, descrição, seção, prazo, pontos) é só
// do administrador agora — ver ADMIN: TRILHA DE DESAFIOS DA TURMA, mais
// abaixo. Aqui o líder só lê e marca o próprio progresso (toggleDesafioConcluido).

function renderConsolidado() {
  const container = document.getElementById('consolidado-lista');
  const badgeTotal = document.getElementById('badge-consolidado-total');
  if (!container || !badgeTotal) return;
  badgeTotal.textContent = STATE.liderados.length;

  if (STATE.liderados.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧩</div><p>Cadastre seus liderados pra ver o painel consolidado da equipe.</p></div>`;
    return;
  }

  container.innerHTML = STATE.liderados.map(l => {
    const atividades = STATE.atividades.filter(a => a.responsavelId === l.id);
    const observacao = STATE.diarioResumoEquipe.find(d => d.lideradoId === l.id && d.tipo === 'observacao');
    const feedback = STATE.diarioResumoEquipe.find(d => d.lideradoId === l.id && d.tipo === 'feedback');

    return `
    <div class="consolidado-card">
      <div class="consolidado-nome">${l.nome}${l.cargo ? ' · ' + l.cargo : ''}</div>
      <div class="consolidado-grid">
        <div>
          <div class="consolidado-bloco-titulo">Perfil</div>
          <p>${l.perfil || 'Perfil ainda não preenchido.'}</p>
        </div>
        <div>
          <div class="consolidado-bloco-titulo">Atividades atribuídas</div>
          <p>${atividades.length ? atividades.map(a => a.titulo).join(', ') : 'Nenhuma atividade atribuída ainda.'}</p>
        </div>
        <div>
          <div class="consolidado-bloco-titulo">Último feedback formal</div>
          <p>${feedback ? formatarData(feedback.data) + ' — ' + (feedback.conversa || feedback.plano || 'sem detalhes registrados') : 'Nenhum feedback formal registrado ainda.'}</p>
        </div>
        <div>
          <div class="consolidado-bloco-titulo">Última observação</div>
          <p>${observacao ? formatarData(observacao.data) : 'Nenhuma observação registrada ainda.'}</p>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// ADMINISTRADOR — turmas, líderes e a trilha de Desafios de cada turma
// ============================================================
function mapTurma(t) {
  return { id: t.id, nome: t.nome };
}
function mapLiderResumo(l) {
  return { id: l.id, nome: l.nome, email: l.email, cargo: l.cargo || '', area: l.area || '', turmaId: l.turma_id || '' };
}

async function carregarTudoAdmin() {
  document.getElementById('admin-nome-topo').textContent = AUTH.user.nome;
  document.getElementById('admin-avatar').textContent = iniciaisNome(AUTH.user.nome);
  try {
    STATE.turmas = (await Api.listarTurmas()).map(mapTurma);
    STATE.lideresSemTurma = (await Api.listarTodosLideres()).map(mapLiderResumo).filter(l => !l.turmaId);
    renderTurmas();
    renderLideresSemTurma();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function renderTurmas() {
  document.getElementById('badge-total-turmas').textContent = STATE.turmas.length;
  const container = document.getElementById('lista-turmas');
  container.innerHTML = STATE.turmas.length === 0
    ? `<div class="empty-state"><div class="empty-icon">🎓</div><p>Nenhuma turma criada ainda.</p></div>`
    : STATE.turmas.map(t => `
      <button type="button" class="turma-chip ${t.id === STATE.turmaSelecionadaId ? 'selected' : ''}" onclick="selecionarTurma('${t.id}')">${t.nome}</button>
    `).join('');
}

async function selecionarTurma(id) {
  STATE.turmaSelecionadaId = id;
  renderTurmas();
  const turma = STATE.turmas.find(t => t.id === id);
  document.getElementById('admin-turma-nome').textContent = turma ? turma.nome : '';
  document.getElementById('admin-turma-nome-input').value = turma ? turma.nome : '';
  document.getElementById('admin-turma-detalhe').style.display = '';

  try {
    STATE.turmaLideres = (await Api.listarLideresDaTurma(id)).map(mapLiderResumo);
    STATE.turmaDesafios = (await Api.listarDesafiosDaTurma(id)).map(mapDesafio);
    STATE.turmaArquivos = (await Api.listarArquivosDaTurma(id)).map(mapArquivo);
    renderTurmaLideres();
    renderAdminDesafios();
    renderAdminArquivos();
    resetFormArquivoAdmin();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function renderTurmaLideres() {
  document.getElementById('badge-turma-lideres').textContent = STATE.turmaLideres.length;
  const container = document.getElementById('lista-turma-lideres');
  container.innerHTML = STATE.turmaLideres.length === 0
    ? `<div class="empty-state"><div class="empty-icon">👤</div><p>Nenhum líder cadastrado nesta turma ainda.</p></div>`
    : STATE.turmaLideres.map(l => `
      <div class="lider-linha" data-lider-linha="${l.id}">
        <div class="diagnostico-item">
          <span><strong>${l.nome}</strong>${l.cargo ? ' · ' + l.cargo : ''} — ${l.email}</span>
          <button type="button" class="btn-icon btn-icon-sm btn-visualizar-lider" data-id="${l.id}" data-nome="${escapeAtributo(l.nome)}" title="Visualizar o painel dele (somente leitura)">👁️</button>
          <button type="button" class="btn-icon btn-icon-sm btn-area-individual" data-id="${l.id}" title="Área Individual — mensagens e arquivos só pra essa conta">💬</button>
          <button type="button" class="btn-icon btn-icon-sm btn-reenviar-convite" data-id="${l.id}" data-nome="${escapeAtributo(l.nome)}" title="Reenviar convite por e-mail">📧</button>
          <button type="button" class="btn-icon btn-icon-sm btn-toggle-senha-lider" data-id="${l.id}" title="Redefinir senha">🔑</button>
        </div>
        <form class="diagnostico-form form-senha-lider" data-id="${l.id}" style="display:none">
          <input type="password" class="input-senha-lider" placeholder="Nova senha (mín. 6 caracteres)" minlength="6" required />
          <button type="submit" class="btn-secondary">Salvar senha</button>
        </form>
        <div class="area-individual-painel" id="painel-individual-${l.id}" style="display:none"></div>
      </div>
    `).join('');

  container.querySelectorAll('.btn-visualizar-lider').forEach(btn => {
    btn.addEventListener('click', () => visualizarLider(btn.dataset.id, btn.dataset.nome, btn));
  });

  container.querySelectorAll('.btn-reenviar-convite').forEach(btn => {
    btn.addEventListener('click', () => reenviarConviteLider(btn.dataset.id, btn.dataset.nome, btn));
  });

  container.querySelectorAll('.btn-area-individual').forEach(btn => {
    btn.addEventListener('click', () => toggleAreaIndividual(btn.dataset.id));
  });

  container.querySelectorAll('.btn-toggle-senha-lider').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = container.querySelector(`.form-senha-lider[data-id="${btn.dataset.id}"]`);
      const abrindo = form.style.display === 'none';
      form.style.display = abrindo ? '' : 'none';
      if (abrindo) form.querySelector('.input-senha-lider').focus();
    });
  });

  container.querySelectorAll('.form-senha-lider').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('.input-senha-lider');
      const senha = input.value;
      if (senha.length < 6) { mostrarToast('A senha precisa ter pelo menos 6 caracteres.', 'error'); return; }
      const restaurar = iniciarCarregamentoBotao(form.querySelector('button[type=submit]'), 'Salvando...');
      try {
        await Api.redefinirSenhaLider(form.dataset.id, senha);
        mostrarToast('Senha atualizada! Repasse a nova senha pro líder.');
        form.reset();
        form.style.display = 'none';
      } catch (err) {
        mostrarToast(err.message, 'error');
      } finally {
        restaurar();
      }
    });
  });
}

// ============================================================
// ÁREA INDIVIDUAL (visão do admin/Trainer) — mensagens e arquivos que só
// aquele líder específico vê, diferente dos Arquivos da Aula (turma toda).
// Um painel aberto por vez, carregado sob demanda ao clicar no 💬.
// ============================================================
async function toggleAreaIndividual(liderId) {
  if (STATE.areaIndividualLiderId && STATE.areaIndividualLiderId !== liderId) {
    const outroPainel = document.getElementById(`painel-individual-${STATE.areaIndividualLiderId}`);
    if (outroPainel) { outroPainel.style.display = 'none'; outroPainel.innerHTML = ''; }
  }

  const painel = document.getElementById(`painel-individual-${liderId}`);
  if (!painel) return;

  if (STATE.areaIndividualLiderId === liderId) {
    painel.style.display = 'none';
    painel.innerHTML = '';
    STATE.areaIndividualLiderId = null;
    return;
  }

  STATE.areaIndividualLiderId = liderId;
  painel.style.display = '';
  painel.innerHTML = `<p class="label-hint">Carregando...</p>`;
  try {
    const [mensagens, arquivos] = await Promise.all([
      Api.listarMensagensIndividuais(liderId),
      Api.listarArquivosIndividuaisAdmin(liderId),
    ]);
    STATE.areaIndividualMensagens = mensagens.map(mapMensagemIndividual);
    STATE.areaIndividualArquivos = arquivos.map(mapArquivo);
    renderAreaIndividualAdmin(liderId);
  } catch (err) {
    painel.innerHTML = `<p class="label-hint">Erro ao carregar: ${err.message}</p>`;
  }
}

function renderAreaIndividualAdmin(liderId) {
  const painel = document.getElementById(`painel-individual-${liderId}`);
  if (!painel) return;

  const mensagensHtml = STATE.areaIndividualMensagens.length === 0
    ? `<p class="label-hint">Nenhuma mensagem enviada ainda.</p>`
    : STATE.areaIndividualMensagens.map(m => `
        <div class="mensagem-individual-item">
          <div class="mensagem-individual-topo">
            <strong>${m.titulo}</strong>
            <span class="mensagem-individual-data">${formatarData(m.criadoEm?.split('T')[0])} · ${m.lida ? 'lida' : 'não lida'}</span>
          </div>
          <p>${m.mensagem}</p>
          <div class="arquivo-acoes">
            <button type="button" class="btn-icon btn-icon-sm btn-icon-danger btn-excluir-mensagem" data-msg-id="${m.id}" title="Excluir">🗑️</button>
          </div>
        </div>
      `).join('');

  const arquivosHtml = STATE.areaIndividualArquivos.length === 0
    ? `<p class="label-hint">Nenhum arquivo enviado ainda.</p>`
    : STATE.areaIndividualArquivos.map(a => `
        <div class="arquivo-item">
          <span class="arquivo-icone">${iconeArquivo(a.tipoMime)}</span>
          <div class="arquivo-info">
            <div class="arquivo-nome">${a.nome}</div>
            <div class="arquivo-meta">${formatarTamanho(a.tamanhoBytes)} · ${formatarData(a.criadoEm?.split('T')[0])}</div>
          </div>
          <div class="arquivo-acoes">
            <button type="button" class="btn-icon btn-icon-sm btn-icon-danger btn-excluir-arquivo-individual" data-arq-id="${a.id}" title="Excluir">🗑️</button>
          </div>
        </div>
      `).join('');

  painel.innerHTML = `
    <div class="area-individual-bloco">
      <h4>💬 Mensagens</h4>
      ${mensagensHtml}
      <form class="form-nova-mensagem-individual">
        <input type="text" class="input-titulo-mensagem" placeholder="Título" required />
        <textarea class="input-texto-mensagem" placeholder="Mensagem..." rows="2" required></textarea>
        <button type="submit" class="btn-secondary">Enviar mensagem</button>
      </form>
    </div>
    <div class="area-individual-bloco">
      <h4>📁 Arquivos</h4>
      ${arquivosHtml}
      <div class="area-individual-upload">
        <input type="file" class="input-arquivo-individual" />
        <button type="button" class="btn-secondary btn-enviar-arquivo-individual">Enviar arquivo</button>
      </div>
    </div>
  `;

  painel.querySelector('.form-nova-mensagem-individual').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const titulo = form.querySelector('.input-titulo-mensagem').value.trim();
    const mensagem = form.querySelector('.input-texto-mensagem').value.trim();
    if (!titulo || !mensagem) return;
    const restaurar = iniciarCarregamentoBotao(form.querySelector('button[type=submit]'), 'Enviando...');
    try {
      await Api.criarMensagemIndividual(liderId, { titulo, mensagem });
      mostrarToast('Mensagem enviada!');
      STATE.areaIndividualMensagens = (await Api.listarMensagensIndividuais(liderId)).map(mapMensagemIndividual);
      renderAreaIndividualAdmin(liderId);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
    }
  });

  painel.querySelectorAll('.btn-excluir-mensagem').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta mensagem?')) return;
      try {
        await Api.excluirMensagemIndividual(btn.dataset.msgId);
        STATE.areaIndividualMensagens = STATE.areaIndividualMensagens.filter(m => m.id !== btn.dataset.msgId);
        renderAreaIndividualAdmin(liderId);
      } catch (err) { mostrarToast(err.message, 'error'); }
    });
  });

  painel.querySelector('.btn-enviar-arquivo-individual').addEventListener('click', async () => {
    const input = painel.querySelector('.input-arquivo-individual');
    const file = input.files[0];
    if (!file) { mostrarToast('Escolha um arquivo.', 'error'); return; }
    const formData = new FormData();
    formData.append('arquivo', file);
    const btn = painel.querySelector('.btn-enviar-arquivo-individual');
    const restaurar = iniciarCarregamentoBotao(btn, 'Enviando...');
    try {
      await Api.enviarArquivoIndividual(liderId, formData);
      mostrarToast('Arquivo enviado!');
      STATE.areaIndividualArquivos = (await Api.listarArquivosIndividuaisAdmin(liderId)).map(mapArquivo);
      renderAreaIndividualAdmin(liderId);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
    }
  });

  painel.querySelectorAll('.btn-excluir-arquivo-individual').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este arquivo?')) return;
      try {
        await Api.excluirArquivoIndividualAdmin(liderId, btn.dataset.arqId);
        STATE.areaIndividualArquivos = STATE.areaIndividualArquivos.filter(a => a.id !== btn.dataset.arqId);
        renderAreaIndividualAdmin(liderId);
      } catch (err) { mostrarToast(err.message, 'error'); }
    });
  });
}

function renderLideresSemTurma() {
  const card = document.getElementById('admin-card-sem-turma');
  const lista = STATE.lideresSemTurma;
  card.style.display = lista.length === 0 ? 'none' : '';
  if (lista.length === 0) return;

  document.getElementById('badge-sem-turma').textContent = lista.length;
  document.getElementById('lista-lideres-sem-turma').innerHTML = lista.map(l => `
    <div class="diagnostico-item">
      <span><strong>${l.nome}</strong> — ${l.email}</span>
      <select onchange="moverLiderSemTurma('${l.id}', this.value)">
        <option value="">Mover pra turma...</option>
        ${STATE.turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
      </select>
    </div>
  `).join('');
}

async function moverLiderSemTurma(liderId, turmaId) {
  if (!turmaId) return;
  try {
    await Api.moverLiderDeTurma(liderId, turmaId);
    STATE.lideresSemTurma = STATE.lideresSemTurma.filter(l => l.id !== liderId);
    renderLideresSemTurma();
    mostrarToast('Líder movido pra turma!');
    if (turmaId === STATE.turmaSelecionadaId) selecionarTurma(turmaId);
  } catch (err) { mostrarToast(err.message, 'error'); }
}

// ---- Trilha de Desafios da turma selecionada (só o admin edita) ----
function renderAdminDesafios() {
  document.getElementById('badge-turma-desafios').textContent = STATE.turmaDesafios.length;
  const container = document.getElementById('lista-admin-desafios');

  if (STATE.turmaDesafios.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Nenhum desafio ainda. Use o formulário abaixo para adicionar o primeiro.</p></div>`;
    return;
  }

  container.innerHTML = STATE.turmaDesafios.map((d, i) => `
    <div class="parametriza-item" data-id="${d.id}">
      <div class="parametriza-ordem">
        <button type="button" class="btn-icon btn-icon-sm" title="Mover para cima" ${i === 0 ? 'disabled' : ''} onclick="moverDesafioAdmin('${d.id}', -1)">↑</button>
        <button type="button" class="btn-icon btn-icon-sm" title="Mover para baixo" ${i === STATE.turmaDesafios.length - 1 ? 'disabled' : ''} onclick="moverDesafioAdmin('${d.id}', 1)">↓</button>
      </div>
      <div class="parametriza-campos">
        <input type="text" data-campo="titulo" placeholder="Título do desafio" value="${d.titulo || ''}" />
        <input type="text" data-campo="descricao" placeholder="Descrição (opcional)" value="${d.descricao || ''}" />
        <select data-campo="secaoAlvo">
          <option value="">Sem seção vinculada</option>
          ${Object.entries(SECOES_DESAFIO).map(([valor, label]) => `<option value="${valor}" ${d.secaoAlvo === valor ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <input type="date" data-campo="prazo" title="Prazo" value="${d.prazo || ''}" />
        <input type="number" data-campo="pontos" title="Pontos se entregar no prazo" min="0" step="1" value="${d.pontos}" />
      </div>
      <button type="button" class="btn-icon btn-icon-sm btn-icon-danger" title="Remover" onclick="excluirDesafioAdminItem('${d.id}')">🗑️</button>
    </div>
  `).join('');

  container.querySelectorAll('.parametriza-item').forEach(el => {
    const id = el.dataset.id;
    el.querySelectorAll('[data-campo]').forEach(campo => {
      campo.addEventListener('change', async () => {
        const item = STATE.turmaDesafios.find(d => d.id === id);
        if (!item) return;
        item[campo.dataset.campo] = campo.dataset.campo === 'pontos' ? (Number(campo.value) || 0) : campo.value;
        try {
          await Api.atualizarDesafioAdmin(id, {
            titulo: item.titulo, descricao: item.descricao, secaoAlvo: item.secaoAlvo || null,
            prazo: item.prazo || null, pontos: item.pontos,
          });
        } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
  });
}

async function excluirDesafioAdminItem(id) {
  try {
    await Api.excluirDesafioAdmin(id);
    STATE.turmaDesafios = STATE.turmaDesafios.filter(d => d.id !== id);
    renderAdminDesafios();
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function moverDesafioAdmin(id, direcao) {
  const i = STATE.turmaDesafios.findIndex(d => d.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= STATE.turmaDesafios.length) return;
  [STATE.turmaDesafios[i], STATE.turmaDesafios[j]] = [STATE.turmaDesafios[j], STATE.turmaDesafios[i]];
  renderAdminDesafios();
  try {
    await Promise.all([
      Api.atualizarDesafioAdmin(STATE.turmaDesafios[i].id, { ordem: i }),
      Api.atualizarDesafioAdmin(STATE.turmaDesafios[j].id, { ordem: j }),
    ]);
  } catch (err) { mostrarToast(err.message, 'error'); }
}

// ---- Arquivos da Aula da turma selecionada (só o admin sobe/edita/exclui) ----
function renderAdminArquivos() {
  document.getElementById('badge-turma-arquivos').textContent = STATE.turmaArquivos.length;
  renderListaArquivosAgrupada('lista-admin-arquivos', STATE.turmaArquivos, true);
  const pastas = [...new Set(STATE.turmaArquivos.map(a => a.pasta).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  document.getElementById('lista-pastas-admin').innerHTML = pastas.map(p => `<option value="${p}"></option>`).join('');
}

function resetFormArquivoAdmin() {
  document.getElementById('aa-id').value = '';
  document.getElementById('form-arquivo-admin').reset();
  document.getElementById('grupo-aa-arquivo').style.display = 'block';
  document.getElementById('aa-arquivo-hint').style.display = 'none';
  document.getElementById('admin-arquivo-form-title').textContent = 'Enviar Arquivo da Aula';
  document.querySelector('#form-arquivo-admin button[type=submit]').innerHTML = '⬆️ Enviar';
  document.getElementById('btn-cancelar-arquivo-admin').style.display = 'none';
}

function editarArquivoAdmin(id) {
  const a = STATE.turmaArquivos.find(x => x.id === id);
  if (!a) return;
  document.getElementById('aa-id').value = a.id;
  document.getElementById('aa-nome').value = a.nome;
  document.getElementById('aa-descricao').value = a.descricao || '';
  document.getElementById('aa-pasta').value = a.pasta || '';
  document.getElementById('grupo-aa-arquivo').style.display = 'none';
  document.getElementById('aa-arquivo-hint').style.display = 'block';
  document.getElementById('admin-arquivo-form-title').textContent = 'Editar Arquivo';
  document.querySelector('#form-arquivo-admin button[type=submit]').innerHTML = '💾 Salvar';
  document.getElementById('btn-cancelar-arquivo-admin').style.display = 'inline-flex';
  document.querySelector('#admin-turma-detalhe .form-card').scrollIntoView({ behavior: 'smooth' });
}

async function excluirArquivoAdminItem(id) {
  if (!confirm('Remover este arquivo desta turma? (Se ele não estiver vinculado a nenhuma outra turma, é apagado de vez.)')) return;
  try {
    await Api.excluirArquivoDaTurma(STATE.turmaSelecionadaId, id);
    STATE.turmaArquivos = STATE.turmaArquivos.filter(a => a.id !== id);
    renderAdminArquivos();
    mostrarToast('Arquivo removido desta turma.', 'info');
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function vincularArquivo(id, turmaId) {
  if (!turmaId) return;
  try {
    await Api.vincularArquivoATurma(id, turmaId);
    const nomeTurma = STATE.turmas.find(t => t.id === turmaId)?.nome || 'turma selecionada';
    mostrarToast(`Arquivo vinculado à ${nomeTurma}!`);
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function vincularPasta(pasta, turmaDestinoId) {
  if (!turmaDestinoId) return;
  try {
    const resultado = await Api.vincularPastaATurma(STATE.turmaSelecionadaId, pasta, turmaDestinoId);
    const nomeTurma = STATE.turmas.find(t => t.id === turmaDestinoId)?.nome || 'turma selecionada';
    mostrarToast(`${resultado.vinculados} arquivo(s) vinculado(s) à ${nomeTurma}!`);
  } catch (err) { mostrarToast(err.message, 'error'); }
}

async function transferirPasta(pasta, turmaDestinoId) {
  if (!turmaDestinoId) return;
  const nomeTurma = STATE.turmas.find(t => t.id === turmaDestinoId)?.nome || 'turma selecionada';
  if (!confirm(`Transferir esta pasta pra ${nomeTurma}? Fica uma cópia lá e outra continua aqui na turma atual.`)) return;
  try {
    const resultado = await Api.transferirPastaATurma(STATE.turmaSelecionadaId, pasta, turmaDestinoId);
    mostrarToast(`${resultado.transferidos} arquivo(s) transferido(s) (com cópia) pra ${nomeTurma}!`);
    await selecionarTurma(STATE.turmaSelecionadaId);
  } catch (err) { mostrarToast(err.message, 'error'); }
}

function initAdmin() {
  document.getElementById('form-nova-turma').addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('tu-nome');
    const nome = input.value.trim();
    if (!nome) return;
    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Criando...');
    try {
      const nova = mapTurma(await Api.criarTurma(nome));
      STATE.turmas.push(nova);
      renderTurmas();
      input.value = '';
      // Seed padrão pra turma não começar do zero — o admin ajusta como quiser depois.
      for (const item of desafiosPadrao()) {
        try { await Api.criarDesafioAdmin(nova.id, item); } catch (err) { /* não bloqueia a criação da turma */ }
      }
      await selecionarTurma(nova.id);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
    }
  });

  document.getElementById('btn-salvar-nome-turma').addEventListener('click', async () => {
    const nome = document.getElementById('admin-turma-nome-input').value.trim();
    if (!nome || !STATE.turmaSelecionadaId) { mostrarToast('Dê um nome à turma.', 'error'); return; }
    try {
      const atualizada = mapTurma(await Api.atualizarTurma(STATE.turmaSelecionadaId, nome));
      const idx = STATE.turmas.findIndex(t => t.id === atualizada.id);
      STATE.turmas[idx] = atualizada;
      document.getElementById('admin-turma-nome').textContent = atualizada.nome;
      renderTurmas();
      mostrarToast('Nome da turma atualizado!');
    } catch (err) { mostrarToast(err.message, 'error'); }
  });

  document.getElementById('btn-excluir-turma').addEventListener('click', async () => {
    const turma = STATE.turmas.find(t => t.id === STATE.turmaSelecionadaId);
    if (!turma) return;
    if (!confirm(`Excluir a turma "${turma.nome}"? Os líderes dela ficam sem turma (não são apagados) e a trilha de desafios da turma é excluída.`)) return;
    try {
      await Api.excluirTurma(turma.id);
      STATE.turmas = STATE.turmas.filter(t => t.id !== turma.id);
      STATE.turmaSelecionadaId = null;
      document.getElementById('admin-turma-detalhe').style.display = 'none';
      renderTurmas();
      STATE.lideresSemTurma = (await Api.listarTodosLideres()).map(mapLiderResumo).filter(l => !l.turmaId);
      renderLideresSemTurma();
      mostrarToast('Turma excluída.', 'info');
    } catch (err) { mostrarToast(err.message, 'error'); }
  });

  document.getElementById('form-novo-lider').addEventListener('submit', async e => {
    e.preventDefault();
    if (!STATE.turmaSelecionadaId) return;
    const dados = {
      nome: document.getElementById('nl-nome').value.trim(),
      cargo: document.getElementById('nl-cargo').value.trim(),
      area: document.getElementById('nl-area').value.trim(),
      email: document.getElementById('nl-email').value.trim(),
      senha: document.getElementById('nl-senha').value,
    };
    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Cadastrando...');
    try {
      const novo = mapLiderResumo(await Api.criarLiderNaTurma(STATE.turmaSelecionadaId, dados));
      STATE.turmaLideres.push(novo);
      renderTurmaLideres();
      e.target.reset();
      mostrarToast('Líder cadastrado! Repasse o e-mail e a senha pra ele.');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
    }
  });

  document.getElementById('form-add-desafio-admin').addEventListener('submit', async e => {
    e.preventDefault();
    if (!STATE.turmaSelecionadaId) return;
    const tituloInput = document.getElementById('ad-titulo');
    const titulo = tituloInput.value.trim();
    if (!titulo) { mostrarToast('Dê um título ao desafio.', 'error'); return; }
    const descricao = document.getElementById('ad-descricao').value.trim();
    const secaoAlvo = document.getElementById('ad-secao').value;
    const prazo = document.getElementById('ad-prazo').value || null;
    const pontos = Number(document.getElementById('ad-pontos').value) || 0;

    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), 'Adicionando...');
    try {
      const novo = mapDesafio(await Api.criarDesafioAdmin(STATE.turmaSelecionadaId, { titulo, descricao, secaoAlvo, prazo, pontos, ordem: STATE.turmaDesafios.length }));
      STATE.turmaDesafios.push(novo);
      renderAdminDesafios();
      e.target.reset();
      tituloInput.focus();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
    }
  });

  document.getElementById('form-arquivo-admin').addEventListener('submit', async e => {
    e.preventDefault();
    if (!STATE.turmaSelecionadaId) return;
    const id = document.getElementById('aa-id').value;
    const nome = document.getElementById('aa-nome').value.trim();
    const descricao = document.getElementById('aa-descricao').value.trim();
    const pasta = document.getElementById('aa-pasta').value.trim();

    const restaurar = iniciarCarregamentoBotao(e.target.querySelector('button[type=submit]'), id ? 'Salvando...' : 'Enviando...');
    try {
      if (id) {
        if (!nome) { mostrarToast('Dê um nome ao arquivo.', 'error'); return; }
        const atualizado = mapArquivo(await Api.atualizarArquivoAdmin(id, { nome, descricao, pasta }));
        const idx = STATE.turmaArquivos.findIndex(a => a.id === id);
        STATE.turmaArquivos[idx] = atualizado;
        mostrarToast('Arquivo atualizado!');
      } else {
        const arquivo = document.getElementById('aa-arquivo').files[0];
        if (!arquivo) { mostrarToast('Selecione um arquivo.', 'error'); return; }
        if (arquivo.size > 20 * 1024 * 1024) { mostrarToast('Arquivo maior que o limite de 20MB.', 'error'); return; }

        const formData = new FormData();
        formData.append('arquivo', arquivo);
        formData.append('nome', nome);
        formData.append('descricao', descricao);
        formData.append('pasta', pasta);
        const novo = mapArquivo(await Api.enviarArquivoNaTurma(STATE.turmaSelecionadaId, formData));
        STATE.turmaArquivos.unshift(novo);
        mostrarToast('Arquivo enviado! Já está disponível pra turma.');
      }
      renderAdminArquivos();
      resetFormArquivoAdmin();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      restaurar();
    }
  });

  document.getElementById('btn-cancelar-arquivo-admin').addEventListener('click', resetFormArquivoAdmin);
}

function renderTudo() {
  renderLiderados();
  renderDiarioSeletor();
  renderDiarioConteudo();
  renderAtividades();
  renderMetas();
  renderMatriz();
  renderProjetosIniciativas();
  renderPlanoAcaoItens();
  renderDashboardAll();
  renderPlanoGestao();
  renderDiagnostico();
}

// Roda cada init isolado — se um deles quebrar (por causa de um elemento que
// não existe nessa tela, um dado inesperado etc.), os outros continuam
// rodando normalmente. Sem isso, uma exceção em qualquer init anterior
// impedia todos os de baixo de rodar (inclusive os de formulários inteiros),
// e aí um <button type="submit"> sem listener nenhum faz o navegador
// submeter o form de verdade — recarrega a página e some com o que não foi
// salvo. Isso é exatamente o sintoma de "salvar dá refresh e volta vazio".
function initSeguro(nome, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`Falha ao iniciar "${nome}":`, err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initSeguro('navegacao', initNavegacao);
  initSeguro('tagButtons', initTagButtons);
  initSeguro('tagButtonsMulti', initTagButtonsMulti);
  initSeguro('sidebarToggle', initSidebarToggle);
  initSeguro('telaAuth', initTelaAuth);

  // Liderados
  initSeguro('formLiderado', initFormLiderado);
  initSeguro('modalLiderado', initModalLiderado);

  // Diário de Bordo
  initSeguro('formConhecer', initFormConhecer);
  initSeguro('formRegistroDiario', initFormRegistroDiario);
  initSeguro('resumoFeedback', initResumoFeedback);

  // Atividades / Kanban
  initSeguro('formAtividade', initFormAtividade);
  initSeguro('filtrosAtividades', initFiltrosAtividades);
  initSeguro('modalAtividade', initModalAtividade);
  initSeguro('subtabs', initSubtabs);
  initSeguro('kanbanDrop', initKanbanDrop);

  // Metas
  initSeguro('formMeta', initFormMeta);

  // Matriz
  initSeguro('formMatriz', initFormMatriz);
  initSeguro('selectAtividadeMatriz', initSelectAtividadeMatriz);
  initSeguro('filtroMatrizResponsavel', initFiltroMatrizResponsavel);

  // Dashboard
  initSeguro('formRotina', initFormRotina);
  initSeguro('agendaRotinaCliqueParaCriar', initAgendaRotinaCliqueParaCriar);
  initSeguro('importarPlanilha', initImportarPlanilha);
  initSeguro('planoAcao', initPlanoAcao);
  initSeguro('autoavaliacao', initAutoavaliacao);

  // Plano de Gestão / Diagnóstico
  initSeguro('planoGestao', initPlanoGestao);

  // Administrador
  initSeguro('admin', initAdmin);

  carregarAuth();
  if (AUTH.token && AUTH.user) {
    await entrarNaSessao();
  } else {
    mostrarTela('auth');
  }
});
