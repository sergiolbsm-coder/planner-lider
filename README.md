# Diagnóstico do Líder — Impact Leader

> Sistema digital de autoavaliação e planejamento para líderes, baseado no **Planner Impact Leader 2025** do Instituto da Liderança.

---

## Visão Geral

Este sistema permite que o líder realize seu **diagnóstico pessoal de liderança**, registre seu **planejamento anual** e acompanhe o **desenvolvimento individual** de cada membro da equipe — tudo de forma simples, intuitiva e integrada ao Google Sheets.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Diagnóstico do Líder** | Autoavaliação em 8 dimensões com escala de 1 a 5, pontuação automática e nível de liderança |
| **Planejamento Anual** | Registro de expectativas, pontos fortes, visão/missão, metas e combinados |
| **Acompanhamento Individual** | Registro de habilidades, expectativas, metas e diferenciais de cada liderado |

### As 8 Dimensões do Diagnóstico

| Dimensão | Foco |
|---|---|
| 📅 Planejamento | Organização e visão estratégica |
| 📈 Performance | Acompanhamento de resultados e KPIs |
| 👥 Pessoas | Gestão e desenvolvimento de talentos |
| ⚙️ Processos | Eficiência operacional e padronização |
| 🚀 Projetos | Inovação, criatividade e entregas |
| 🔥 Problemas | Resolução de conflitos e crises |
| 🧘 Presença | Inteligência emocional e postura |
| ⚡ Produtividade | Eficiência pessoal e da equipe |

---

## Estrutura do Projeto

```
diagnostico-lider/
├── index.html              # Aplicação web principal
├── style.css               # Estilos visuais
├── app.js                  # Lógica do formulário e integração
├── google_apps_script.js   # Script para integração com Google Sheets
├── setup_sheets.py         # Script de configuração da planilha (Python)
├── format_sheets.py        # Script de formatação da planilha (Python)
├── sheets_config.json      # Configurações da planilha
└── README.md               # Esta documentação
```

---

## Planilha Google Sheets

A planilha já foi criada e configurada com 4 abas:

- **Diagnóstico** — Registros de autoavaliação
- **Planejamento Anual** — Planos anuais do líder
- **Acompanhamento Individual** — Registros por liderado
- **Resultados** — Painel resumido de pontuações

**Link da planilha:**
[Diagnóstico do Líder - Impact Leader](https://docs.google.com/spreadsheets/d/1YqfGN18QDR1xENf2auQCFEd_y6sHefw7dudYd3rt7nI/edit)

---

## Como Usar

### Opção 1 — Uso Offline (Sem configuração adicional)

1. Abra o arquivo `index.html` no navegador
2. Preencha os formulários normalmente
3. Os dados são salvos automaticamente no **localStorage** do navegador
4. Para exportar, acesse o console do navegador (F12) e copie os dados

### Opção 2 — Integração com Google Sheets (Recomendado)

Para que os dados sejam enviados automaticamente para a planilha:

**Passo 1 — Criar o Google Apps Script:**

1. Acesse [script.google.com](https://script.google.com/)
2. Clique em **Novo projeto**
3. Cole o conteúdo do arquivo `google_apps_script.js`
4. Salve o projeto (Ctrl+S)

**Passo 2 — Publicar como Web App:**

1. Clique em **Implantar** > **Nova implantação**
2. Selecione o tipo: **Aplicativo da Web**
3. Configure:
   - **Executar como:** Eu
   - **Quem tem acesso:** Qualquer pessoa
4. Clique em **Implantar**
5. Autorize as permissões solicitadas
6. **Copie a URL gerada**

**Passo 3 — Configurar no app.js:**

Abra o arquivo `app.js` e substitua a linha:

```javascript
APPS_SCRIPT_URL: "",
```

Por:

```javascript
APPS_SCRIPT_URL: "https://script.google.com/macros/s/SEU_ID_AQUI/exec",
```

**Passo 4 — Testar:**

Preencha e envie um formulário. Os dados devem aparecer na planilha em segundos.

---

## Interpretação dos Resultados

| Percentual | Nível |
|---|---|
| 85% a 100% | 🏆 Líder de Alto Impacto |
| 70% a 84% | ⭐ Líder Avançado |
| 55% a 69% | 📈 Líder em Desenvolvimento |
| 40% a 54% | 🌱 Líder Iniciante |
| Abaixo de 40% | 🔍 Diagnóstico inicial |

---

## Tecnologias Utilizadas

- **HTML5 / CSS3 / JavaScript** — Interface web sem dependências externas
- **Google Sheets API** — Armazenamento de dados via gws CLI
- **Google Apps Script** — Integração web-to-sheets
- **GitHub** — Versionamento e documentação

---

## Instituto da Liderança

Site: [www.institutodalideranca.com.br](https://www.institutodalideranca.com.br)

---

*Planner Impact Leader 2025 · Todos os direitos reservados*
