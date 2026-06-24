/* ============================================================
   PLANNER DO LÍDER — Impact Leader
   app.js — Lógica principal dos módulos
   Módulos: Liderados · Atividades · Matriz de Prioridade
============================================================ */

// ============================================================
// ESTADO GLOBAL
// ============================================================
const STATE = {
  liderados: [],
  atividades: [],
  matriz: [],
  filtroResultado: 'todos',
  filtroTipo: 'todos',
  lideradoSelecionado: null,
};

// ============================================================
// PERSISTÊNCIA — localStorage
// ============================================================
function salvarDados() {
  localStorage.setItem('planner_liderados', JSON.stringify(STATE.liderados));
  localStorage.setItem('planner_atividades', JSON.stringify(STATE.atividades));
  localStorage.setItem('planner_matriz', JSON.stringify(STATE.matriz));
}

function carregarDados() {
  try {
    STATE.liderados = JSON.parse(localStorage.getItem('planner_liderados') || '[]');
    STATE.atividades = JSON.parse(localStorage.getItem('planner_atividades') || '[]');
    STATE.matriz = JSON.parse(localStorage.getItem('planner_matriz') || '[]');
  } catch (e) {
    STATE.liderados = [];
    STATE.atividades = [];
    STATE.matriz = [];
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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
function initNavegacao() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const secao = btn.dataset.section;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('section-' + secao).classList.add('active');
    });
  });
}

// ============================================================
// TAG BUTTONS (seleção única por grupo)
// ============================================================
function initTagButtons() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    const group = btn.dataset.group;
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
    return;
  }

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
        <button class="btn-icon" title="Ver detalhes" onclick="verLiderado('${l.id}')">👁️</button>
        <button class="btn-icon" title="Editar" onclick="editarLiderado('${l.id}')">✏️</button>
        <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirLiderado('${l.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function initFormLiderado() {
  const form = document.getElementById('form-liderado');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('l-nome').value.trim();
    const cargo = document.getElementById('l-cargo').value.trim();
    if (!nome || !cargo) { mostrarToast('Preencha nome e cargo.', 'error'); return; }

    const id = document.getElementById('l-id').value;
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
      criadoEm: id ? (STATE.liderados.find(l => l.id === id)?.criadoEm || new Date().toISOString()) : new Date().toISOString(),
    };

    if (id) {
      const idx = STATE.liderados.findIndex(l => l.id === id);
      STATE.liderados[idx] = dados;
      mostrarToast('Liderado atualizado com sucesso!');
    } else {
      STATE.liderados.push(dados);
      mostrarToast('Liderado cadastrado com sucesso!');
    }

    salvarDados();
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
  document.querySelector('#section-liderados .form-card').scrollIntoView({ behavior: 'smooth' });
}

function excluirLiderado(id) {
  if (!confirm('Deseja excluir este liderado?')) return;
  STATE.liderados = STATE.liderados.filter(l => l.id !== id);
  salvarDados();
  renderLiderados();
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
    // Navegar para a aba de liderados
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelector('[data-section="liderados"]').classList.add('active');
    document.getElementById('section-liderados').classList.add('active');
  });
  document.getElementById('modal-liderado-excluir').addEventListener('click', () => {
    document.getElementById('modal-liderado').style.display = 'none';
    excluirLiderado(STATE.lideradoSelecionado);
  });
}

// ============================================================
// MÓDULO 2 — ATIVIDADES
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

