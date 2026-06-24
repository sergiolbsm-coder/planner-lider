/* ============================================================
   PLANNER DO LÍDER — Impact Leader
   app.js — Lógica principal do formulário
============================================================ */

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const CONFIG = {
  // URL do Google Apps Script Web App (configurar após publicar o script)
  // Deixe vazio para modo offline (dados salvos localmente)
  APPS_SCRIPT_URL: "",
  SPREADSHEET_URL: "https://docs.google.com/spreadsheets/d/1YqfGN18QDR1xENf2auQCFEd_y6sHefw7dudYd3rt7nI/edit"
};

// ============================================================
// DADOS DAS DIMENSÕES
// ============================================================
const DIMENSOES = [
  {
    id: "planejamento",
    icon: "📅",
    title: "Planejamento",
    subtitle: "Organização e visão estratégica",
    color: "#1565C0",
    bg: "#E3F2FD",
    itens: [
      "Estabelecer metas e objetivos claros",
      "Planejar a semana e o mês com antecedência",
      "Definir prioridades claras para a equipe",
      "Revisar estratégias com frequência",
      "Antecipar demandas futuras"
    ]
  },
  {
    id: "performance",
    icon: "📈",
    title: "Performance",
    subtitle: "Acompanhamento de resultados e KPIs",
    color: "#2E7D32",
    bg: "#E8F5E9",
    itens: [
      "Acompanhar KPIs e metas regularmente",
      "Analisar resultados da equipe com dados",
      "Avaliar a produtividade individual e coletiva",
      "Reportar indicadores estratégicos",
      "Criar planos de ação com base em dados"
    ]
  },
  {
    id: "pessoas",
    icon: "👥",
    title: "Pessoas",
    subtitle: "Gestão e desenvolvimento de talentos",
    color: "#6A1B9A",
    bg: "#F3E5F5",
    itens: [
      "Dar feedbacks construtivos com frequência",
      "Motivar e engajar a equipe",
      "Acompanhar o desempenho individual",
      "Resolver conflitos internos com imparcialidade",
      "Delegar tarefas com clareza e confiança"
    ]
  },
  {
    id: "processos",
    icon: "⚙️",
    title: "Processos",
    subtitle: "Eficiência operacional e padronização",
    color: "#E65100",
    bg: "#FFF3E0",
    itens: [
      "Mapear e padronizar processos da equipe",
      "Identificar gargalos e retrabalhos",
      "Automatizar rotinas repetitivas",
      "Garantir a qualidade das entregas",
      "Otimizar o uso de recursos disponíveis"
    ]
  },
  {
    id: "projetos",
    icon: "🚀",
    title: "Projetos",
    subtitle: "Inovação, criatividade e entregas",
    color: "#00695C",
    bg: "#E0F2F1",
    itens: [
      "Liderar projetos de melhoria ou inovação",
      "Gerenciar prazos e entregas com disciplina",
      "Envolver equipes interdisciplinares",
      "Estimular a criatividade da equipe",
      "Avaliar impacto e viabilidade dos projetos"
    ]
  },
  {
    id: "problemas",
    icon: "🔥",
    title: "Problemas",
    subtitle: "Resolução de conflitos e crises",
    color: "#B71C1C",
    bg: "#FFEBEE",
    itens: [
      "Resolver situações urgentes com agilidade",
      "Tomar decisões assertivas sob pressão",
      "Lidar com erros como oportunidade de aprendizado",
      "Mediar conflitos com imparcialidade",
      "Manter a calma em momentos críticos"
    ]
  },
  {
    id: "presenca",
    icon: "🧘",
    title: "Presença",
    subtitle: "Inteligência emocional e postura",
    color: "#1565C0",
    bg: "#E8EAF6",
    itens: [
      "Gerenciar o próprio tempo com eficiência",
      "Cuidar da saúde mental e da energia pessoal",
      "Ser exemplo de postura e atitude",
      "Comunicar com clareza e empatia",
      "Desenvolver a inteligência emocional"
    ]
  },
  {
    id: "produtividade",
    icon: "⚡",
    title: "Produtividade",
    subtitle: "Eficiência pessoal e da equipe",
    color: "#F57F17",
    bg: "#FFFDE7",
    itens: [
      "Otimizar o tempo e os recursos disponíveis",
      "Reduzir retrabalho e desperdício de esforço",
      "Melhorar os fluxos de trabalho continuamente",
      "Avaliar e melhorar o rendimento da equipe"
    ]
  }
];

