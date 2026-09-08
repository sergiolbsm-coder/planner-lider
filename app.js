/* ============================================================
   PLANNER DO LÍDER — Impact Leader
   app.js — Lógica principal dos módulos
   Módulos: Perfis · Liderados · Diário de Bordo · Atividades (Kanban)
            · Metas & Indicadores · Matriz de Prioridade · Dashboard
============================================================ */

// ============================================================
// ESTADO GLOBAL
// ============================================================
const STATE = {
  liderId: null,
  liderados: [],
  atividades: [],
  matriz: [],
  metas: [],
  diario: [],
  rotina: [],
  diarioSelecionadoId: null,
  metaIdeal: { operacional: 30, tatico: 40, estrategico: 30 },
  planoAcao: [],
  checklistErros: {},
  checklistLider: {},
  filtroResultado: 'todos',
  filtroTipo: 'todos',
  filtroResponsavel: 'todos',
  filtroMeta: 'todos',
  lideradoSelecionado: null,
};

// ============================================================
// LISTAS FIXAS (checklists e seeds)
// ============================================================
const ERROS_PLANEJAMENTO_ITENS = [
  { id: 'reativo', texto: 'Dia reagindo a demandas, não proativo.' },
  { id: 'sem-blocos', texto: 'Falta de blocos de tempo para atividades estratégicas.' },
  { id: 'sem-priorizacao', texto: 'Ausência de priorização clara das atividades.' },
  { id: 'sem-delegacao', texto: 'Não delega o que poderia ser delegado.' },
  { id: 'sem-rotina', texto: 'Não há rotina de acompanhamento e melhoria.' },
];

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
    { id: gerarId(), acao: 'Bloquear tempo para o estratégico', comoFazer: 'Agendar 2 blocos diários sem interrupções.', impacto: 'Mais foco em projetos e desenvolvimento.', prazo: 'Imediato' },
    { id: gerarId(), acao: 'Delegar com clareza', comoFazer: 'Definir responsáveis e acompanhar resultados.', impacto: 'Reduzir sobrecarga operacional.', prazo: 'Imediato' },
    { id: gerarId(), acao: 'Padronizar processos', comoFazer: 'Criar checklists e templates para demandas recorrentes.', impacto: 'Menos retrabalho e mais eficiência.', prazo: 'Curto prazo (30 dias)' },
    { id: gerarId(), acao: 'Reuniões com propósito', comoFazer: 'Pauta clara, objetivo e tempo definido.', impacto: 'Reuniões mais eficazes e rápidas.', prazo: 'Curto prazo (30 dias)' },
    { id: gerarId(), acao: 'Acompanhar indicadores', comoFazer: 'Focar no que realmente importa.', impacto: 'Decisões melhores e mais rápidas.', prazo: 'Contínuo' },
    { id: gerarId(), acao: 'Desenvolver pessoas', comoFazer: '1:1s semanais e feedback estruturado.', impacto: 'Equipe mais engajada e preparada.', prazo: 'Contínuo' },
  ];
}

function estadoVazio() {
  return {
    liderados: [],
    atividades: [],
    matriz: [],
    metas: [],
    diario: [],
    rotina: [],
    diarioSelecionadoId: null,
    metaIdeal: { operacional: 30, tatico: 40, estrategico: 30 },
    planoAcao: planoAcaoPadrao(),
    checklistErros: {},
    checklistLider: {},
  };
}

// ============================================================
// PERFIS DE LÍDER (multiusuário — cada líder com seu próprio quadro)
// ============================================================
const PERFIS_KEY = 'pl_perfis';
const PERFIL_ATIVO_KEY = 'pl_perfil_ativo';