function renderAtividades() {
  const container = document.getElementById('lista-atividades');
  const badge = document.getElementById('badge-total-atividades');

  // Filtrar
  let lista = STATE.atividades.filter(a => {
    const okR = STATE.filtroResultado === 'todos' || a.resultado === STATE.filtroResultado;
    const okT = STATE.filtroTipo === 'todos' || a.tipo === STATE.filtroTipo;
    return okR && okT;
  });

  badge.textContent = STATE.atividades.length;

  // Atualizar stats
  ['alto','medio','baixo','delegavel','eliminavel'].forEach(k => {
    document.getElementById('stat-' + k).textContent = STATE.atividades.filter(a => a.resultado === k).length;
  });
  ['estrategico','tatico','operacional'].forEach(k => {
    document.getElementById('stat-' + k).textContent = STATE.atividades.filter(a => a.tipo === k).length;
  });

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>${STATE.atividades.length === 0 ? 'Nenhuma atividade cadastrada ainda.<br>Use o formulário acima para começar.' : 'Nenhuma atividade encontrada com os filtros selecionados.'}</p>
      </div>`;
    return;
  }

  container.innerHTML = lista.map(a => {
    const rc = RESULTADO_CONFIG[a.resultado] || {};
    const tc = TIPO_CONFIG[a.tipo] || {};
    return `
    <div class="atividade-item" data-id="${a.id}">
      <div class="atividade-main">
        <div class="atividade-titulo">${a.titulo}</div>
        <div class="atividade-tags">
          ${a.resultado ? `<span class="tag-pill" style="background:${rc.bg};color:${rc.cor}">${rc.label}</span>` : ''}
          ${a.tipo ? `<span class="tag-pill" style="background:${tc.bg};color:${tc.cor}">${tc.label}</span>` : ''}
          ${a.prazo ? `<span class="tag-pill tag-prazo">📅 ${formatarData(a.prazo)}</span>` : ''}
          ${a.responsavel ? `<span class="tag-pill tag-responsavel">👤 ${a.responsavel}</span>` : ''}
        </div>
        ${a.obs ? `<div class="atividade-obs">${a.obs}</div>` : ''}
      </div>
      <div class="atividade-acoes">
        <button class="btn-icon" title="Editar" onclick="editarAtividade('${a.id}')">✏️</button>
        <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirAtividade('${a.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
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
    const dados = {
      id: id || gerarId(),
      titulo,
      resultado,
      tipo,
      prazo: document.getElementById('a-prazo').value,
      responsavel: document.getElementById('a-responsavel').value.trim(),
      obs: document.getElementById('a-obs').value.trim(),
      criadoEm: id ? (STATE.atividades.find(a => a.id === id)?.criadoEm || new Date().toISOString()) : new Date().toISOString(),
    };

    if (id) {
      const idx = STATE.atividades.findIndex(a => a.id === id);
      STATE.atividades[idx] = dados;
      mostrarToast('Atividade atualizada!');
    } else {
      STATE.atividades.push(dados);
      mostrarToast('Atividade cadastrada!');
    }

    salvarDados();
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
  document.getElementById('atividade-form-title').textContent = 'Nova Atividade';
  document.getElementById('btn-cancelar-atividade').style.display = 'none';
}

function editarAtividade(id) {
  const a = STATE.atividades.find(x => x.id === id);
  if (!a) return;
  document.getElementById('a-id').value = a.id;
  document.getElementById('a-titulo').value = a.titulo;
  document.getElementById('a-prazo').value = a.prazo || '';
  document.getElementById('a-responsavel').value = a.responsavel || '';
  document.getElementById('a-obs').value = a.obs || '';
  setTagValue('resultado', a.resultado);
  setTagValue('tipo', a.tipo);
  document.getElementById('atividade-form-title').textContent = 'Editar Atividade';
  document.getElementById('btn-cancelar-atividade').style.display = 'inline-flex';
  document.querySelector('#section-atividades .form-card').scrollIntoView({ behavior: 'smooth' });
}

function excluirAtividade(id) {
  if (!confirm('Deseja excluir esta atividade?')) return;
  STATE.atividades = STATE.atividades.filter(a => a.id !== id);
  salvarDados();
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

    salvarDados();
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
  document.querySelector('#section-matriz .form-card').scrollIntoView({ behavior: 'smooth' });
}

function excluirMatriz(id) {
  if (!confirm('Deseja remover este item da matriz?')) return;
  STATE.matriz = STATE.matriz.filter(m => m.id !== id);
  salvarDados();
  renderMatriz();
  mostrarToast('Item removido da matriz.', 'info');
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  carregarDados();
  initNavegacao();
  initTagButtons();

  // Liderados
  initFormLiderado();
  initModalLiderado();
  renderLiderados();

  // Atividades
  initFormAtividade();
  initFiltrosAtividades();
  renderAtividades();

  // Matriz
  initFormMatriz();
  renderMatriz();
});
