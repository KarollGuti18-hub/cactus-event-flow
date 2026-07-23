/**
 * Google Apps Script — Cloud & Coffee
 *
 * SETUP:
 * 1. Crear el archivo "Registros - Cloud & Coffee".
 * 2. Extensiones → Apps Script → pegar este archivo.
 * 3. SECRET debe coincidir con CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET (o menú → Configurar secreto).
 * 4. Autorizar el script con ext-s@c4c7us.com (cuenta del Calendar).
 * 5. Implementar como aplicación web (Ejecutar como: Yo, Acceso: Cualquiera).
 * 6. Copiar la URL /exec a CLOUD_CONFESSIONS_GOOGLE_APPS_SCRIPT_URL.
 * 7. Ejecutar una vez instalarActivadorOnEdit() (menú Cloud & Coffee o desde el editor).
 * 8. Ejecutar una vez ensureCalendarEvent() para crear el evento maestro.
 * 9. Ejecutar una vez ensureInvitesAndJobsSheets() para crear hojas Invitados + ColaEmails.
 *    Al aprobar, se envía un correo con archivo .ics (no hace falta Calendar API avanzada).
 *
 * Hoja "Invitados" (columnas):
 *   Nombre | Apellido | Correo | Estado | Empresa | Cargo | Invitado el | Actualizado
 * Pega la lista (Nombre, Apellido, Correo). NO se envía al pegar.
 * Para enviar: marca ▶ Correr (I1) o menú → Correr (lotes de 20).
 * Si hay más de 20, el resto sale solo cada 20 min. Si falla: columna Error (J).
 * Estado se actualiza solo: pendiente → invitado → visitó → incompleto → registrado → aprobado/rechazado.
 *
 * Hoja "ColaEmails": cola de correos diferidos (cron externo / Vercel).
 *
 * Hoja "Registros": al editar estado a "aprobado"/"rechazado" → QR + Calendar.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

const CONFIG = {
  SHEET_NAME: "Registros",
  INVITES_SHEET_NAME: "Invitados",
  JOBS_SHEET_NAME: "ColaEmails",
  SECRET: "reemplazar-con-secreto-seguro",
  WEBHOOK_URL:
    "https://www.c4c7ops.co/api/cloud-and-coffee/webhooks/sheets-approval",
  INVITE_WEBHOOK_URL:
    "https://www.c4c7ops.co/api/cloud-and-coffee/webhooks/sheets-invite",
  RESET_TEST_WEBHOOK_URL:
    "https://www.c4c7ops.co/api/cloud-and-coffee/webhooks/sheets-reset-test",
  ORGANIZER_EMAIL: "ext-s@c4c7us.com",
  EVENT_TITLE: "Cloud & Coffee",
  EVENT_LOCATION: "Antes, un café · Cl. 24d #40-34, Bogotá",
  EVENT_DESCRIPTION:
    "Cloud & Coffee · Coffee · Conversations · Cloud · Hosted by C4c7Ops. Tómate un café con C4c7Ops, desayuna y llega con toda la energía al AWS Summit Bogotá. Jueves 30 de julio, de 7:00 a. m. a 9:00 a. m. Ubicación: Antes, un café · Cl. 24d #40-34, Bogotá (cerca al Ágora).",
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
  INVITE_HEADERS: [
    "Nombre",
    "Apellido",
    "Correo",
    "Estado",
    "Empresa",
    "Cargo",
    "Invitado el",
    "Actualizado",
  ],
  /** Valores de Estado en Invitados (dropdown + sync del funnel). */
  INVITE_STATUS_VALUES: [
    "pendiente",
    "invitado",
    "visitó",
    "incompleto",
    "registrado",
    "aprobado",
    "rechazado",
    "error",
  ],
  JOB_HEADERS: [
    "id",
    "email",
    "job_type",
    "run_at",
    "status",
    "payload",
    "created_at",
    "processed_at",
    "error",
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

    if (String(payload.secret || "").trim() !== getWebhookSecret_()) {
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
      case "enqueueEmailJob":
        return jsonResponse({
          success: true,
          job: enqueueEmailJob(data),
        });
      case "listDueEmailJobs":
        return jsonResponse({
          success: true,
          jobs: listDueEmailJobs(data.now),
        });
      case "completeEmailJob":
        completeEmailJob(data);
        return jsonResponse({ success: true });
      case "cancelEmailJobs":
        cancelEmailJobs(data.email, data.jobTypes || []);
        return jsonResponse({ success: true });
      case "upsertInvitee":
        upsertInvitee(data);
        return jsonResponse({ success: true });
      case "markInviteeInvited":
        markInviteeInvited(data.email, data.invitedAt);
        return jsonResponse({ success: true });
      case "updateInviteeStatus":
        updateInviteeStatus(data.email, data.status);
        return jsonResponse({ success: true });
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
  const sheetName = sheet.getName();

  // Invitados: solo la casilla Correr dispara envíos (no al pegar correos).
  if (sheetName === CONFIG.INVITES_SHEET_NAME) {
    if (
      e.range.getRow() === INVITE_RUN.ROW &&
      e.range.getColumn() === INVITE_RUN.CHECK_COL &&
      e.range.getNumRows() === 1 &&
      e.range.getNumColumns() === 1
    ) {
      const checked =
        e.value === true ||
        String(e.value || "").toUpperCase() === "TRUE";
      if (!checked) return;
      sheet.getRange(INVITE_RUN.ROW, INVITE_RUN.CHECK_COL).setValue(false);
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Correr activado…",
        "Cloud & Coffee",
        3,
      );
      try {
        correrInvitaciones(true);
      } catch (error) {
        const msg =
          error && error.message ? error.message : "Error al correr invitaciones";
        SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Cloud & Coffee", 10);
        SpreadsheetApp.getUi().alert("Error al correr:\n\n" + msg);
      }
    }
    return;
  }

  if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  if (sheetName !== CONFIG.SHEET_NAME) return;
  const rowNumber = e.range.getRow();
  if (rowNumber === 1) return;
  if (e.range.getColumn() !== COL.STATUS) return;

  const status = parseStatus(e.value);
  if (status !== "aprobado" && status !== "rechazado") return;

  processStatusChange_(rowNumber, status);
}