function carregarPerfis() {
  try { return JSON.parse(localStorage.getItem(PERFIS_KEY) || '[]'); }
  catch (e) { return []; }
}
function salvarPerfis(lista) {
  localStorage.setItem(PERFIS_KEY, JSON.stringify(lista));
}
function getPerfilAtivoId() {
  return localStorage.getItem(PERFIL_ATIVO_KEY) || '';
}
function setPerfilAtivoId(id) {
  localStorage.setItem(PERFIL_ATIVO_KEY, id);
}
function dadosKey(liderId) {
  return `planner_dados_${liderId}`;
}

// Migra dados de versões antigas (sem perfil) para o primeiro perfil criado
function migrarDadosLegado() {
  const perfis = carregarPerfis();
  if (perfis.length > 0) return;

  const legadoLiderados = localStorage.getItem('planner_liderados');
  const legadoAtividades = localStorage.getItem('planner_atividades');
  const legadoMatriz = localStorage.getItem('planner_matriz');
  if (!legadoLiderados && !legadoAtividades && !legadoMatriz) return;

  const id = 'default';
  const dados = estadoVazio();
  try { dados.liderados = JSON.parse(legadoLiderados || '[]'); } catch (e) {}
  try { dados.atividades = JSON.parse(legadoAtividades || '[]'); } catch (e) {}
  try { dados.matriz = JSON.parse(legadoMatriz || '[]'); } catch (e) {}
  dados.atividades.forEach(a => { if (!a.status) a.status = 'novo'; });

  localStorage.setItem(dadosKey(id), JSON.stringify(dados));
  salvarPerfis([{ id, nome: 'Meu Perfil', area: '', cargo: '', criadoEm: new Date().toISOString() }]);
  setPerfilAtivoId(id);
}

function carregarDadosLider(id) {
  let dados = estadoVazio();
  try {
    const salvo = JSON.parse(localStorage.getItem(dadosKey(id)) || 'null');
    if (salvo) dados = Object.assign(estadoVazio(), salvo);
  } catch (e) { /* mantém vazio */ }

  STATE.liderId = id;
  STATE.liderados = dados.liderados || [];
  STATE.atividades = dados.atividades || [];
  STATE.matriz = dados.matriz || [];
  STATE.metas = dados.metas || [];
  STATE.diario = dados.diario || [];
  STATE.rotina = dados.rotina || [];
  STATE.diarioSelecionadoId = dados.diarioSelecionadoId || null;
  STATE.metaIdeal = dados.metaIdeal || { operacional: 30, tatico: 40, estrategico: 30 };
  STATE.planoAcao = (dados.planoAcao && dados.planoAcao.length) ? dados.planoAcao : planoAcaoPadrao();
  STATE.checklistErros = dados.checklistErros || {};
  STATE.checklistLider = dados.checklistLider || {};

  // Migração leve de registros antigos sem campos novos
  STATE.atividades.forEach(a => { if (!a.status) a.status = 'novo'; });
}

function salvarDadosLider() {
  if (!STATE.liderId) return;
  const dados = {
    liderados: STATE.liderados,
    atividades: STATE.atividades,
    matriz: STATE.matriz,
    metas: STATE.metas,
    diario: STATE.diario,
    rotina: STATE.rotina,
    diarioSelecionadoId: STATE.diarioSelecionadoId,
    metaIdeal: STATE.metaIdeal,
    planoAcao: STATE.planoAcao,
    checklistErros: STATE.checklistErros,
    checklistLider: STATE.checklistLider,
  };
  localStorage.setItem(dadosKey(STATE.liderId), JSON.stringify(dados));
}

function iniciaisNome(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase();
}

function renderHeaderPerfil() {
  const perfis = carregarPerfis();
  const p = perfis.find(x => x.id === STATE.liderId);
  document.getElementById('lider-ativo-avatar').textContent = iniciaisNome(p ? p.nome : '?');
  document.getElementById('lider-ativo-nome').textContent = p ? p.nome : '—';
}

