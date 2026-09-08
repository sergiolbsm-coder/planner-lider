# Planner do Líder — Impact Leader

> Sistema digital de planejamento, acompanhamento e diagnóstico para líderes — do chão de fábrica à alta liderança. Baseado no **Planner Impact Leader** do Instituto da Liderança.

---

## Visão Geral

O **Planner do Líder** é um app web (sem instalação, sem backend) em que cada líder cria seu próprio perfil e passa a ter um quadro só seu: cadastro de liderados, diário de bordo, quadro Kanban de atividades vinculadas a metas organizacionais, matriz de prioridade e um dashboard de gestão do tempo.

Todos os dados ficam salvos no navegador (localStorage), isolados por perfil de líder — várias pessoas podem usar o mesmo computador, cada uma com seu próprio quadro.

---

## Módulos

| Módulo | Descrição |
|---|---|
| **👥 Liderados** | Cadastro de cada membro da equipe — habilidades, expectativas, metas individuais e plano de desenvolvimento. |
| **📓 Diário de Bordo** | Conheça cada liderado (aspirações, pontos fortes, comportamentos, sentimentos) e registre observações do dia a dia (riscos psicossociais, sinais, conversas, plano de ação). Gera um **resumo pronto para feedback** mensal, semestral ou anual (com opção de impressão/PDF). |
| **🗂️ Atividades** | Quadro **Kanban** (A Fazer · Em Andamento · Bloqueado · Concluído) com arrastar-e-soltar ou botões ◀▶. Cada atividade é classificada por resultado e por tipo (Estratégico/Tático/Operacional), pode ser atribuída a um responsável e vinculada a uma meta organizacional. Também disponível em lista. |
| **🎯 Metas & Indicadores** | Cadastro de metas/indicadores organizacionais, com barra de progresso calculada automaticamente a partir das atividades do Kanban vinculadas a cada meta. |
| **📐 Matriz de Prioridade** | Matriz 2×2 (resultado × esforço) para decidir o que fazer agora, planejar, delegar ou eliminar. |
| **📊 Dashboard de Gestão do Tempo** | Registro da rotina diária (horários e atividades), identificação automática de gargalos, gráfico da categorização atual (Operacional/Tático/Estratégico) vs. alocação ideal (editável), plano de ação e os checklists de "erros de planejamento" e "líder eficiente". |

### Perfis de líder (multiusuário)

Ao abrir o app pela primeira vez (ou clicar em 🔁 no cabeçalho), você escolhe ou cria um perfil. Cada perfil tem seu próprio conjunto de liderados, quadro Kanban, metas, diário de bordo e dashboard — completamente isolado dos demais perfis no mesmo navegador.

---

## Estrutura do Projeto

```
planner-lider/
├── index.html              # Aplicação web principal
├── style.css               # Estilos visuais (design system do Instituto da Liderança)
├── app.js                  # Lógica de todos os módulos
├── google_apps_script.js   # Script opcional de integração com Google Sheets
├── setup_sheets.py         # Script de configuração da planilha (Python, uso opcional)
├── format_sheets.py        # Script de formatação da planilha (Python, uso opcional)
├── sheets_config.json      # Configurações da planilha (uso opcional)
└── README.md               # Esta documentação
```

---

## Como Usar

1. Abra o arquivo `index.html` no navegador (ou publique a pasta em qualquer hospedagem estática — GitHub Pages, Netlify, etc.).
2. Crie seu perfil de líder na tela inicial.
3. Cadastre seus liderados, monte seu quadro Kanban, defina metas e comece a registrar sua rotina no dashboard.
4. Os dados ficam salvos automaticamente no **localStorage** do navegador, por perfil. Para usar em outro computador, será necessário recriar o perfil e os dados nele (não há sincronização em nuvem nesta versão).

### Integração opcional com Google Sheets

Os arquivos `google_apps_script.js`, `setup_sheets.py`, `format_sheets.py` e `sheets_config.json` são um scaffold para, futuramente, sincronizar os dados com uma planilha Google como backup/consolidação entre líderes. Hoje eles não estão conectados aos módulos do app (que funcionam 100% localmente) — ficam disponíveis para quem quiser evoluir essa integração.

---

## Tecnologias Utilizadas

- **HTML5 / CSS3 / JavaScript** — interface web sem dependências de build.
- **Chart.js** — gráficos de distribuição de energia e do dashboard de gestão do tempo.
- **localStorage** — persistência local por perfil de líder.
- **Google Apps Script / Sheets** — scaffold opcional para integração futura.

---

## Instituto da Liderança

Site: [www.institutodalideranca.com.br](https://www.institutodalideranca.com.br)

---

*Planner Impact Leader · Todos os direitos reservados*