function processStatusChange_(rowNumber, status) {
  const sheet = getSheet();
  const email = normalizeEmail(
    sheet.getRange(rowNumber, COL.EMAIL).getValue(),
  );
  if (!email) {
    throw new Error("La fila no tiene email.");
  }

  const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      secret: getWebhookSecret_(),
      email: email,
      estado: status,
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "El webhook de Cloud & Coffee falló con estado " +
        statusCode +
        (body ? " · " + body : "") +
        ". Revisa SECRET y WEBHOOK_URL en el script, y las env de Vercel.",
    );
  }

  const now = new Date().toISOString();

  if (status === "aprobado") {
    try {
      inviteGuestToCalendar(email);
      sheet.getRange(rowNumber, COL.CALENDAR_INVITED_AT).setValue(now);
    } catch (error) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Aprobado en web, pero el .ics falló: " +
          (error && error.message ? error.message : "error") +
          ". Usa menú → Reenviar Calendar.",
        "Cloud & Coffee",
        12,
      );
    }
  } else {
    removeGuestFromCalendar(email);
    sheet.getRange(rowNumber, COL.CALENDAR_INVITED_AT).setValue("");
  }

  sheet.getRange(rowNumber, COL.UPDATED_AT).setValue(now);
}

/**
 * Menú: el activador onEdit es lo principal.
 * Ejecuta una vez "Instalar activador onEdit" para que al poner "aprobado" corra solo.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Cloud & Coffee")
    .addItem("1. Instalar activador", "instalarActivadorOnEdit")
    .addItem("2. Crear hojas Invitados + Cola", "ensureInvitesAndJobsSheets")
    .addItem("3. Configurar secreto webhook", "configurarSecretoWebhook")
    .addItem("▶ Correr invitaciones (lotes de 20)", "correrInvitacionesDesdeMenu")
    .addItem("Cancelar lotes automáticos", "cancelarLotesInvitados")
    .addItem("Probar invite (fila activa)", "probarInviteFilaActiva")
    .addItem("Reenviar Calendar (.ics)", "reenviarInvitacionCalendar")
    .addItem("Reparar encabezados Registros", "repararEncabezadosRegistros")
    .addItem("Resetear contacto de prueba", "resetearContactoPrueba")
    .addToUi();
}

/** Wrapper de menú: siempre muestra feedback. */
function correrInvitacionesDesdeMenu() {
  correrInvitaciones(false);
}

/**
 * Crea el activador instalable (obligatorio para UrlFetchApp + Calendar).
 * Ejecutar UNA vez desde el menú o desde el editor (función instalarActivadorOnEdit).
 */
function instalarActivadorOnEdit() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const triggers = ScriptApp.getProjectTriggers();

  for (let i = 0; i < triggers.length; i += 1) {
    const trigger = triggers[i];
    if (
      trigger.getHandlerFunction() === "onEdit" &&
      trigger.getEventType() === ScriptApp.EventType.ON_EDIT
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(spreadsheetId)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    "Activador listo. A partir de ahora, al escribir \"aprobado\" o \"rechazado\" en la columna estado, se procesa solo.",
  );
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

  let needsRewrite = false;
  for (let index = 0; index < needed; index += 1) {
    const expected = CONFIG.HEADERS[index];
    const actual = current[index] || "";

    if (!actual) {
      sheet.getRange(1, index + 1).setValue(expected);
      continue;
    }

    if (actual !== expected) {
      // Encabezado corrupto (p. ej. pegaron una fecha en la fila 1).
      needsRewrite = true;
      break;
    }
  }

  if (needsRewrite) {
    range.setValues([CONFIG.HEADERS]);
  }
}

/** Menú: repara la fila de encabezados de Registros si se dañó. */
function repararEncabezadosRegistros() {
  const sheet = getSheet();
  sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  SpreadsheetApp.getUi().alert(
    "Encabezados de Registros reparados.\nVuelve a enviar el formulario o usa Procesar si hace falta.",
  );
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
  // Debe autorizarse el Apps Script con ext-s@c4c7us.com.
  // Preferimos el calendario de esa cuenta; si no, el default de quien autorizó.
  try {
    const byId = CalendarApp.getCalendarById(CONFIG.ORGANIZER_EMAIL);
    if (byId) return byId;
  } catch (error) {
    // Continúa con el calendario por defecto.
  }
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

/**
 * Envía invitación de calendario por correo (.ics).
 * Eso es lo que le llega a la persona. Meterlo al Calendar de Google es opcional.
 */
function inviteGuestToCalendar(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("Correo vacío para Calendar");
  }

  try {
    const event = ensureCalendarEvent();
    const guests = event.getGuestList(true);
    const alreadyInvited = guests.some(function (guest) {
      return normalizeEmail(guest.getEmail()) === normalized;
    });
    if (!alreadyInvited) {
      event.addGuest(normalized);
    }
  } catch (error) {
    // No bloquea el .ics
  }

  sendCalendarIcsInvite_(normalized);
}