function renderListaPerfis() {
  const perfis = carregarPerfis();
  const container = document.getElementById('lista-perfis');
  if (perfis.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = perfis.map(p => `
    <div class="perfil-card" data-id="${p.id}">
      <div class="perfil-card-avatar">${iniciaisNome(p.nome)}</div>
      <div class="perfil-card-info">
        <div class="perfil-card-nome">${p.nome}</div>
        <div class="perfil-card-sub">${[p.cargo, p.area].filter(Boolean).join(' · ') || 'Sem área definida'}</div>
      </div>
      <div class="perfil-card-acoes">
        <button class="btn-primary btn-entrar-perfil" data-id="${p.id}">Entrar</button>
        <button class="btn-icon btn-icon-danger" title="Excluir perfil" data-excluir-perfil="${p.id}">🗑️</button>
      </div>
    </div>
  `).join('');
}

function abrirTelaPerfil() {
  renderListaPerfis();
  document.getElementById('btn-fechar-tela-perfil').style.display = getPerfilAtivoId() ? 'flex' : 'none';
  document.getElementById('form-novo-perfil').style.display = 'none';
  document.getElementById('btn-novo-perfil').style.display = 'flex';
  document.getElementById('tela-perfil').style.display = 'flex';
}

function fecharTelaPerfil() {
  document.getElementById('tela-perfil').style.display = 'none';
}

function entrarNoPerfil(id) {
  setPerfilAtivoId(id);
  carregarDadosLider(id);
  fecharTelaPerfil();
  renderHeaderPerfil();
  renderTudo();
}

function excluirPerfil(id) {
  if (!confirm('Excluir este perfil e TODOS os dados dele (liderados, quadro, diário, rotina)? Esta ação não pode ser desfeita.')) return;
  const perfis = carregarPerfis().filter(p => p.id !== id);
  salvarPerfis(perfis);
  localStorage.removeItem(dadosKey(id));
  if (getPerfilAtivoId() === id) {
    localStorage.removeItem(PERFIL_ATIVO_KEY);
  }
  renderListaPerfis();
  mostrarToast('Perfil removido.', 'info');
}

function initTelaPerfil() {
  document.getElementById('btn-novo-perfil').addEventListener('click', () => {
    document.getElementById('btn-novo-perfil').style.display = 'none';
    document.getElementById('form-novo-perfil').style.display = 'block';
    document.getElementById('np-nome').focus();
  });
  document.getElementById('btn-cancelar-novo-perfil').addEventListener('click', () => {
    document.getElementById('form-novo-perfil').style.display = 'none';
    document.getElementById('btn-novo-perfil').style.display = 'flex';
    document.getElementById('form-novo-perfil').reset();
  });
  document.getElementById('form-novo-perfil').addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('np-nome').value.trim();
    if (!nome) { mostrarToast('Informe seu nome.', 'error'); return; }
    const id = gerarId();
    const perfis = carregarPerfis();
    perfis.push({
      id, nome,
      area: document.getElementById('np-area').value.trim(),
      cargo: document.getElementById('np-cargo').value.trim(),
      criadoEm: new Date().toISOString(),
    });
    salvarPerfis(perfis);
    localStorage.setItem(dadosKey(id), JSON.stringify(estadoVazio()));
    document.getElementById('form-novo-perfil').reset();
    entrarNoPerfil(id);
    mostrarToast(`Bem-vindo(a), ${nome}! Seu quadro foi criado.`);
  });
  document.getElementById('lista-perfis').addEventListener('click', e => {
    const btnEntrar = e.target.closest('.btn-entrar-perfil');
    if (btnEntrar) { entrarNoPerfil(btnEntrar.dataset.id); return; }
    const btnExcluir = e.target.closest('[data-excluir-perfil]');
    if (btnExcluir) { excluirPerfil(btnExcluir.dataset.excluirPerfil); }
  });
  document.getElementById('btn-trocar-perfil').addEventListener('click', abrirTelaPerfil);
  document.getElementById('btn-fechar-tela-perfil').addEventListener('click', fecharTelaPerfil);
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

