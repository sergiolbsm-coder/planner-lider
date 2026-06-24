#!/usr/bin/env python3
"""
Script para formatar visualmente a planilha com cores e estilos
"""

import subprocess
import json

SPREADSHEET_ID = "1YqfGN18QDR1xENf2auQCFEd_y6sHefw7dudYd3rt7nI"

SHEET_IDS = {
    "Diagnostico": 1839629494,
    "PlanejamentoAnual": 1102822356,
    "AcompanhamentoIndividual": 275588435,
    "Resultados": 1969901273
}

def gws_batch_update(requests_list):
    data = {"requests": requests_list}
    cmd = [
        "gws", "sheets", "spreadsheets", "batchUpdate",
        "--params", json.dumps({"spreadsheetId": SPREADSHEET_ID}),
        "--json", json.dumps(data)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERRO: {result.stderr}")
    else:
        print("Formatação aplicada com sucesso")
    return result

def make_header_format(sheet_id, num_cols, bg_r, bg_g, bg_b):
    return {
        "repeatCell": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": 0,
                "endRowIndex": 1,
                "startColumnIndex": 0,
                "endColumnIndex": num_cols
            },
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": {"red": bg_r, "green": bg_g, "blue": bg_b},
                    "textFormat": {
                        "bold": True,
                        "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                        "fontSize": 10
                    },
                    "wrapStrategy": "WRAP",
                    "verticalAlignment": "MIDDLE",
                    "horizontalAlignment": "CENTER"
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment,horizontalAlignment)"
        }
    }

def make_freeze_row(sheet_id):
    return {
        "updateSheetProperties": {
            "properties": {
                "sheetId": sheet_id,
                "gridProperties": {"frozenRowCount": 1}
            },
            "fields": "gridProperties.frozenRowCount"
        }
    }

def make_col_width(sheet_id, col_index, pixel_size):
    return {
        "updateDimensionProperties": {
            "range": {
                "sheetId": sheet_id,
                "dimension": "COLUMNS",
                "startIndex": col_index,
                "endIndex": col_index + 1
            },
            "properties": {"pixelSize": pixel_size},
            "fields": "pixelSize"
        }
    }

# Azul escuro para Diagnóstico (0.09, 0.46, 0.82)
# Verde escuro para Planejamento (0.13, 0.55, 0.13)
# Roxo para Acompanhamento (0.40, 0.13, 0.67)
# Laranja para Resultados (0.85, 0.44, 0.00)

requests = []

# Diagnóstico - cabeçalho azul
requests.append(make_header_format(SHEET_IDS["Diagnostico"], 46, 0.09, 0.46, 0.82))
requests.append(make_freeze_row(SHEET_IDS["Diagnostico"]))
# Largura das primeiras colunas
for i, w in enumerate([120, 180, 150]):
    requests.append(make_col_width(SHEET_IDS["Diagnostico"], i, w))
# Colunas de avaliação (3 a 42) - largura menor
for i in range(3, 43):
    requests.append(make_col_width(SHEET_IDS["Diagnostico"], i, 160))

# Planejamento Anual - cabeçalho verde
requests.append(make_header_format(SHEET_IDS["PlanejamentoAnual"], 18, 0.13, 0.55, 0.13))
requests.append(make_freeze_row(SHEET_IDS["PlanejamentoAnual"]))
for i, w in enumerate([120, 180, 150]):
    requests.append(make_col_width(SHEET_IDS["PlanejamentoAnual"], i, w))

# Acompanhamento Individual - cabeçalho roxo
requests.append(make_header_format(SHEET_IDS["AcompanhamentoIndividual"], 14, 0.40, 0.13, 0.67))
requests.append(make_freeze_row(SHEET_IDS["AcompanhamentoIndividual"]))
for i, w in enumerate([120, 180, 180, 150]):
    requests.append(make_col_width(SHEET_IDS["AcompanhamentoIndividual"], i, w))

# Resultados - cabeçalho laranja
requests.append(make_header_format(SHEET_IDS["Resultados"], 3, 0.85, 0.44, 0.00))
requests.append(make_freeze_row(SHEET_IDS["Resultados"]))
for i, w in enumerate([220, 160, 120]):
    requests.append(make_col_width(SHEET_IDS["Resultados"], i, w))

print("Aplicando formatação...")
gws_batch_update(requests)
print("Formatação concluída!")