function icsEscape_(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDateUtc_(date) {
  return Utilities.formatDate(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function sendCalendarIcsInvite_(email) {
  const start = CONFIG.EVENT_START;
  const end = CONFIG.EVENT_END;
  const stamp = formatIcsDateUtc_(new Date());
  const uid =
    "cloud-coffee-" +
    Utilities.base64EncodeWebSafe(normalizeEmail(email)).replace(/=+$/g, "") +
    "@c4c7ops.co";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//C4c7Ops//Cloud and Coffee//ES",
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + uid,
    "DTSTAMP:" + stamp,
    "DTSTART:" + formatIcsDateUtc_(start),
    "DTEND:" + formatIcsDateUtc_(end),
    "SUMMARY:" + icsEscape_(CONFIG.EVENT_TITLE),
    "DESCRIPTION:" + icsEscape_(CONFIG.EVENT_DESCRIPTION),
    "LOCATION:" + icsEscape_(CONFIG.EVENT_LOCATION),
    "ORGANIZER;CN=C4c7Ops:mailto:" + CONFIG.ORGANIZER_EMAIL,
    "ATTENDEE;RSVP=TRUE;CN=" + email + ":mailto:" + email,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = Utilities.newBlob(ics, "text/calendar", "cloud-and-coffee.ics");
  const locationHtml = String(CONFIG.EVENT_LOCATION || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  MailApp.sendEmail({
    to: email,
    name: "C4c7Ops",
    subject: "Invitación: Cloud & Coffee · jueves 30 de julio",
    htmlBody:
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.6;">' +
      "<p>Hola,</p>" +
      "<p>Te confirmamos tu lugar en <strong>Cloud &amp; Coffee</strong>.</p>" +
      "<p><strong>Fecha:</strong> jueves 30 de julio de 2026<br>" +
      "<strong>Horario:</strong> 7:00 a. m. – 9:00 a. m.<br>" +
      "<strong>Lugar:</strong> " +
      locationHtml +
      "</p>" +
      "<p>Abre el archivo adjunto <strong>cloud-and-coffee.ics</strong> para agregarlo a tu calendario.</p>" +
      "<p style=\"color:#666;font-size:13px;\">Hosted by C4c7Ops</p>" +
      "</div>",
    body:
      "Te confirmamos tu lugar en Cloud & Coffee.\n\n" +
      "Fecha: jueves 30 de julio de 2026\n" +
      "Horario: 7:00 a. m. – 9:00 a. m.\n" +
      "Lugar: " +
      CONFIG.EVENT_LOCATION +
      "\n\n" +
      "Abre el archivo .ics adjunto para agregarlo a tu calendario.\n",
    attachments: [blob],
  });
}

function removeGuestFromCalendar(email) {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty(CONFIG.EVENT_PROPERTY_KEY);
  if (!existingId) return;

  try {
    const event = getOrganizerCalendar().getEventById(existingId);
    if (!event) return;
    const match = event.getGuestList(true).find(function (guest) {
      return normalizeEmail(guest.getEmail()) === normalizeEmail(email);
    });
    if (match) event.removeGuest(email);
  } catch (error) {
    // Silencioso
  }
}

/** Reenvía el .ics al correo de la fila activa en Registros. */
function reenviarInvitacionCalendar() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let email = "";

  if (sheet.getName() === CONFIG.SHEET_NAME) {
    const row = sheet.getActiveRange().getRow();
    if (row > 1) {
      email = normalizeEmail(sheet.getRange(row, COL.EMAIL).getValue());
    }
  }

  if (!email) {
    const prompt = ui.prompt(
      "Reenviar Calendar",
      "Correo del aprobado:",
      ui.ButtonSet.OK_CANCEL,
    );
    if (prompt.getSelectedButton() !== ui.Button.OK) return;
    email = normalizeEmail(prompt.getResponseText());
  }

  if (!email) {
    ui.alert("Correo no válido.");
    return;
  }

  try {
    inviteGuestToCalendar(email);
    const attendee = findByEmailInSheet(getSheet(), email);
    if (attendee && attendee.rowNumber) {
      getSheet()
        .getRange(attendee.rowNumber, COL.CALENDAR_INVITED_AT)
        .setValue(new Date().toISOString());
    }
    ui.alert("Listo. Se envió el .ics de Calendar a:\n" + email);
  } catch (error) {
    ui.alert(
      "No se pudo enviar: " +
        (error && error.message ? error.message : "error desconocido"),
    );
  }
}


/** Secreto efectivo: Script Properties gana sobre CONFIG (así no se pierde al pegar código). */
function getWebhookSecret_() {
  const fromProps = PropertiesService.getScriptProperties().getProperty(
    "CLOUD_CONFESSIONS_SECRET",
  );
  if (fromProps && String(fromProps).trim()) {
    return String(fromProps).trim();
  }
  return String(CONFIG.SECRET || "").trim();
}

function configurarSecretoWebhook() {
  const ui = SpreadsheetApp.getUi();
  const current = getWebhookSecret_();
  const result = ui.prompt(
    "Secreto webhook Cloud & Coffee",
    "Pega el mismo valor que CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET en Vercel.\nActual (primeros 8): " +
      (current ? current.slice(0, 8) + "…" : "(vacío)"),
    ui.ButtonSet.OK_CANCEL,
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;
  const value = String(result.getResponseText() || "").trim();
  if (!value) {
    ui.alert("No se guardó: el secreto quedó vacío.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty(
    "CLOUD_CONFESSIONS_SECRET",
    value,
  );
  ui.alert(
    "Secreto guardado en Properties del script.\nPuedes volver a pegar el código sin perderlo.",
  );
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

const INV = {
  FIRST_NAME: 1,
  LAST_NAME: 2,
  EMAIL: 3,
  STATUS: 4,
  COMPANY: 5,
  JOB_TITLE: 6,
  INVITED_AT: 7,
  UPDATED_AT: 8,
  ERROR: 10,
};

/** Casilla única ▶ Correr en I1. Columna J = Error. */
const INVITE_RUN = {
  CHECK_COL: 9,
  ROW: 1,
};

/** Lotes de invitaciones (protege reputación del remitente). */
const INVITE_BATCH = {
  SIZE: 20,
  DELAY_MINUTES: 20,
  TRIGGER_HANDLER: "correrSiguienteLoteInvitados",
};

/** Estados en los que ya no se reenvía la invitación automática. */
const INVITE_DONE_STATUSES = {
  invitado: true,
  "visitó": true,
  incompleto: true,
  registrado: true,
  aprobado: true,
  rechazado: true,
};

const JOB = {
  ID: 1,
  EMAIL: 2,
  TYPE: 3,
  RUN_AT: 4,
  STATUS: 5,
  PAYLOAD: 6,
  CREATED_AT: 7,
  PROCESSED_AT: 8,
  ERROR: 9,
};

function normalizeInviteStatus_(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!raw || raw === "pendiente") return "pendiente";
  if (raw === "invitado" || raw === "invited") return "invitado";
  if (raw === "visito" || raw === "visited" || raw === "visitado") return "visitó";
  if (raw === "incompleto" || raw === "incomplete") return "incompleto";
  if (
    raw === "registrado" ||
    raw === "registered" ||
    raw === "pendiente_aprobacion" ||
    raw === "pending_approval"
  ) {
    return "registrado";
  }
  if (raw === "aprobado" || raw === "approved") return "aprobado";
  if (raw === "rechazado" || raw === "rejected") return "rechazado";
  if (raw === "error" || raw === "failed") return "error";
  return String(value || "").trim() || "pendiente";
}

function ensureInvitesAndJobsSheets() {
  const invites = getInvitesSheet();
  getJobsSheet();
  formatInvitesSheet_(invites);
  SpreadsheetApp.getUi().alert(
    "Hojas listas: Invitados y ColaEmails.\n\n1. Pega Nombre | Apellido | Correo (Estado queda pendiente).\n2. Marca la casilla verde en I1 (▶ Correr) o menú → ▶ Correr invitaciones.\nSi falla: sale un popup y el detalle en columna Error (J).\n3. Solo entonces se envían los correos.",
  );
}

function formatInvitesSheet_(sheet) {
  const cols = CONFIG.INVITE_HEADERS.length;
  const header = sheet.getRange(1, 1, 1, cols);
  header.setFontWeight("bold");
  header.setBackground("#151518");
  header.setFontColor("#9ab83a");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(INV.FIRST_NAME, 140);
  sheet.setColumnWidth(INV.LAST_NAME, 140);
  sheet.setColumnWidth(INV.EMAIL, 240);
  sheet.setColumnWidth(INV.STATUS, 120);
  sheet.setColumnWidth(INV.COMPANY, 160);
  sheet.setColumnWidth(INV.JOB_TITLE, 140);
  sheet.setColumnWidth(INV.INVITED_AT, 180);
  sheet.setColumnWidth(INV.UPDATED_AT, 180);
  sheet.setColumnWidth(INV.ERROR, 360);

  // I1 = casilla ▶ Correr | J1 = encabezado Error
  const check = sheet.getRange(INVITE_RUN.ROW, INVITE_RUN.CHECK_COL);
  check.clearDataValidations();
  check.insertCheckboxes();
  check.setValue(false);
  check.setNote(
    "▶ CORRER: envía hasta 20 pendientes. Si quedan más, el siguiente lote sale solo en ~20 min. Menú → Cancelar lotes para detener.",
  );
  // Texto visible al lado en la fila de encabezado vía comentario + color fuerte
  check.setBackground("#9ab83a");
  sheet.setColumnWidth(INVITE_RUN.CHECK_COL, 56);
  sheet.getRange(1, INV.ERROR).setValue("Error");
  sheet.getRange(1, INV.ERROR).setFontWeight("bold");
  sheet.getRange(1, INV.ERROR).setBackground("#151518");
  sheet.getRange(1, INV.ERROR).setFontColor("#9ab83a");

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.INVITE_STATUS_VALUES, true)
    .setAllowInvalid(false)
    .setHelpText("Estado del invitado en el funnel Cloud & Coffee")
    .build();
  sheet.getRange(2, INV.STATUS, 1000, 1).setDataValidation(rule);
}

function migrateInvitesSheetIfNeeded_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), CONFIG.INVITE_HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) {
    return String(v || "").trim();
  });
  const h0 = headers[0].toLowerCase();
  const h2 = String(headers[2] || "").toLowerCase();

  // Ya está en el layout nuevo (añade Error si falta).
  if (headers[0] === "Nombre" && headers[2] === "Correo" && headers[3] === "Estado") {
    sheet.getRange(1, INV.ERROR).setValue("Error");
    return;
  }

  // Layout viejo: email | nombre | apellido | empresa | cargo | estado | ...
  if (h0 === "email" || (h0 === "correo" && h2 !== "correo" && headers[1] === "nombre")) {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const width = Math.max(headers.length, 8);
      const data = sheet.getRange(2, 1, lastRow, width).getValues();
      const remapped = data.map(function (row) {
        const email = row[0];
        const nombre = row[1];
        const apellido = row[2];
        const empresa = row[3];
        const cargo = row[4];
        const estado = normalizeInviteStatus_(row[5]);
        const invitedAt = row[6] || "";
        const updatedAt = row[7] || "";
        return [
          nombre,
          apellido,
          email,
          estado === "pendiente" && email ? "pendiente" : estado,
          empresa,
          cargo,
          invitedAt,
          updatedAt,
        ];
      });
      sheet.clear();
      sheet
        .getRange(1, 1, 1, CONFIG.INVITE_HEADERS.length)
        .setValues([CONFIG.INVITE_HEADERS]);
      sheet.getRange(2, 1, remapped.length + 1, CONFIG.INVITE_HEADERS.length).setValues(remapped);
      return;
    }
  }

  sheet
    .getRange(1, 1, 1, CONFIG.INVITE_HEADERS.length)
    .setValues([CONFIG.INVITE_HEADERS]);
}

function getInvitesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.INVITES_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.INVITES_SHEET_NAME);
  }
  migrateInvitesSheetIfNeeded_(sheet);

  const headers = sheet
    .getRange(1, 1, 1, CONFIG.INVITE_HEADERS.length)
    .getValues()[0];
  const needsHeaders = CONFIG.INVITE_HEADERS.some(function (h, i) {
    return String(headers[i] || "").trim() !== h;
  });
  if (needsHeaders) {
    sheet
      .getRange(1, 1, 1, CONFIG.INVITE_HEADERS.length)
      .setValues([CONFIG.INVITE_HEADERS]);
  }
  formatInvitesSheet_(sheet);
  return sheet;
}

function getJobsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.JOBS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.JOBS_SHEET_NAME);
  }
  const headers = sheet
    .getRange(1, 1, 1, CONFIG.JOB_HEADERS.length)
    .getValues()[0];
  const needsHeaders = CONFIG.JOB_HEADERS.some(function (h, i) {
    return String(headers[i] || "").trim() !== h;
  });
  if (needsHeaders) {
    sheet
      .getRange(1, 1, 1, CONFIG.JOB_HEADERS.length)
      .setValues([CONFIG.JOB_HEADERS]);
  }
  return sheet;
}


/**
 * Selecciona una fila en Invitados y ejecuta el webhook.
 * Muestra el status HTTP y el body completo en un alert (para ver el error real).
 */
