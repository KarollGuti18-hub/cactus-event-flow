/**
 * Google Apps Script — Google Sheets + trigger de aprobación
 *
 * SETUP:
 * 1. Sheet con pestaña "Registros"
 * 2. Extensiones → Apps Script → pegar este código
 * 3. Configurar SECRET y WEBHOOK_URL
 * 4. Implementar → Aplicación web (Ejecutar como: Yo, Acceso: Cualquiera)
 * 5. Copiar URL /exec → GOOGLE_APPS_SCRIPT_URL en Vercel
 * 6. Triggers → onEdit (Al editar)
 */

const CONFIG = {
  SHEET_NAME: "Registros",
  SECRET: "tu-secreto-compartido",
  WEBHOOK_URL: "https://www.c4c7ops.co/api/webhooks/sheets-approval",
  HEADERS: [
    "id", "email", "nombre", "apellido", "empresa", "cargo",
    "telefono", "interes", "estado", "registrado_at", "aprobado_at",
    "qr_token", "asistio", "check_in_at",
  ],
};

const COL = {
  ID: 1, EMAIL: 2, FIRST_NAME: 3, LAST_NAME: 4, COMPANY: 5,
  JOB_TITLE: 6, PHONE: 7, INTEREST: 8, STATUS: 9, REGISTERED_AT: 10,
  APPROVED_AT: 11, QR_TOKEN: 12, ATTENDED: 13, CHECKED_IN_AT: 14,
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.secret !== CONFIG.SECRET) {
      return jsonResponse({ success: false, error: "No autorizado" });
    }

    const data = payload.data || {};

    switch (payload.action) {
      case "appendRegistration":
        appendRegistration(data);
        return jsonResponse({ success: true });
      case "findByEmail":
        return jsonResponse({ success: true, attendee: findByEmail(data.email) });
      case "findByToken":
        return jsonResponse({ success: true, attendee: findByToken(data.token) });
      case "updateRow":
        updateRow(data.rowNumber, data.updates || {});
        return jsonResponse({ success: true });
      case "listNeedingProcessing":
        return jsonResponse({ success: true, attendees: listNeedingProcessing() });
      default:
        return jsonResponse({ success: false, error: "Acción no válida" });
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error && error.message ? error.message : "Error interno",
    });
  }
}

function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  if (e.range.getColumn() !== COL.STATUS) return;
  if (e.range.getRow() === 1) return;

  const estado = String(e.value || "").trim().toLowerCase();
  if (estado !== "aprobado" && estado !== "rechazado") return;

  const email = String(sheet.getRange(e.range.getRow(), COL.EMAIL).getValue() || "")
    .trim().toLowerCase();
  if (!email) return;

  const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ secret: CONFIG.SECRET, email: email, estado: estado }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Webhook falló (" + statusCode + "): " + response.getContentText().slice(0, 200));
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
  if (!headerRange.getValues()[0][0]) {
    headerRange.setValues([CONFIG.HEADERS]);
  }
}

function parseStatus(value) {
  const n = String(value || "").trim().toLowerCase();
  if (n === "aprobado" || n === "approved") return "aprobado";
  if (n === "rechazado" || n === "rejected") return "rechazado";
  return "pendiente";
}

function rowToAttendee(rowNumber, values) {
  if (!values || !values[COL.EMAIL - 1]) return null;
  return {
    rowNumber: rowNumber,
    id: String(values[COL.ID - 1] || ""),
    email: String(values[COL.EMAIL - 1] || "").toLowerCase(),
    firstName: String(values[COL.FIRST_NAME - 1] || ""),
    lastName: String(values[COL.LAST_NAME - 1] || ""),
    company: String(values[COL.COMPANY - 1] || ""),
    jobTitle: String(values[COL.JOB_TITLE - 1] || ""),
    phone: String(values[COL.PHONE - 1] || ""),
    interest: String(values[COL.INTEREST - 1] || ""),
    status: parseStatus(values[COL.STATUS - 1]),
    registeredAt: String(values[COL.REGISTERED_AT - 1] || ""),
    approvedAt: String(values[COL.APPROVED_AT - 1] || ""),
    qrToken: String(values[COL.QR_TOKEN - 1] || ""),
    attended: String(values[COL.ATTENDED - 1] || ""),
    checkedInAt: String(values[COL.CHECKED_IN_AT - 1] || ""),
  };
}

function getAllAttendees(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow, CONFIG.HEADERS.length).getValues();
  const attendees = [];
  for (var i = 0; i < values.length; i++) {
    var attendee = rowToAttendee(i + 2, values[i]);
    if (attendee) attendees.push(attendee);
  }
  return attendees;
}

function appendRegistration(data) {
  getSheet().appendRow([
    data.registrationId,
    String(data.email || "").toLowerCase(),
    data.firstName || "", data.lastName || "",
    data.company || "", data.jobTitle || "",
    data.phone || "", data.interest || "",
    "pendiente", new Date().toISOString(),
    "", "", "", "",
  ]);
}

function findByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  var attendees = getAllAttendees(getSheet());
  for (var i = 0; i < attendees.length; i++) {
    if (attendees[i].email === normalized) return attendees[i];
  }
  return null;
}

function findByToken(token) {
  const normalized = String(token || "").trim();
  var attendees = getAllAttendees(getSheet());
  for (var i = 0; i < attendees.length; i++) {
    if (attendees[i].qrToken === normalized) return attendees[i];
  }
  return null;
}

function updateRow(rowNumber, updates) {
  const sheet = getSheet();
  const range = sheet.getRange(rowNumber, 1, 1, CONFIG.HEADERS.length);
  const values = range.getValues()[0];
  if (!values.length) throw new Error("Fila " + rowNumber + " no encontrada");
  if (updates.status !== undefined) values[COL.STATUS - 1] = updates.status;
  if (updates.approvedAt !== undefined) values[COL.APPROVED_AT - 1] = updates.approvedAt;
  if (updates.qrToken !== undefined) values[COL.QR_TOKEN - 1] = updates.qrToken;
  if (updates.attended !== undefined) values[COL.ATTENDED - 1] = updates.attended;
  if (updates.checkedInAt !== undefined) values[COL.CHECKED_IN_AT - 1] = updates.checkedInAt;
  range.setValues([values]);
}

function listNeedingProcessing() {
  var attendees = getAllAttendees(getSheet());
  var pending = [];
  for (var i = 0; i < attendees.length; i++) {
    var a = attendees[i];
    if (a.status === "aprobado" && !a.qrToken) pending.push(a);
    else if (a.status === "rechazado" && !a.approvedAt) pending.push(a);
  }
  return pending;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