function mostrarToast(msg, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${tipo}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ============================================================
// NAVEGAÇÃO ENTRE SEÇÕES
// ============================================================
function irParaSecao(secao) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector(`.nav-btn[data-section="${secao}"]`).classList.add('active');
  document.getElementById('section-' + secao).classList.add('active');
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

function setMultiValues(groupMulti, valores) {
  document.querySelectorAll(`.tag-btn-multi[data-group-multi="${groupMulti}"]`).forEach(b => {
    b.classList.toggle('selected', (valores || []).includes(b.dataset.value));
  });
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
          ${l.tempo ? `<span class="liderado-tempo">⏱ ${l.tempo}</span>` : ''}
        </div>
        <div class="liderado-acoes">
          <button class="btn-icon" title="Diário de Bordo" onclick="irParaDiario('${l.id}')">📓</button>
          <button class="btn-icon" title="Ver detalhes" onclick="verLiderado('${l.id}')">👁️</button>
          <button class="btn-icon" title="Editar" onclick="editarLiderado('${l.id}')">✏️</button>
          <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirLiderado('${l.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  popularSelectsResponsavel();
  renderDiarioSeletor();
}

function initFormLiderado() {
  const form = document.getElementById('form-liderado');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('l-nome').value.trim();
    const cargo = document.getElementById('l-cargo').value.trim();
    if (!nome || !cargo) { mostrarToast('Preencha nome e cargo.', 'error'); return; }

    const id = document.getElementById('l-id').value;
    const existente = id ? STATE.liderados.find(l => l.id === id) : null;
    const dados = {
      id: id || gerarId(),
      nome,
      cargo,
      tempo: document.getElementById('l-tempo').value.trim(),
      perfil: document.getElementById('l-perfil').value,
      habilidades: document.getElementById('l-habilidades').value.trim(),
      expectativas: document.getElementById('l-expectativas').value.trim(),
      metas: document.getElementById('l-metas').value.trim(),
      desenvolvimento: document.getElementById('l-desenvolvimento').value.trim(),
      obs: document.getElementById('l-obs').value.trim(),
      // Campos do Diário de Bordo (preenchidos naquela seção)
      aspiracoes: existente ? (existente.aspiracoes || '') : '',
      comportamentos: existente ? (existente.comportamentos || '') : '',
      sentimentos: existente ? (existente.sentimentos || '') : '',
      criadoEm: existente ? existente.criadoEm : new Date().toISOString(),
    };

    if (id) {
      const idx = STATE.liderados.findIndex(l => l.id === id);
      STATE.liderados[idx] = dados;
      mostrarToast('Liderado atualizado com sucesso!');
    } else {
      STATE.liderados.push(dados);
      mostrarToast('Liderado cadastrado com sucesso!');
    }

    salvarDadosLider();
    renderLiderados();
    resetFormLiderado();
  });

  document.getElementById('btn-cancelar-liderado').addEventListener('click', resetFormLiderado);
}

function resetFormLiderado() {
  document.getElementById('l-id').value = '';
  document.getElementById('form-liderado').reset();
  document.getElementById('liderado-form-title').textContent = 'Cadastrar Liderado';
  document.getElementById('btn-cancelar-liderado').style.display = 'none';
}

function editarLiderado(id) {
  const l = STATE.liderados.find(x => x.id === id);
  if (!l) return;
  document.getElementById('l-id').value = l.id;
  document.getElementById('l-nome').value = l.nome;
  document.getElementById('l-cargo').value = l.cargo;
  document.getElementById('l-tempo').value = l.tempo || '';
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

function excluirLiderado(id) {
  if (!confirm('Deseja excluir este liderado? Os registros do diário de bordo dele também serão removidos.')) return;
  STATE.liderados = STATE.liderados.filter(l => l.id !== id);
  STATE.diario = STATE.diario.filter(d => d.lideradoId !== id);
  if (STATE.diarioSelecionadoId === id) STATE.diarioSelecionadoId = null;
  salvarDadosLider();
  renderLiderados();
  renderDiarioSeletor();
  renderDiarioConteudo();
  mostrarToast('Liderado removido.', 'info');
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
      <div class="detalhe-item"><span class="detalhe-label">Tempo na equipe</span><span class="detalhe-valor">${l.tempo || '—'}</span></div>
      <div class="detalhe-item"><span class="detalhe-label">Cadastrado em</span><span class="detalhe-valor">${formatarData(l.criadoEm?.split('T')[0])}</span></div>
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
    irParaDiario(STATE.lideradoSelecionado);
  });
  document.getElementById('modal-liderado-excluir').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
    excluirLiderado(STATE.lideradoSelecionado);
  });
}