function probarInviteFilaActiva() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.INVITES_SHEET_NAME) {
    SpreadsheetApp.getUi().alert("Abre la hoja Invitados y selecciona una fila con correo.");
    return;
  }
  const row = sheet.getActiveRange().getRow();
  if (row < 2) {
    SpreadsheetApp.getUi().alert("Selecciona una fila de datos (no el encabezado).");
    return;
  }
  const email = normalizeEmail(sheet.getRange(row, INV.EMAIL).getValue());
  if (!email) {
    SpreadsheetApp.getUi().alert("Esa fila no tiene correo.");
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast("Probando " + email + "…", "Cloud & Coffee", 5);

  const response = UrlFetchApp.fetch(CONFIG.INVITE_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      secret: getWebhookSecret_(),
      email: email,
      nombre: String(sheet.getRange(row, INV.FIRST_NAME).getValue() || ""),
      apellido: String(sheet.getRange(row, INV.LAST_NAME).getValue() || ""),
      empresa: String(sheet.getRange(row, INV.COMPANY).getValue() || ""),
      cargo: String(sheet.getRange(row, INV.JOB_TITLE).getValue() || ""),
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText() || "(sin body)";
  const now = new Date().toISOString();

  if (statusCode >= 200 && statusCode < 300) {
    sheet.getRange(row, INV.STATUS).setValue("invitado");
    sheet.getRange(row, INV.INVITED_AT).setValue(now);
    sheet.getRange(row, INV.UPDATED_AT).setValue(now);
    sheet.getRange(row, INV.ERROR).setValue("");
    SpreadsheetApp.getUi().alert(
      "OK (" + statusCode + ")\n\n" + email + "\n\n" + body.slice(0, 800),
    );
  } else {
    sheet.getRange(row, INV.STATUS).setValue("error");
    sheet.getRange(row, INV.UPDATED_AT).setValue(now);
    sheet.getRange(row, INV.ERROR).setValue(
      ("HTTP " + statusCode + " · " + body).slice(0, 500),
    );
    SpreadsheetApp.getUi().alert(
      "ERROR (" +
        statusCode +
        ")\n\n" +
        email +
        "\n\n" +
        body.slice(0, 1200) +
        "\n\nRevisa SECRET en el script vs CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET en Vercel.",
    );
  }
}

function processInviteRow_(rowNumber) {
  const sheet = getInvitesSheet();
  const email = normalizeEmail(sheet.getRange(rowNumber, INV.EMAIL).getValue());
  if (!email) return;

  const estado = normalizeInviteStatus_(
    sheet.getRange(rowNumber, INV.STATUS).getValue(),
  );
  if (INVITE_DONE_STATUSES[estado]) return;

  // Si ya hubo envío (timestamp) pero Estado quedó en error, no reenviar.
  const alreadyInvitedAt = String(
    sheet.getRange(rowNumber, INV.INVITED_AT).getValue() || "",
  ).trim();
  if (alreadyInvitedAt) {
    sheet.getRange(rowNumber, INV.STATUS).setValue("invitado");
    sheet.getRange(rowNumber, INV.UPDATED_AT).setValue(new Date().toISOString());
    return;
  }

  if (!String(sheet.getRange(rowNumber, INV.STATUS).getValue() || "").trim()) {
    sheet.getRange(rowNumber, INV.STATUS).setValue("pendiente");
  }

  try {
    const response = UrlFetchApp.fetch(CONFIG.INVITE_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        secret: getWebhookSecret_(),
        email: email,
        nombre: String(sheet.getRange(rowNumber, INV.FIRST_NAME).getValue() || ""),
        apellido: String(sheet.getRange(rowNumber, INV.LAST_NAME).getValue() || ""),
        empresa: String(sheet.getRange(rowNumber, INV.COMPANY).getValue() || ""),
        cargo: String(sheet.getRange(rowNumber, INV.JOB_TITLE).getValue() || ""),
      }),
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const body = response.getContentText();
    if (statusCode < 200 || statusCode >= 300) {
      const msg =
        "Webhook invite falló (" +
        statusCode +
        ")" +
        (body ? " · " + body : "");
      sheet.getRange(rowNumber, INV.STATUS).setValue("error");
      sheet.getRange(rowNumber, INV.UPDATED_AT).setValue(new Date().toISOString());
      sheet.getRange(rowNumber, INV.ERROR).setValue(msg.slice(0, 500));
      throw new Error(msg);
    }

    const now = new Date().toISOString();
    sheet.getRange(rowNumber, INV.STATUS).setValue("invitado");
    sheet.getRange(rowNumber, INV.INVITED_AT).setValue(now);
    sheet.getRange(rowNumber, INV.UPDATED_AT).setValue(now);
    sheet.getRange(rowNumber, INV.ERROR).setValue("");
  } catch (error) {
    const msg =
      error && error.message ? String(error.message) : "Error al invitar";
    sheet.getRange(rowNumber, INV.STATUS).setValue("error");
    sheet.getRange(rowNumber, INV.UPDATED_AT).setValue(new Date().toISOString());
    sheet.getRange(rowNumber, INV.ERROR).setValue(msg.slice(0, 500));
    throw error;
  }
}