// ============================================================
// ESTADO GLOBAL
// ============================================================
const state = {
  notas: {} // { "planejamento_0": 3, "performance_2": 5, ... }
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderDimensoes();
  setupNavTabs();
  setupForms();
  setupModalClose();
  updateScorePanel();
});

// ============================================================
// NAVEGAÇÃO POR ABAS
// ============================================================
function setupNavTabs() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`section-${target}`).classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ============================================================
// RENDERIZAR DIMENSÕES DE AVALIAÇÃO
// ============================================================
function renderDimensoes() {
  const container = document.getElementById("dimensoes-container");
  if (!container) return;

  DIMENSOES.forEach((dim, dIdx) => {
    const card = document.createElement("div");
    card.className = "dimensao-card";
    card.id = `dim-${dim.id}`;

    // Calcular pontuação inicial
    const maxPts = dim.itens.length * 5;

    card.innerHTML = `
      <div class="dimensao-header" onclick="toggleDimensao('${dim.id}')">
        <div class="dimensao-badge" style="background:${dim.bg}; color:${dim.color}">
          ${dim.icon}
        </div>
        <div class="dimensao-info">
          <div class="dimensao-title">${dim.title}</div>
          <div class="dimensao-subtitle">${dim.subtitle}</div>
        </div>
        <div class="dimensao-score-badge" id="badge-${dim.id}">0 / ${maxPts}</div>
        <div class="dimensao-chevron">▼</div>
      </div>
      <div class="dimensao-body">
        ${dim.itens.map((item, iIdx) => `
          <div class="item-avaliacao">
            <div class="item-label">${item}</div>
            <div class="escala">
              ${[1,2,3,4,5].map(n => `
                <button type="button"
                  class="escala-btn"
                  data-dim="${dim.id}"
                  data-idx="${iIdx}"
                  data-val="${n}"
                  onclick="setNota('${dim.id}', ${iIdx}, ${n}, this)"
                  title="Nota ${n}"
                >${n}</button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    container.appendChild(card);
  });

  // Abrir a primeira dimensão por padrão
  toggleDimensao(DIMENSOES[0].id);
}

// ============================================================
// TOGGLE DIMENSÃO
// ============================================================
function toggleDimensao(dimId) {
  const card = document.getElementById(`dim-${dimId}`);
  if (!card) return;
  card.classList.toggle("open");
}

// ============================================================
// DEFINIR NOTA
// ============================================================
function setNota(dimId, itemIdx, valor, btnEl) {
  const key = `${dimId}_${itemIdx}`;
  state.notas[key] = valor;

  // Atualizar visual dos botões da escala
  const allBtns = document.querySelectorAll(
    `.escala-btn[data-dim="${dimId}"][data-idx="${itemIdx}"]`
  );
  allBtns.forEach(b => {
    b.className = "escala-btn";
    if (parseInt(b.dataset.val) === valor) {
      b.classList.add(`selected-${valor}`);
    }
  });

  // Atualizar badge da dimensão
  updateDimBadge(dimId);

  // Atualizar painel de pontuação
  updateScorePanel();
}

// ============================================================
// ATUALIZAR BADGE DA DIMENSÃO
// ============================================================
function updateDimBadge(dimId) {
  const dim = DIMENSOES.find(d => d.id === dimId);
  if (!dim) return;

  let pts = 0;
  dim.itens.forEach((_, i) => {
    pts += state.notas[`${dimId}_${i}`] || 0;
  });

  const badge = document.getElementById(`badge-${dimId}`);
  if (badge) badge.textContent = `${pts} / ${dim.itens.length * 5}`;
}

// ============================================================
// ATUALIZAR PAINEL DE PONTUAÇÃO TOTAL
// ============================================================
function updateScorePanel() {
  let total = 0;
  let maxTotal = 0;

  DIMENSOES.forEach(dim => {
    dim.itens.forEach((_, i) => {
      total += state.notas[`${dim.id}_${i}`] || 0;
      maxTotal += 5;
    });
  });

  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  const scoreVal = document.getElementById("score-total");
  const scoreBar = document.getElementById("score-bar");
  const scoreLevel = document.getElementById("score-level");

  if (scoreVal) scoreVal.textContent = `${total} / ${maxTotal}`;
  if (scoreBar) scoreBar.style.width = `${pct}%`;

  if (scoreLevel) {
    if (total === 0) {
      scoreLevel.textContent = "Preencha o formulário para ver seu resultado";
    } else if (pct >= 85) {
      scoreLevel.textContent = "🏆 Líder de Alto Impacto — Excelência em liderança";
    } else if (pct >= 70) {
      scoreLevel.textContent = "⭐ Líder Avançado — Forte desempenho com pontos de refinamento";
    } else if (pct >= 55) {
      scoreLevel.textContent = "📈 Líder em Desenvolvimento — Boas bases, com oportunidades claras";
    } else if (pct >= 40) {
      scoreLevel.textContent = "🌱 Líder Iniciante — Fundamentos a fortalecer";
    } else {
      scoreLevel.textContent = "🔍 Diagnóstico inicial — Muitas oportunidades de crescimento";
    }
  }

  // Atualizar mini-scores das dimensões
  const dimScores = document.getElementById("dimension-scores");
  if (dimScores) {
    dimScores.innerHTML = DIMENSOES.map(dim => {
      let pts = 0;
      dim.itens.forEach((_, i) => { pts += state.notas[`${dim.id}_${i}`] || 0; });
      const max = dim.itens.length * 5;
      return `
        <div class="dim-score-item">
          <span class="dim-score-name">${dim.icon} ${dim.title}</span>
          <span class="dim-score-val">${pts}/${max}</span>
        </div>
      `;
    }).join("");
  }
}

// ============================================================
// CONFIGURAR FORMULÁRIOS
// ============================================================
function setupForms() {
  // Diagnóstico
  const formDiag = document.getElementById("form-diagnostico");
  if (formDiag) {
    formDiag.addEventListener("submit", e => {
      e.preventDefault();
      submitDiagnostico();
    });
  }

  document.getElementById("btn-limpar")?.addEventListener("click", () => {
    if (confirm("Deseja limpar todos os dados do formulário?")) {
      document.getElementById("form-diagnostico").reset();
      state.notas = {};
      document.querySelectorAll(".escala-btn").forEach(b => b.className = "escala-btn");
      DIMENSOES.forEach(d => {
        const badge = document.getElementById(`badge-${d.id}`);
        if (badge) badge.textContent = `0 / ${d.itens.length * 5}`;
      });
      updateScorePanel();
    }
  });

  // Planejamento
  const formPlan = document.getElementById("form-planejamento");
  if (formPlan) {
    formPlan.addEventListener("submit", e => {
      e.preventDefault();
      submitPlanejamento();
    });
  }

  document.getElementById("btn-limpar-plan")?.addEventListener("click", () => {
    if (confirm("Deseja limpar todos os dados do formulário?")) {
      document.getElementById("form-planejamento").reset();
    }
  });

  // Acompanhamento
  const formAcomp = document.getElementById("form-acompanhamento");
  if (formAcomp) {
    formAcomp.addEventListener("submit", e => {
      e.preventDefault();
      submitAcompanhamento();
    });
  }

  document.getElementById("btn-limpar-acomp")?.addEventListener("click", () => {
    if (confirm("Deseja limpar todos os dados do formulário?")) {
      document.getElementById("form-acompanhamento").reset();
    }
  });
}

// ============================================================
// SUBMISSÃO — DIAGNÓSTICO
// ============================================================
function submitDiagnostico() {
  const nome = document.getElementById("d-nome").value.trim();
  const area = document.getElementById("d-area").value.trim();

  if (!nome || !area) {
    showToast("Preencha o nome e a área antes de salvar.");
    return;
  }

  // Verificar se pelo menos uma nota foi dada
  const totalNotas = Object.keys(state.notas).length;
  if (totalNotas === 0) {
    showToast("Avalie pelo menos uma dimensão antes de salvar.");
    return;
  }

  // Montar linha de dados
  const now = new Date().toLocaleString("pt-BR");
  const row = [now, nome, area];

  DIMENSOES.forEach(dim => {
    dim.itens.forEach((_, i) => {
      row.push(state.notas[`${dim.id}_${i}`] || "");
    });
  });

  // Calcular total
  let total = 0;
  Object.values(state.notas).forEach(v => { total += v; });
  row.push(total);
  row.push(document.getElementById("d-obs").value.trim());

  saveToSheets("Diagnóstico", row, "diagnostico");
}

// ============================================================
// SUBMISSÃO — PLANEJAMENTO
// ============================================================
function submitPlanejamento() {
  const nome = document.getElementById("p-nome").value.trim();
  const area = document.getElementById("p-area").value.trim();

  if (!nome || !area) {
    showToast("Preencha o nome e a área antes de salvar.");
    return;
  }

  const form = document.getElementById("form-planejamento");
  const fd = new FormData(form);

  const now = new Date().toLocaleString("pt-BR");
  const row = [
    now,
    fd.get("nome") || "",
    fd.get("area") || "",
    fd.get("expectativa_1") || "",
    fd.get("expectativa_2") || "",
    fd.get("expectativa_3") || "",
    fd.get("expectativa_4") || "",
    fd.get("expectativa_5") || "",
    fd.get("expectativa_6") || "",
    fd.get("expectativa_7") || "",
    fd.get("forte_1") || "",
    fd.get("forte_2") || "",
    fd.get("forte_3") || "",
    fd.get("visao_missao") || "",
    fd.get("meta_desempenho") || "",
    fd.get("meta_processos") || "",
    fd.get("lema_ano") || "",
    fd.get("combinados") || ""
  ];

  saveToSheets("Planejamento Anual", row, "planejamento");
}

// ============================================================
// SUBMISSÃO — ACOMPANHAMENTO INDIVIDUAL
// ============================================================
function submitAcompanhamento() {
  const lider = document.getElementById("a-lider").value.trim();
  const liderado = document.getElementById("a-liderado").value.trim();

  if (!lider || !liderado) {
    showToast("Preencha o nome do líder e do liderado antes de salvar.");
    return;
  }

  const form = document.getElementById("form-acompanhamento");
  const fd = new FormData(form);

  const now = new Date().toLocaleString("pt-BR");
  const row = [
    now,
    fd.get("lider") || "",
    fd.get("liderado") || "",
    fd.get("area") || "",
    fd.get("habilidade_1") || "",
    fd.get("habilidade_2") || "",
    fd.get("habilidade_3") || "",
    fd.get("habilidade_4") || "",
    fd.get("atende_expectativas") || "",
    fd.get("nao_atende_expectativas") || "",
    fd.get("metas") || "",
    fd.get("projetos") || "",
    fd.get("diferencial") || "",
    fd.get("proximos_passos") || ""
  ];

  saveToSheets("Acompanhamento Individual", row, "acompanhamento");
}

// ============================================================
// SALVAR NA PLANILHA (via Apps Script ou localStorage)
// ============================================================
function saveToSheets(sheetName, rowData, formType) {
  const btn = document.querySelector(`#form-${formType} .btn-primary`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Salvando...';
  }

  if (CONFIG.APPS_SCRIPT_URL) {
    // Enviar via Google Apps Script
    const payload = { sheet: sheetName, row: rowData };

    fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(() => {
      saveLocalBackup(sheetName, rowData);
      showModal(`Diagnóstico salvo com sucesso! Os dados foram registrados na planilha "${sheetName}".`);
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="btn-icon">📊</span> Salvar Diagnóstico'; }
    })
    .catch(err => {
      console.error(err);
      saveLocalBackup(sheetName, rowData);
      showModal(`Dados salvos localmente. Para sincronizar com a planilha, configure o Google Apps Script.`);
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="btn-icon">📊</span> Salvar Diagnóstico'; }
    });
  } else {
    // Modo offline — salvar no localStorage
    saveLocalBackup(sheetName, rowData);
    setTimeout(() => {
      showModal(`Dados salvos localmente com sucesso!\n\nPara sincronizar automaticamente com o Google Sheets, siga as instruções no arquivo README.md.`);
      if (btn) {
        btn.disabled = false;
        const icons = { diagnostico: "📊", planejamento: "💾", acompanhamento: "💾" };
        const labels = { diagnostico: "Salvar Diagnóstico", planejamento: "Salvar Planejamento", acompanhamento: "Salvar Acompanhamento" };
        btn.innerHTML = `<span class="btn-icon">${icons[formType]}</span> ${labels[formType]}`;
      }
    }, 600);
  }
}

// ============================================================
// BACKUP LOCAL (localStorage)
// ============================================================
function saveLocalBackup(sheetName, rowData) {
  try {
    const key = `il_backup_${sheetName.replace(/\s/g, "_")}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(rowData);
    localStorage.setItem(key, JSON.stringify(existing));
    console.log(`Backup local salvo: ${key} (${existing.length} registros)`);
  } catch (e) {
    console.warn("Não foi possível salvar backup local:", e);
  }
}

// ============================================================
// MODAL
// ============================================================
function showModal(text) {
  document.getElementById("modal-text").textContent = text;
  document.getElementById("modal-overlay").classList.add("visible");
}

function setupModalClose() {
  document.getElementById("modal-close")?.addEventListener("click", () => {
    document.getElementById("modal-overlay").classList.remove("visible");
  });
  document.getElementById("modal-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove("visible");
    }
  });
}

// ============================================================
// TOAST DE ERRO
// ============================================================
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 3500);
}
