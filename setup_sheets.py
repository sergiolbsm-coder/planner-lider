#!/usr/bin/env python3
"""
Script para configurar os cabeçalhos e formatação da planilha
Diagnóstico do Líder - Impact Leader
"""

import subprocess
import json

SPREADSHEET_ID = "1YqfGN18QDR1xENf2auQCFEd_y6sHefw7dudYd3rt7nI"

def gws_update(data):
    cmd = [
        "gws", "sheets", "spreadsheets", "batchUpdate",
        "--params", json.dumps({"spreadsheetId": SPREADSHEET_ID}),
        "--json", json.dumps(data)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERRO: {result.stderr}")
    else:
        print("OK")
    return result

def gws_values_update(range_name, values):
    cmd = [
        "gws", "sheets", "spreadsheets", "values", "update",
        "--params", json.dumps({
            "spreadsheetId": SPREADSHEET_ID,
            "range": range_name,
            "valueInputOption": "USER_ENTERED"
        }),
        "--json", json.dumps({"values": values})
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERRO ao atualizar {range_name}: {result.stderr}")
    else:
        print(f"Valores inseridos em {range_name}")
    return result

# ============================================================
# ABA 1: DIAGNÓSTICO
# ============================================================
print("Configurando aba Diagnóstico...")

diagnostico_headers = [
    ["Data", "Nome do Líder", "Área / Setor",
     # Planejamento (1-5)
     "Planejamento - Estabelecer metas e objetivos",
     "Planejamento - Planejar a semana/mês",
     "Planejamento - Definir prioridades claras",
     "Planejamento - Revisar estratégias com frequência",
     "Planejamento - Antecipar demandas futuras",
     # Performance (1-5)
     "Performance - Acompanhar KPIs e metas",
     "Performance - Analisar resultados da equipe",
     "Performance - Avaliar produtividade",
     "Performance - Reportar indicadores estratégicos",
     "Performance - Criar planos de ação com base em dados",
     # Pessoas (1-5)
     "Pessoas - Dar feedbacks construtivos",
     "Pessoas - Motivar e engajar a equipe",
     "Pessoas - Acompanhar desempenho individual",
     "Pessoas - Resolver conflitos internos",
     "Pessoas - Delegar com clareza",
     # Processos (1-5)
     "Processos - Mapear e padronizar processos",
     "Processos - Identificar gargalos e retrabalhos",
     "Processos - Automatizar rotinas repetitivas",
     "Processos - Garantir qualidade das entregas",
     "Processos - Otimizar o uso de recursos",
     # Projetos (1-5)
     "Projetos - Liderar projetos de melhoria ou inovação",
     "Projetos - Gerenciar prazos e entregas",
     "Projetos - Envolver equipes interdisciplinares",
     "Projetos - Estimular criatividade",
     "Projetos - Avaliar impacto e viabilidade",
     # Problemas (1-5)
     "Problemas - Resolver situações urgentes",
     "Problemas - Tomar decisões sob pressão",
     "Problemas - Lidar com erros e aprendizados",
     "Problemas - Mediar conflitos com imparcialidade",
     "Problemas - Manter calma em momentos críticos",
     # Presença (1-5)
     "Presença - Gerenciar o próprio tempo",
     "Presença - Cuidar da saúde mental e energia",
     "Presença - Ser exemplo de postura e atitude",
     "Presença - Comunicar com clareza e empatia",
     "Presença - Desenvolver inteligência emocional",
     # Produtividade (1-5)
     "Produtividade - Otimizar tempo e recursos",
     "Produtividade - Reduzir retrabalho",
     "Produtividade - Melhorar fluxos de trabalho",
     "Produtividade - Avaliar rendimento da equipe",
     # Pontuação total
     "Pontuação Total",
     "Observações / Comentários"
    ]
]

gws_values_update("Diagnóstico!A1", diagnostico_headers)

# ============================================================
# ABA 2: PLANEJAMENTO ANUAL
# ============================================================
print("Configurando aba Planejamento Anual...")

planejamento_headers = [
    ["Data", "Nome do Líder", "Área / Setor",
     "Expectativa 1", "Expectativa 2", "Expectativa 3",
     "Expectativa 4", "Expectativa 5", "Expectativa 6", "Expectativa 7",
     "Ponto Forte da Equipe 1", "Ponto Forte da Equipe 2", "Ponto Forte da Equipe 3",
     "Visão e Missão",
     "Meta de Desempenho",
     "Meta de Processos",
     "Lema do Ano",
     "Combinados (resumo)"
    ]
]

gws_values_update("Planejamento Anual!A1", planejamento_headers)

# ============================================================
# ABA 3: ACOMPANHAMENTO INDIVIDUAL
# ============================================================
print("Configurando aba Acompanhamento Individual...")

acomp_headers = [
    ["Data", "Nome do Líder", "Nome do Liderado", "Área / Setor",
     "Habilidade a Potencializar 1", "Habilidade a Potencializar 2",
     "Habilidade a Potencializar 3", "Habilidade a Potencializar 4",
     "No que atende as expectativas",
     "No que não atende as expectativas",
     "Metas acordadas",
     "Principais atividades e projetos",
     "Diferencial do liderado",
     "Próximos passos"
    ]
]

gws_values_update("Acompanhamento Individual!A1", acomp_headers)

# ============================================================
# ABA 4: RESULTADOS (Dashboard resumido)
# ============================================================
print("Configurando aba Resultados...")

resultados_data = [
    ["PAINEL DE RESULTADOS - Diagnóstico do Líder"],
    [""],
    ["Dimensão", "Pontuação Média", "Nível"],
    ["Planejamento", "=AVERAGEIF(Diagnóstico!A:A,\"<>\"&\"Data\",Diagnóstico!D:H)", ""],
    ["Performance", "", ""],
    ["Pessoas", "", ""],
    ["Processos", "", ""],
    ["Projetos", "", ""],
    ["Problemas", "", ""],
    ["Presença", "", ""],
    ["Produtividade", "", ""],
    [""],
    ["Total de diagnósticos realizados", "=COUNTA(Diagnóstico!A:A)-1", ""],
]

gws_values_update("Resultados!A1", resultados_data)

print("\nConfiguração da planilha concluída!")
print(f"URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")
