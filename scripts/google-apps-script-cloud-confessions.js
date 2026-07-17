/**
 * Google Apps Script — Cloud Confession Breakfast
 *
 * SETUP:
 * 1. Crear el archivo "Registros - Cloud Confession Breakfast".
 * 2. Extensiones → Apps Script → pegar este archivo.
 * 3. Reemplazar SECRET y WEBHOOK_URL.
 * 4. Autorizar el script con la cuenta organizadora: kasogumo2006@gmail.com
 * 5. Implementar como aplicación web (Ejecutar como: Yo, Acceso: Cualquiera).
 * 6. Copiar la URL /exec a CLOUD_CONFESSIONS_GOOGLE_APPS_SCRIPT_URL.
 * 7. Crear un activador instalable para onEdit (Al editar).
 * 8. Ejecutar una vez ensureCalendarEvent() para crear el evento maestro.
 *
 * Al aprobar: genera QR vía webhook e invita al calendario de Google.
 * Al rechazar: actualiza Brevo/Sheets y retira la invitación del calendario.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

const CONFIG = {
  SHEET_NAME: "Registros",
  SECRET: "reemplazar-con-secreto-seguro",
  WEBHOOK_URL:
    "https://www.c4c7ops.co/api/cloud-confessions/webhooks/sheets-approval",
  ORGANIZER_EMAIL: "kasogumo2006@gmail.com",
  EVENT_TITLE: "Cloud Confession Breakfast",
  EVENT_LOCATION: "Brumo Bistro · a pocos pasos del Ágora",
  EVENT_DESCRIPTION:
    "Desayuno privado de C4C7OPS antes del AWS Summit Bogotá. Buena comida, conversaciones reales y networking en un ambiente relajado. Ubicación: Brumo Bistro, a pocos pasos del Ágora.",
  EVENT_START: new Date("2026-07-30T07:00:00-05:00"),
  EVENT_END: new Date("2026-07-30T09:00:00-05:00"),
  EVENT_PROPERTY_KEY: "CLOUD_CONFESSIONS_CALENDAR_EVENT_ID",
  HEADERS: [
    "id",
    "email",
    "nombre",
    "apellido",
    "empresa",
    "cargo",
    "telefono",
    "consentimiento",
    "origen",
    "estado",
    "registrado_at",
    "aprobado_at",
    "qr_token",
    "asistio",
    "checkin_at",
    "calendar_invited_at",
    "actualizado_at",
  ],
};

const COL = {
  ID: 1,
  EMAIL: 2,
  FIRST_NAME: 3,
  LAST_NAME: 4,
  COMPANY: 5,
  JOB_TITLE: 6,
  PHONE: 7,
  CONSENT: 8,
  ORIGIN: 9,
  STATUS: 10,
  REGISTERED_AT: 11,
  APPROVED_AT: 12,
  QR_TOKEN: 13,
  ATTENDED: 14,
  CHECKED_IN_AT: 15,
  CALENDAR_INVITED_AT: 16,
  UPDATED_AT: 17,
};

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.secret !== CONFIG.SECRET) {
      return jsonResponse({ success: false, error: "No autorizado" });
    }

    const data = payload.data || {};

    switch (payload.action) {
      case "upsertRegistration":
        return jsonResponse({
          success: true,
          attendee: upsertRegistration(data),
        });
      case "findByEmail":
        return jsonResponse({
          success: true,
          attendee: findByEmail(data.email),
        });
      case "findByToken":
        return jsonResponse({
          success: true,
          attendee: findByToken(data.token),
        });
      case "updateRow":
        updateRow(data.rowNumber, data.updates || {});
        return jsonResponse({ success: true });
      case "listNeedingProcessing":
        return jsonResponse({
          success: true,
          attendees: listNeedingProcessing(),
        });
      case "ensureCalendarEvent":
        return jsonResponse({
          success: true,
          eventId: ensureCalendarEvent().getId(),
        });
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
  if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  if (e.range.getColumn() !== COL.STATUS || e.range.getRow() === 1) return;

  const rowNumber = e.range.getRow();
  const status = parseStatus(e.value);
  if (status !== "aprobado" && status !== "rechazado") return;

  const email = normalizeEmail(
    sheet.getRange(rowNumber, COL.EMAIL).getValue(),
  );
  if (!email) return;

  const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      secret: CONFIG.SECRET,
      email: email,
      estado: status,
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "El webhook de Cloud Confession falló con estado " + statusCode,
    );
  }

  const now = new Date().toISOString();

  if (status === "aprobado") {
    inviteGuestToCalendar(email);
    sheet.getRange(rowNumber, COL.CALENDAR_INVITED_AT).setValue(now);
  } else {
    removeGuestFromCalendar(email);
    sheet.getRange(rowNumber, COL.CALENDAR_INVITED_AT).setValue("");
  }

  sheet.getRange(rowNumber, COL.UPDATED_AT).setValue(now);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }

  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const needed = CONFIG.HEADERS.length;
  const range = sheet.getRange(1, 1, 1, needed);
  const current = range.getValues()[0].map(function (value) {
    return String(value || "").trim();
  });
  const isEmpty = current.every(function (value) {
    return value === "";
  });

  if (isEmpty) {
    range.setValues([CONFIG.HEADERS]);
    return;
  }

  // Migración desde el layout anterior (sin calendar_invited_at).
  // Antes: ... checkin_at | actualizado_at
  // Ahora: ... checkin_at | calendar_invited_at | actualizado_at
  if (
    current[COL.CHECKED_IN_AT - 1] === "checkin_at" &&
    current[COL.CALENDAR_INVITED_AT - 1] === "actualizado_at" &&
    !current[COL.UPDATED_AT - 1]
  ) {
    sheet.insertColumnBefore(COL.CALENDAR_INVITED_AT);
    sheet.getRange(1, COL.CALENDAR_INVITED_AT).setValue("calendar_invited_at");
    sheet.getRange(1, COL.UPDATED_AT).setValue("actualizado_at");
    return;
  }

  // Si calendar_invited_at quedó al final por error, lo reordenamos.
  if (
    current[COL.CHECKED_IN_AT - 1] === "checkin_at" &&
    current[COL.CALENDAR_INVITED_AT - 1] === "actualizado_at" &&
    current[COL.UPDATED_AT - 1] === "calendar_invited_at"
  ) {
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const updatedAtValues = sheet
      .getRange(1, COL.CALENDAR_INVITED_AT, lastRow, 1)
      .getValues();
    const calendarValues = sheet
      .getRange(1, COL.UPDATED_AT, lastRow, 1)
      .getValues();

    sheet.getRange(1, COL.CALENDAR_INVITED_AT, lastRow, 1).setValues(calendarValues);
    sheet.getRange(1, COL.UPDATED_AT, lastRow, 1).setValues(updatedAtValues);
    sheet.getRange(1, COL.CALENDAR_INVITED_AT).setValue("calendar_invited_at");
    sheet.getRange(1, COL.UPDATED_AT).setValue("actualizado_at");
    return;
  }

  for (let index = 0; index < needed; index += 1) {
    const expected = CONFIG.HEADERS[index];
    const actual = current[index] || "";

    if (!actual) {
      sheet.getRange(1, index + 1).setValue(expected);
      continue;
    }

    if (actual !== expected) {
      throw new Error(
        "Las columnas de la pestaña Registros no coinciden. Esperado '" +
          expected +
          "' en columna " +
          (index + 1) +
          ", encontrado '" +
          actual +
          "'. Orden correcto: " +
          CONFIG.HEADERS.join(", "),
      );
    }
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function safeText(value) {
  const text = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function parseStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "aprobado" || normalized === "approved") {
    return "aprobado";
  }

  if (normalized === "rechazado" || normalized === "rejected") {
    return "rechazado";
  }

  return "pendiente_aprobacion";
}

function parseConsent(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function rowToAttendee(rowNumber, values) {
  if (!values || !values[COL.EMAIL - 1]) return null;

  return {
    rowNumber: rowNumber,
    id: String(values[COL.ID - 1] || ""),
    email: normalizeEmail(values[COL.EMAIL - 1]),
    firstName: String(values[COL.FIRST_NAME - 1] || ""),
    lastName: String(values[COL.LAST_NAME - 1] || ""),
    company: String(values[COL.COMPANY - 1] || ""),
    jobTitle: String(values[COL.JOB_TITLE - 1] || ""),
    telefono: String(values[COL.PHONE - 1] || ""),
    consent: parseConsent(values[COL.CONSENT - 1]),
    origin:
      String(values[COL.ORIGIN - 1] || "") === "invitation_link"
        ? "invitation_link"
        : "landing",
    status: parseStatus(values[COL.STATUS - 1]),
    registeredAt: String(values[COL.REGISTERED_AT - 1] || ""),
    approvedAt: String(values[COL.APPROVED_AT - 1] || ""),
    qrToken: String(values[COL.QR_TOKEN - 1] || ""),
    attended: String(values[COL.ATTENDED - 1] || ""),
    checkedInAt: String(values[COL.CHECKED_IN_AT - 1] || ""),
    calendarInvitedAt: String(values[COL.CALENDAR_INVITED_AT - 1] || ""),
    updatedAt: String(values[COL.UPDATED_AT - 1] || ""),
  };
}

function getAllAttendees(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet
    .getRange(2, 1, lastRow, CONFIG.HEADERS.length)
    .getValues();

  return values
    .map(function (row, index) {
      return rowToAttendee(index + 2, row);
    })
    .filter(function (attendee) {
      return attendee !== null;
    });
}

function findByEmailInSheet(sheet, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const attendees = getAllAttendees(sheet);
  for (let index = 0; index < attendees.length; index += 1) {
    if (attendees[index].email === normalized) {
      return attendees[index];
    }
  }

  return null;
}

function upsertRegistration(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    const email = normalizeEmail(data.email);
    if (!email) throw new Error("El correo es requerido");

    const existing = findByEmailInSheet(sheet, email);
    const now = new Date().toISOString();
    const isReopeningRejected = existing && existing.status === "rechazado";
    const id = existing && existing.id
      ? existing.id
      : safeText(data.registrationId);
    const registeredAt = existing && existing.registeredAt && !isReopeningRejected
      ? existing.registeredAt
      : String(data.registeredAt || now);
    const status = existing && !isReopeningRejected
      ? existing.status
      : "pendiente_aprobacion";

    const values = [
      id,
      email,
      safeText(data.firstName),
      safeText(data.lastName),
      safeText(data.company),
      safeText(data.jobTitle),
      safeText(data.telefono),
      data.consent === true,
      data.origin === "invitation_link" ? "invitation_link" : "landing",
      status,
      registeredAt,
      isReopeningRejected ? "" : existing ? existing.approvedAt : "",
      isReopeningRejected ? "" : existing ? existing.qrToken : "",
      isReopeningRejected ? "" : existing ? existing.attended : "",
      isReopeningRejected ? "" : existing ? existing.checkedInAt : "",
      isReopeningRejected ? "" : existing ? existing.calendarInvitedAt : "",
      now,
    ];

    let rowNumber;
    if (existing) {
      rowNumber = existing.rowNumber;
      sheet
        .getRange(rowNumber, 1, 1, CONFIG.HEADERS.length)
        .setValues([values]);
    } else {
      sheet.appendRow(values);
      rowNumber = sheet.getLastRow();
    }

    return rowToAttendee(rowNumber, values);
  } finally {
    lock.releaseLock();
  }
}

function findByEmail(email) {
  return findByEmailInSheet(getSheet(), email);
}

function findByToken(token) {
  const normalized = String(token || "").trim();
  if (!normalized) return null;

  const attendees = getAllAttendees(getSheet());
  for (let index = 0; index < attendees.length; index += 1) {
    if (attendees[index].qrToken === normalized) {
      return attendees[index];
    }
  }

  return null;
}

function updateRow(rowNumber, updates) {
  const sheet = getSheet();
  const numericRow = Number(rowNumber);

  if (!Number.isInteger(numericRow) || numericRow < 2 || numericRow > sheet.getLastRow()) {
    throw new Error("Fila no válida");
  }

  const range = sheet.getRange(
    numericRow,
    1,
    1,
    CONFIG.HEADERS.length,
  );
  const values = range.getValues()[0];

  if (updates.status !== undefined) {
    values[COL.STATUS - 1] = parseStatus(updates.status);
  }
  if (updates.approvedAt !== undefined) {
    values[COL.APPROVED_AT - 1] = String(updates.approvedAt || "");
  }
  if (updates.qrToken !== undefined) {
    values[COL.QR_TOKEN - 1] = safeText(updates.qrToken);
  }
  if (updates.attended !== undefined) {
    values[COL.ATTENDED - 1] = safeText(updates.attended);
  }
  if (updates.checkedInAt !== undefined) {
    values[COL.CHECKED_IN_AT - 1] = String(updates.checkedInAt || "");
  }
  if (updates.calendarInvitedAt !== undefined) {
    values[COL.CALENDAR_INVITED_AT - 1] = String(updates.calendarInvitedAt || "");
  }
  if (updates.updatedAt !== undefined) {
    values[COL.UPDATED_AT - 1] = String(updates.updatedAt || "");
  }

  range.setValues([values]);
}

function listNeedingProcessing() {
  return getAllAttendees(getSheet()).filter(function (attendee) {
    return attendee.status === "aprobado" && !attendee.qrToken;
  });
}

function getOrganizerCalendar() {
  // El script debe autorizarse con kasogumo2006@gmail.com.
  // Usamos el calendario principal de esa cuenta.
  return CalendarApp.getDefaultCalendar();
}

function ensureCalendarEvent() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty(CONFIG.EVENT_PROPERTY_KEY);
  const calendar = getOrganizerCalendar();

  if (existingId) {
    try {
      const existing = calendar.getEventById(existingId);
      if (existing) {
        existing.setTitle(CONFIG.EVENT_TITLE);
        existing.setLocation(CONFIG.EVENT_LOCATION);
        existing.setDescription(CONFIG.EVENT_DESCRIPTION);
        existing.setTime(CONFIG.EVENT_START, CONFIG.EVENT_END);
        existing.setGuestsCanSeeGuests(false);
        existing.setGuestsCanInviteOthers(false);
        existing.setGuestsCanModify(false);
        return existing;
      }
    } catch (error) {
      // El evento guardado ya no existe; se crea uno nuevo.
    }
  }

  const event = calendar.createEvent(
    CONFIG.EVENT_TITLE,
    CONFIG.EVENT_START,
    CONFIG.EVENT_END,
    {
      location: CONFIG.EVENT_LOCATION,
      description: CONFIG.EVENT_DESCRIPTION,
      sendInvites: false,
    },
  );

  event.setGuestsCanSeeGuests(false);
  event.setGuestsCanInviteOthers(false);
  event.setGuestsCanModify(false);
  properties.setProperty(CONFIG.EVENT_PROPERTY_KEY, event.getId());
  return event;
}

function inviteGuestToCalendar(email) {
  const event = ensureCalendarEvent();
  const guests = event.getGuestList(true);
  const alreadyInvited = guests.some(function (guest) {
    return normalizeEmail(guest.getEmail()) === normalizeEmail(email);
  });

  if (alreadyInvited) return;

  event.addGuest(email);
}

function removeGuestFromCalendar(email) {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty(CONFIG.EVENT_PROPERTY_KEY);
  if (!existingId) return;

  const calendar = getOrganizerCalendar();
  let event;

  try {
    event = calendar.getEventById(existingId);
  } catch (error) {
    return;
  }

  if (!event) return;

  const guests = event.getGuestList(true);
  const match = guests.find(function (guest) {
    return normalizeEmail(guest.getEmail()) === normalizeEmail(email);
  });

  if (!match) return;
  event.removeGuest(email);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
