import { AttendeeRecord, AttendeeStatus } from "@/lib/attendee";
import {
  getBrevoApiKey,
  getBrevoErrorMessage,
  normalizeEmail,
  parseListId,
  sendToBrevo,
} from "@/lib/brevo";
import {
  findAttendeeByEmail,
  isGoogleSheetsConfigured,
  updateAttendeeRow,
} from "@/lib/google-sheets";
import { generateQrToken, getCheckInUrl, getQrImageUrl } from "@/lib/qr";

export interface ApprovalResult {
  email: string;
  status: "aprobado" | "rechazado" | "skipped";
  message: string;
  qrImageUrl?: string;
  checkInUrl?: string;
}

async function syncApprovedContact(attendee: AttendeeRecord, token: string): Promise<void> {
  if (!getBrevoApiKey()) return;

  const approvedListId = parseListId(process.env.BREVO_APPROVED_LIST_ID);
  const registeredListId = parseListId(process.env.BREVO_REGISTERED_LIST_ID);

  const response = await sendToBrevo({
    email: normalizeEmail(attendee.email),
    attributes: {
      NOMBRE: attendee.firstName,
      APELLIDOS: attendee.lastName,
      EVENT_STATUS: "approved",
      EVENT_QR_TOKEN: token,
      EVENT_QR_URL: getQrImageUrl(token),
      EVENT_CHECKIN_URL: getCheckInUrl(token),
    },
    listIds: approvedListId !== null ? [approvedListId] : [],
    unlinkListIds: registeredListId !== null ? [registeredListId] : [],
    updateEnabled: true,
  });

  if (!response.ok) {
    console.error("Brevo approval sync failed:", await getBrevoErrorMessage(response));
  }
}

async function syncRejectedContact(attendee: AttendeeRecord): Promise<void> {
  if (!getBrevoApiKey()) return;

  const response = await sendToBrevo({
    email: normalizeEmail(attendee.email),
    attributes: {
      NOMBRE: attendee.firstName,
      APELLIDOS: attendee.lastName,
      EVENT_STATUS: "rejected",
    },
    updateEnabled: true,
  });

  if (!response.ok) {
    console.error("Brevo rejection sync failed:", await getBrevoErrorMessage(response));
  }
}

export async function processApprovalByEmail(
  email: string,
  options?: { status?: AttendeeStatus },
): Promise<ApprovalResult> {
  if (!isGoogleSheetsConfigured()) {
    throw new Error("Google Apps Script no configurado");
  }

  const attendee = await findAttendeeByEmail(email);

  if (!attendee) {
    return { email, status: "skipped", message: "No se encontró el registro en Google Sheets" };
  }

  const effectiveStatus = options?.status ?? attendee.status;

  if (effectiveStatus === "pendiente") {
    return { email, status: "skipped", message: "El registro sigue pendiente de revisión" };
  }

  if (effectiveStatus === "rechazado") {
    if (attendee.approvedAt) {
      return { email, status: "skipped", message: "El rechazo ya fue procesado" };
    }

    await updateAttendeeRow(attendee.rowNumber, {
      status: "rechazado",
      approvedAt: new Date().toISOString(),
    });

    await syncRejectedContact(attendee);

    return { email, status: "rechazado", message: "Registro marcado como rechazado" };
  }

  if (attendee.qrToken) {
    return {
      email,
      status: "skipped",
      message: "La aprobación ya fue procesada",
      qrImageUrl: getQrImageUrl(attendee.qrToken),
      checkInUrl: getCheckInUrl(attendee.qrToken),
    };
  }

  const token = generateQrToken();
  const approvedAt = new Date().toISOString();
  const qrImageUrl = getQrImageUrl(token);
  const checkInUrl = getCheckInUrl(token);

  await updateAttendeeRow(attendee.rowNumber, {
    status: "aprobado",
    qrToken: token,
    approvedAt,
  });

  await syncApprovedContact(attendee, token);

  return {
    email,
    status: "aprobado",
    message: "QR generado correctamente",
    qrImageUrl,
    checkInUrl,
  };
}