// ============================================================
// MÓDULO NOVO — DIÁRIO DE BORDO
// ============================================================

function irParaDiario(lideradoId) {
  STATE.diarioSelecionadoId = lideradoId;
  salvarDadosLider();
  irParaSecao('diario');
  renderDiarioSeletor();
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

function selecionarLideradoDiario(id) {
  STATE.diarioSelecionadoId = id;
  salvarDadosLider();
  renderDiarioSeletor();
  renderDiarioConteudo();
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

  document.getElementById('rd-data').value = hojeISO();
  clearMultiGroup('riscos');

  renderTimelineDiario();
}

function initFormConhecer() {
  document.getElementById('form-conhecer').addEventListener('submit', e => {
    e.preventDefault();
    const idx = STATE.liderados.findIndex(l => l.id === STATE.diarioSelecionadoId);
    if (idx === -1) return;
    STATE.liderados[idx].aspiracoes = document.getElementById('dc-aspiracoes').value.trim();
    STATE.liderados[idx].habilidades = document.getElementById('dc-pontosfortes').value.trim();
    STATE.liderados[idx].comportamentos = document.getElementById('dc-comportamentos').value.trim();
    STATE.liderados[idx].sentimentos = document.getElementById('dc-sentimentos').value.trim();
    salvarDadosLider();
    mostrarToast('Perfil do liderado atualizado!');
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
    <div class="diario-timeline-item">
      <div class="diario-timeline-data">📅 ${formatarData(r.data)}</div>
      ${(r.riscos && r.riscos.length) ? `<div class="atividade-tags">${r.riscos.map(v => `<span class="tag-pill tag-risco">${RISCOS_LABELS[v] || v}</span>`).join('')}</div>` : ''}
      ${r.sinais ? `<div class="diario-timeline-campo"><strong>👁️ Sinais observados:</strong> ${r.sinais}</div>` : ''}
      ${r.conversa ? `<div class="diario-timeline-campo"><strong>💬 Conversa:</strong> ${r.conversa}</div>` : ''}
      ${r.plano ? `<div class="diario-timeline-campo"><strong>📋 Plano de ação:</strong> ${r.plano}</div>` : ''}
      <button class="btn-icon btn-icon-sm btn-icon-danger diario-timeline-excluir" title="Excluir registro" onclick="excluirRegistroDiario('${r.id}')">🗑️</button>
    </div>
  `).join('');
}

function initFormRegistroDiario() {
  document.getElementById('form-registro-diario').addEventListener('submit', e => {
    e.preventDefault();
    if (!STATE.diarioSelecionadoId) return;
    const riscos = getMultiValues('riscos');
    const sinais = document.getElementById('rd-sinais').value.trim();
    const conversa = document.getElementById('rd-conversa').value.trim();
    const plano = document.getElementById('rd-plano').value.trim();

    if (!riscos.length && !sinais && !conversa && !plano) {
      mostrarToast('Preencha ao menos um campo do registro.', 'error');
      return;
    }

    STATE.diario.push({
      id: gerarId(),
      lideradoId: STATE.diarioSelecionadoId,
      data: document.getElementById('rd-data').value || hojeISO(),
      riscos, sinais, conversa, plano,
      criadoEm: new Date().toISOString(),
    });

    salvarDadosLider();
    renderTimelineDiario();
    document.getElementById('form-registro-diario').reset();
    document.getElementById('rd-data').value = hojeISO();
    clearMultiGroup('riscos');
    mostrarToast('Registro adicionado ao diário de bordo!');
  });
}

function excluirRegistroDiario(id) {
  if (!confirm('Excluir este registro do diário de bordo?')) return;
  STATE.diario = STATE.diario.filter(d => d.id !== id);
  salvarDadosLider();
  renderTimelineDiario();
  mostrarToast('Registro removido.', 'info');
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
      <p>${l.cargo || ''}${l.tempo ? ' · ' + l.tempo + ' na equipe' : ''}</p>
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
      ${registros.length === 0 ? '<p>Nenhum registro no período selecionado.</p>' : registros.map(r => `
        <div class="resumo-registro">
          <div class="resumo-registro-data">📅 ${formatarData(r.data)}</div>
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
  if (a.responsavel) return '👤 ' + a.responsavel; // compatibilidade com registros antigos
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
  renderMetas();
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

function atualizarStatusAtividade(id, status) {
  const idx = STATE.atividades.findIndex(a => a.id === id);
  if (idx === -1) return;
  STATE.atividades[idx].status = status;
  salvarDadosLider();
  renderAtividades();
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

function initSubtabsAtividades() {
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.atividades-view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.subview).classList.add('active');
    });
  });
}