/**
 * Envía invitaciones en lotes de 20.
 * Si quedan más, programa solo el siguiente lote a los 20 minutos.
 * @param {boolean=} skipConfirm si true (casilla Correr / lote auto), no pide confirmación.
 * @param {boolean=} fromAutoLote si true, viene del activador automático.
 */
function correrInvitaciones(skipConfirm, fromAutoLote) {
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Revisando invitados pendientes…",
    "▶ Correr",
    5,
  );
  const sheet = getInvitesSheet();
  const pendingRows = listPendingInviteRows_(sheet);

  if (pendingRows.length === 0) {
    cancelarLotesInvitadosTriggers_();
    if (!fromAutoLote) {
      SpreadsheetApp.getUi().alert(
        "No hay invitaciones pendientes.\n\nPega Nombre | Apellido | Correo con Estado vacío o \"pendiente\", luego marca Correr.",
      );
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Lotes terminados: no quedan pendientes.",
        "Cloud & Coffee",
        8,
      );
    }
    return;
  }

  const batchSize = INVITE_BATCH.SIZE;
  const thisBatch = pendingRows.slice(0, batchSize);
  const remainingAfter = pendingRows.length - thisBatch.length;

  if (!skipConfirm && !fromAutoLote) {
    const ui = SpreadsheetApp.getUi();
    const confirm = ui.alert(
      "Correr invitaciones (lotes de " + batchSize + ")",
      "Hay " +
        pendingRows.length +
        " pendiente(s).\n\nEste lote enviará hasta " +
        batchSize +
        " ahora" +
        (remainingAfter > 0
          ? " y programará el resto cada " +
            INVITE_BATCH.DELAY_MINUTES +
            " min (automático)."
          : ".") +
        "\n\n¿Continuar?",
      ui.ButtonSet.YES_NO,
    );
    if (confirm !== ui.Button.YES) return;
  }

  let ok = 0;
  let fail = 0;
  const errors = [];
  for (let i = 0; i < thisBatch.length; i += 1) {
    try {
      processInviteRow_(thisBatch[i]);
      ok += 1;
    } catch (error) {
      fail += 1;
      if (errors.length < 3) {
        const email = normalizeEmail(
          sheet.getRange(thisBatch[i], INV.EMAIL).getValue(),
        );
        errors.push(
          email +
            ": " +
            (error && error.message ? error.message : "error"),
        );
      }
    }
  }

  const stillPending = listPendingInviteRows_(sheet).length;
  if (stillPending > 0) {
    scheduleNextInviteBatch_();
  } else {
    cancelarLotesInvitadosTriggers_();
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    ok + " ok · " + fail + " error · quedan " + stillPending,
    "Correr invitaciones",
    10,
  );

  if (fromAutoLote) {
    return;
  }

  let message =
    "Lote enviado: " +
    ok +
    " ok · " +
    fail +
    " con error.\nPendientes restantes: " +
    stillPending +
    ".";
  if (stillPending > 0) {
    message +=
      "\n\nEl siguiente lote de hasta " +
      batchSize +
      " saldrá solo en ~" +
      INVITE_BATCH.DELAY_MINUTES +
      " min. Para detener: menú → Cancelar lotes automáticos.";
  } else {
    message += "\n\nNo quedan pendientes.";
  }
  if (errors.length) {
    message += "\n\nDetalle (también en columna Error):\n" + errors.join("\n");
  }
  SpreadsheetApp.getUi().alert(message);
}

function listPendingInviteRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const pendingRows = [];
  if (lastRow < 2) return pendingRows;
  for (let row = 2; row <= lastRow; row += 1) {
    const email = normalizeEmail(sheet.getRange(row, INV.EMAIL).getValue());
    if (!email) continue;
    const estado = normalizeInviteStatus_(
      sheet.getRange(row, INV.STATUS).getValue(),
    );
    if (INVITE_DONE_STATUSES[estado]) continue;
    const alreadyInvitedAt = String(
      sheet.getRange(row, INV.INVITED_AT).getValue() || "",
    ).trim();
    if (alreadyInvitedAt) continue;
    pendingRows.push(row);
  }
  return pendingRows;
}

/** Lo llama el activador temporizado entre lotes. */
function correrSiguienteLoteInvitados() {
  correrInvitaciones(true, true);
}

function scheduleNextInviteBatch_() {
  cancelarLotesInvitadosTriggers_();
  ScriptApp.newTrigger(INVITE_BATCH.TRIGGER_HANDLER)
    .timeBased()
    .after(INVITE_BATCH.DELAY_MINUTES * 60 * 1000)
    .create();
}

function cancelarLotesInvitadosTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i += 1) {
    if (triggers[i].getHandlerFunction() === INVITE_BATCH.TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function cancelarLotesInvitados() {
  cancelarLotesInvitadosTriggers_();
  SpreadsheetApp.getUi().alert(
    "Lotes automáticos cancelados.\nLos pendientes siguen en la hoja; puedes volver a Correr cuando quieras.",
  );
}

/** Alias por si quedó referenciado el nombre anterior. */
function procesarInvitadosPendientes() {
  correrInvitaciones(false);
}

function findInviteeRow_(sheet, email) {
  const normalized = normalizeEmail(email);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !normalized) return 0;
  const emails = sheet.getRange(2, INV.EMAIL, lastRow, INV.EMAIL).getValues();
  for (let i = 0; i < emails.length; i += 1) {
    if (normalizeEmail(emails[i][0]) === normalized) return i + 2;
  }
  return 0;
}

function upsertInvitee(data) {
  const sheet = getInvitesSheet();
  const email = normalizeEmail(data.email);
  if (!email) return;

  let row = findInviteeRow_(sheet, email);
  const now = new Date().toISOString();
  if (!row) {
    sheet.appendRow([
      safeText(data.firstName),
      safeText(data.lastName),
      email,
      "pendiente",
      safeText(data.company),
      safeText(data.jobTitle),
      "",
      now,
    ]);
    return;
  }

  if (data.firstName) sheet.getRange(row, INV.FIRST_NAME).setValue(safeText(data.firstName));
  if (data.lastName) sheet.getRange(row, INV.LAST_NAME).setValue(safeText(data.lastName));
  if (data.company) sheet.getRange(row, INV.COMPANY).setValue(safeText(data.company));
  if (data.jobTitle) sheet.getRange(row, INV.JOB_TITLE).setValue(safeText(data.jobTitle));
  sheet.getRange(row, INV.UPDATED_AT).setValue(now);
}

function markInviteeInvited(email, invitedAt) {
  updateInviteeStatus(email, "invitado", invitedAt);
}

function updateInviteeStatus(email, status, invitedAt) {
  const sheet = getInvitesSheet();
  let row = findInviteeRow_(sheet, email);
  const normalized = normalizeInviteStatus_(status);
  const now = new Date().toISOString();

  if (!row) {
    sheet.appendRow([
      "",
      "",
      normalizeEmail(email),
      normalized,
      "",
      "",
      normalized === "invitado" ? invitedAt || now : "",
      now,
    ]);
    return;
  }

  sheet.getRange(row, INV.STATUS).setValue(normalized);
  sheet.getRange(row, INV.UPDATED_AT).setValue(now);
  if (normalized === "invitado") {
    const currentInvited = sheet.getRange(row, INV.INVITED_AT).getValue();
    if (!currentInvited || invitedAt) {
      sheet.getRange(row, INV.INVITED_AT).setValue(invitedAt || now);
    }
  }
}

/**
 * Resetea un correo ya usado para volver a probar el funnel completo.
 * Uso: selecciona la fila en Invitados (o escribe el correo) → menú Resetear contacto de prueba.
 */
function resetearContactoPrueba() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let email = "";

  if (sheet.getName() === CONFIG.INVITES_SHEET_NAME) {
    const row = sheet.getActiveRange().getRow();
    if (row > 1) {
      email = normalizeEmail(sheet.getRange(row, INV.EMAIL).getValue());
    }
  }

  if (!email) {
    const prompt = ui.prompt(
      "Resetear contacto de prueba",
      "Escribe el correo a resetear:",
      ui.ButtonSet.OK_CANCEL,
    );
    if (prompt.getSelectedButton() !== ui.Button.OK) return;
    email = normalizeEmail(prompt.getResponseText());
  }

  if (!email) {
    ui.alert("Necesitas un correo válido.");
    return;
  }

  const confirm = ui.alert(
    "Resetear " + email + "?",
    "Se limpia Invitados, se borra de Registros, se cancelan jobs y se resetea Brevo para poder reinvitar y registrarte de nuevo.",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  try {
    resetTestContactSheets_(email);
    resetTestContactBrevo_(email);
    ui.alert(
      "Listo: " +
        email +
        " quedó en pendiente.\n\nPara visitar de nuevo sin caché: ventana privada o borra sessionStorage de c4c7ops.co.\nLuego: Estado pendiente → marca Correr (o menú ▶ Correr invitaciones).",
    );
  } catch (error) {
    ui.alert(
      "Error al resetear: " +
        (error && error.message ? error.message : "desconocido"),
    );
  }
}

function resetTestContactSheets_(email) {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();

  // Invitados → pendiente, sin fecha de invitación
  const invites = getInvitesSheet();
  const inviteRow = findInviteeRow_(invites, normalized);
  if (inviteRow) {
    invites.getRange(inviteRow, INV.STATUS).setValue("pendiente");
    invites.getRange(inviteRow, INV.INVITED_AT).setValue("");
    invites.getRange(inviteRow, INV.UPDATED_AT).setValue(now);
  }

  // Registros → borrar fila
  const registros = getSheet();
  const attendee = findByEmailInSheet(registros, normalized);
  if (attendee && attendee.rowNumber) {
    registros.deleteRow(attendee.rowNumber);
  }

  // Cola → cancelar pendientes
  cancelEmailJobs(normalized, []);
}

function resetTestContactBrevo_(email) {
  const response = UrlFetchApp.fetch(CONFIG.RESET_TEST_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      secret: getWebhookSecret_(),
      email: normalizeEmail(email),
    }),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "Webhook reset falló (" + statusCode + ")" + (body ? " · " + body : ""),
    );
  }
}

