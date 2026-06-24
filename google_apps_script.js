/**
 * Google Apps Script — Planner do Líder
 * Instituto da Liderança · Impact Leader
 *
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 1. Acesse: https://script.google.com/
 * 2. Crie um novo projeto e cole este código
 * 3. Substitua SPREADSHEET_ID pelo ID da sua planilha
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Tipo: "Aplicativo da Web"
 * 6. Executar como: "Eu"
 * 7. Quem tem acesso: "Qualquer pessoa"
 * 8. Copie a URL gerada e cole em CONFIG.APPS_SCRIPT_URL no arquivo app.js
 */

const SPREADSHEET_ID = "1YqfGN18QDR1xENf2auQCFEd_y6sHefw7dudYd3rt7nI";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheet;
    const row = data.row;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Aba não encontrada: " + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Dados salvos com sucesso" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Planner do Líder API ativa" }))
    .setMimeType(ContentService.MimeType.JSON);
}