function initFormAtividade() {
  const form = document.getElementById('form-atividade');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const titulo = document.getElementById('a-titulo').value.trim();
    if (!titulo) { mostrarToast('Descreva a atividade.', 'error'); return; }

    const resultado = getTagValue('resultado');
    const tipo = getTagValue('tipo');
    if (!resultado) { mostrarToast('Selecione a classificação por resultado.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione a classificação por tipo.', 'error'); return; }

    const id = document.getElementById('a-id').value;
    const existente = id ? STATE.atividades.find(a => a.id === id) : null;
    const dados = {
      id: id || gerarId(),
      titulo,
      resultado,
      tipo,
      status: getTagValue('status') || 'novo',
      prazo: document.getElementById('a-prazo').value,
      responsavelId: document.getElementById('a-responsavel').value,
      metaId: document.getElementById('a-meta').value,
      obs: document.getElementById('a-obs').value.trim(),
      criadoEm: existente ? existente.criadoEm : new Date().toISOString(),
    };

    if (id) {
      const idx = STATE.atividades.findIndex(a => a.id === id);
      STATE.atividades[idx] = dados;
      mostrarToast('Atividade atualizada!');
    } else {
      STATE.atividades.push(dados);
      mostrarToast('Atividade cadastrada!');
    }

    salvarDadosLider();
    renderAtividades();
    resetFormAtividade();
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

  document.getElementById('modal-atividade-salvar').addEventListener('click', () => {
    const id = document.getElementById('ma-id').value;
    const titulo = document.getElementById('ma-titulo').value.trim();
    if (!titulo) { mostrarToast('Descreva a atividade.', 'error'); return; }

    const resultado = getTagValue('ma-resultado');
    const tipo = getTagValue('ma-tipo');
    if (!resultado) { mostrarToast('Selecione a classificação por resultado.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione a classificação por tipo.', 'error'); return; }

    const idx = STATE.atividades.findIndex(a => a.id === id);
    if (idx === -1) return;

    STATE.atividades[idx] = {
      ...STATE.atividades[idx],
      titulo,
      resultado,
      tipo,
      status: getTagValue('ma-status') || 'novo',
      prazo: document.getElementById('ma-prazo').value,
      responsavelId: document.getElementById('ma-responsavel').value,
      metaId: document.getElementById('ma-meta').value,
      obs: document.getElementById('ma-obs').value.trim(),
    };

    salvarDadosLider();
    renderAtividades();
    fecharModalAtividade();
    mostrarToast('Atividade atualizada com sucesso!');
  });
}