function enqueueEmailJob(data) {
  const sheet = getJobsSheet();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  const email = normalizeEmail(data.email);
  const jobType = String(data.jobType || "").trim();

  // Evita duplicar el mismo job pendiente para el mismo email+tipo.
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet
      .getRange(2, 1, lastRow, CONFIG.JOB_HEADERS.length)
      .getValues();
    for (let i = 0; i < values.length; i += 1) {
      const row = values[i];
      if (
        normalizeEmail(row[JOB.EMAIL - 1]) === email &&
        String(row[JOB.TYPE - 1]) === jobType &&
        String(row[JOB.STATUS - 1]) === "pending"
      ) {
        sheet.getRange(i + 2, JOB.RUN_AT).setValue(String(data.runAt || ""));
        sheet.getRange(i + 2, JOB.PAYLOAD).setValue(String(data.payload || ""));
        return {
          id: String(row[JOB.ID - 1]),
          email: email,
          jobType: jobType,
          runAt: String(data.runAt || ""),
          status: "pending",
          payload: String(data.payload || ""),
        };
      }
    }
  }

  sheet.appendRow([
    id,
    email,
    jobType,
    String(data.runAt || ""),
    "pending",
    String(data.payload || ""),
    now,
    "",
    "",
  ]);

  return {
    id: id,
    email: email,
    jobType: jobType,
    runAt: String(data.runAt || ""),
    status: "pending",
    payload: String(data.payload || ""),
    createdAt: now,
  };
}

function listDueEmailJobs(nowIso) {
  const sheet = getJobsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const now = new Date(nowIso || new Date().toISOString()).getTime();
  const values = sheet
    .getRange(2, 1, lastRow, CONFIG.JOB_HEADERS.length)
    .getValues();
  const jobs = [];

  for (let i = 0; i < values.length; i += 1) {
    const row = values[i];
    if (String(row[JOB.STATUS - 1]) !== "pending") continue;
    const runAt = new Date(String(row[JOB.RUN_AT - 1] || "")).getTime();
    if (!runAt || runAt > now) continue;
    jobs.push({
      id: String(row[JOB.ID - 1]),
      email: normalizeEmail(row[JOB.EMAIL - 1]),
      jobType: String(row[JOB.TYPE - 1]),
      runAt: String(row[JOB.RUN_AT - 1]),
      status: "pending",
      payload: String(row[JOB.PAYLOAD - 1] || ""),
      createdAt: String(row[JOB.CREATED_AT - 1] || ""),
    });
  }

  return jobs;
}

function completeEmailJob(data) {
  const sheet = getJobsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const id = String(data.id || "");
  const values = sheet.getRange(2, JOB.ID, lastRow, JOB.ID).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]) === id) {
      const row = i + 2;
      sheet.getRange(row, JOB.STATUS).setValue(String(data.status || "done"));
      sheet.getRange(row, JOB.PROCESSED_AT).setValue(new Date().toISOString());
      sheet.getRange(row, JOB.ERROR).setValue(String(data.error || ""));
      return;
    }
  }
}

function cancelEmailJobs(email, jobTypes) {
  const sheet = getJobsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const normalized = normalizeEmail(email);
  const types = (jobTypes || []).map(function (t) {
    return String(t);
  });
  const values = sheet
    .getRange(2, 1, lastRow, CONFIG.JOB_HEADERS.length)
    .getValues();

  for (let i = 0; i < values.length; i += 1) {
    const row = values[i];
    if (String(row[JOB.STATUS - 1]) !== "pending") continue;
    if (normalizeEmail(row[JOB.EMAIL - 1]) !== normalized) continue;
    if (types.length && types.indexOf(String(row[JOB.TYPE - 1])) === -1) {
      continue;
    }
    const rowNumber = i + 2;
    sheet.getRange(rowNumber, JOB.STATUS).setValue("cancelled");
    sheet.getRange(rowNumber, JOB.PROCESSED_AT).setValue(new Date().toISOString());
  }
}