function excluirAtividade(id) {
  if (!confirm('Deseja excluir esta atividade?')) return;
  STATE.atividades = STATE.atividades.filter(a => a.id !== id);
  salvarDadosLider();
  renderAtividades();
  mostrarToast('Atividade removida.', 'info');
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
  const vinculadas = STATE.atividades.filter(a => a.metaId === metaId);
  const concluidas = vinculadas.filter(a => a.status === 'concluido');
  const pct = vinculadas.length ? Math.round((concluidas.length / vinculadas.length) * 100) : 0;
  return { total: vinculadas.length, concluidas: concluidas.length, pct };
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
  document.getElementById('form-meta').addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('me-nome').value.trim();
    const tipo = getTagValue('me-tipo');
    if (!nome) { mostrarToast('Dê um nome à meta.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione a categoria da meta.', 'error'); return; }

    const id = document.getElementById('me-id').value;
    const existente = id ? STATE.metas.find(m => m.id === id) : null;
    const dados = {
      id: id || gerarId(),
      nome, tipo,
      indicador: document.getElementById('me-indicador').value.trim(),
      valor: document.getElementById('me-valor').value.trim(),
      prazo: document.getElementById('me-prazo').value,
      descricao: document.getElementById('me-desc').value.trim(),
      criadoEm: existente ? existente.criadoEm : new Date().toISOString(),
    };

    if (id) {
      const idx = STATE.metas.findIndex(m => m.id === id);
      STATE.metas[idx] = dados;
      mostrarToast('Meta atualizada!');
    } else {
      STATE.metas.push(dados);
      mostrarToast('Meta cadastrada!');
    }

    salvarDadosLider();
    renderMetas();
    resetFormMeta();
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

function excluirMeta(id) {
  if (!confirm('Excluir esta meta? As atividades vinculadas deixarão de referenciá-la.')) return;
  STATE.metas = STATE.metas.filter(m => m.id !== id);
  STATE.atividades.forEach(a => { if (a.metaId === id) a.metaId = ''; });
  salvarDadosLider();
  renderMetas();
  renderAtividades();
  mostrarToast('Meta removida.', 'info');
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

function initFormMatriz() {
  const form = document.getElementById('form-matriz');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const titulo = document.getElementById('m-titulo').value.trim();
    if (!titulo) { mostrarToast('Descreva a atividade.', 'error'); return; }

    const resultado = getTagValue('m-resultado');
    const esforco = getTagValue('m-esforco');
    if (!resultado) { mostrarToast('Selecione o nível de resultado.', 'error'); return; }
    if (!esforco) { mostrarToast('Selecione o nível de esforço.', 'error'); return; }

    const id = document.getElementById('m-id').value;
    const dados = {
      id: id || gerarId(),
      titulo,
      resultado,
      esforco,
      obs: document.getElementById('m-obs').value.trim(),
      criadoEm: id ? (STATE.matriz.find(m => m.id === id)?.criadoEm || new Date().toISOString()) : new Date().toISOString(),
    };

    if (id) {
      const idx = STATE.matriz.findIndex(m => m.id === id);
      STATE.matriz[idx] = dados;
      mostrarToast('Item atualizado na matriz!');
    } else {
      STATE.matriz.push(dados);
      const q = getQuadrante(resultado, esforco);
      const cfg = QUADRANTE_CONFIG[q];
      mostrarToast(`Adicionado em "${cfg.titulo}"!`);
    }

    salvarDadosLider();
    renderMatriz();
    resetFormMatriz();
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

function excluirMatriz(id) {
  if (!confirm('Deseja remover este item da matriz?')) return;
  STATE.matriz = STATE.matriz.filter(m => m.id !== id);
  salvarDadosLider();
  renderMatriz();
  mostrarToast('Item removido da matriz.', 'info');
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

  document.getElementById('form-rotina').addEventListener('submit', e => {
    e.preventDefault();
    const inicio = document.getElementById('rt-inicio').value;
    const fim = document.getElementById('rt-fim').value;
    const atividade = document.getElementById('rt-atividade').value.trim();
    const tipo = getTagValue('rt-tipo');
    if (!inicio || !fim || !atividade) { mostrarToast('Preencha horário de início, fim e a atividade.', 'error'); return; }
    if (!tipo) { mostrarToast('Selecione o tipo da atividade.', 'error'); return; }
    if (fim <= inicio) { mostrarToast('O horário de fim deve ser depois do início.', 'error'); return; }

    STATE.rotina.push({
      id: gerarId(),
      data: document.getElementById('rt-data').value || hojeISO(),
      inicio, fim, atividade, tipo,
      impacto: getTagValue('rt-impacto'),
      energia: getTagValue('rt-energia'),
      criadoEm: new Date().toISOString(),
    });

    salvarDadosLider();
    renderDashboardAll();

    document.getElementById('rt-inicio').value = '';
    document.getElementById('rt-fim').value = '';
    document.getElementById('rt-atividade').value = '';
    clearTagGroup('rt-tipo');
    clearTagGroup('rt-impacto');
    clearTagGroup('rt-energia');
    mostrarToast('Registrado na rotina do dia!');
  });
}

function excluirRotina(id) {
  STATE.rotina = STATE.rotina.filter(r => r.id !== id);
  salvarDadosLider();
  renderDashboardAll();
  mostrarToast('Registro removido.', 'info');
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
    input.addEventListener('change', () => {
      STATE.metaIdeal[input.dataset.ideal] = Number(input.value) || 0;
      salvarDadosLider();
      renderGraficoDashIdeal();
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
    input.addEventListener('change', () => {
      const id = input.closest('tr').dataset.id;
      const item = STATE.planoAcao.find(p => p.id === id);
      if (item) { item[input.dataset.campo] = input.value; salvarDadosLider(); }
    });
  });
}

function excluirLinhaPlanoAcao(id) {
  STATE.planoAcao = STATE.planoAcao.filter(p => p.id !== id);
  salvarDadosLider();
  renderPlanoAcao();
}

function initPlanoAcao() {
  document.getElementById('btn-add-plano-acao').addEventListener('click', () => {
    STATE.planoAcao.push({ id: gerarId(), acao: '', comoFazer: '', impacto: '', prazo: '' });
    salvarDadosLider();
    renderPlanoAcao();
  });
}

function renderChecklist(containerId, itens, stateObj) {
  const el = document.getElementById(containerId);
  el.innerHTML = itens.map(it => `
    <label class="checklist-item">
      <input type="checkbox" data-id="${it.id}" ${stateObj[it.id] ? 'checked' : ''} />
      <span>${it.texto}</span>
    </label>
  `).join('');
  el.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      stateObj[cb.dataset.id] = cb.checked;
      salvarDadosLider();
    });
  });
}

function renderDashboardAll() {
  renderTabelaRotina();
  renderGraficoDashAtual();
  renderGraficoDashIdeal();
  renderGargalos();
  renderPlanoAcao();
  renderChecklist('checklist-erros', ERROS_PLANEJAMENTO_ITENS, STATE.checklistErros);
  renderChecklist('checklist-lider', CHECKLIST_LIDER_ITENS, STATE.checklistLider);
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

document.addEventListener('DOMContentLoaded', () => {
  migrarDadosLegado();
  initNavegacao();
  initTagButtons();
  initTagButtonsMulti();
  initTelaPerfil();

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
  initSubtabsAtividades();
  initKanbanDrop();

  // Metas
  initFormMeta();

  // Matriz
  initFormMatriz();

  // Dashboard
  initFormRotina();
  initPlanoAcao();

  const ativoId = getPerfilAtivoId();
  const perfis = carregarPerfis();
  if (ativoId && perfis.some(p => p.id === ativoId)) {
    carregarDadosLider(ativoId);
    renderHeaderPerfil();
    renderTudo();
  } else {
    abrirTelaPerfil();
  }
});
