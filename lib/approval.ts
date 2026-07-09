import { AttendeeRecord } from "@/lib/attendee";
import {
  getBrevoApiKey,
  getBrevoErrorMessage,
  getBrevoSender,
  normalizeEmail,
  parseListId,
  sendToBrevo,
  sendTransactionalEmail,
} from "@/lib/brevo";
import {
  findAttendeeByEmail,
  isGoogleSheetsConfigured,
  listRowsNeedingProcessing,
  updateAttendeeRow,
} from "@/lib/google-sheets";
import { generateQrToken, getCheckInUrl, getQrImageUrl } from "@/lib/qr";

export interface ApprovalResult {
  email: string;
  status: "aprobado" | "rechazado" | "skipped";
  message: string;
}

function getEventName(): string {
  return process.env.EVENT_NAME?.trim() || "C4C7OPS Tech Summit";
}

async function syncApprovedContact(attendee: AttendeeRecord, token: string): Promise<void> {
  const apiKey = getBrevoApiKey();
  const approvedListId = parseListId(process.env.BREVO_APPROVED_LIST_ID);
  const registeredListId = parseListId(process.env.BREVO_REGISTERED_LIST_ID);

  if (!apiKey) {
    throw new Error("BREVO_API_KEY no configurado");
  }

  const listIds = approvedListId !== null ? [approvedListId] : [];
  const unlinkListIds = registeredListId !== null ? [registeredListId] : [];

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
    listIds,
    unlinkListIds,
    updateEnabled: true,
  });

  if (!response.ok) {
    const message = await getBrevoErrorMessage(response);
    throw new Error(message);
  }
}

async function syncRejectedContact(attendee: AttendeeRecord): Promise<void> {
  const apiKey = getBrevoApiKey();

  if (!apiKey) {
    throw new Error("BREVO_API_KEY no configurado");
  }

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
    const message = await getBrevoErrorMessage(response);
    throw new Error(message);
  }
}

function buildApprovalEmailHtml(attendee: AttendeeRecord, token: string): string {
  const eventName = getEventName();
  const qrImageUrl = getQrImageUrl(token);
  const checkInUrl = getCheckInUrl(token);

  return `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 560px; margin: 0 auto;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">${eventName}</h1>
      <p>Hola ${attendee.firstName},</p>
      <p>Tu registro fue <strong>aprobado</strong>. Presenta este código QR en la entrada del evento:</p>
      <div style="text-align: center; margin: 24px 0;">
        <img src="${qrImageUrl}" alt="Código QR de acceso" width="280" height="280" style="border: 1px solid #e5e5e5; border-radius: 12px;" />
      </div>
      <p style="font-size: 14px; color: #555;">Si no ves la imagen, abre este enlace: <a href="${checkInUrl}">${checkInUrl}</a></p>
      <p style="font-size: 14px; color: #555;">Guarda este correo o descarga el QR en tu teléfono.</p>
    </div>
  `;
}

async function sendApprovalEmail(attendee: AttendeeRecord, token: string): Promise<void> {
  const sender = getBrevoSender();
  const templateId = parseListId(process.env.BREVO_APPROVAL_TEMPLATE_ID);
  const eventName = getEventName();

  if (!sender) {
    throw new Error("BREVO_SENDER_EMAIL no configurado");
  }

  const params = {
    NOMBRE: attendee.firstName,
    APELLIDOS: attendee.lastName,
    EVENT_NAME: eventName,
    EVENT_QR_URL: getQrImageUrl(token),
    EVENT_CHECKIN_URL: getCheckInUrl(token),
  };

  const response = await sendTransactionalEmail({
    sender,
    to: [{ email: attendee.email, name: `${attendee.firstName} ${attendee.lastName}`.trim() }],
    templateId: templateId ?? undefined,
    subject: templateId ? undefined : `Tu acceso a ${eventName}`,
    htmlContent: templateId ? undefined : buildApprovalEmailHtml(attendee, token),
    params,
  });

  if (!response.ok) {
    const message = await getBrevoErrorMessage(response);
    throw new Error(message);
  }
}

export async function processApprovalByEmail(email: string): Promise<ApprovalResult> {
  if (!isGoogleSheetsConfigured()) {
    throw new Error("Google Sheets no configurado");
  }

  const attendee = await findAttendeeByEmail(email);

  if (!attendee) {
    return {
      email,
      status: "skipped",
      message: "No se encontró el registro en Google Sheets",
    };
  }

  if (attendee.status === "pendiente") {
    return {
      email,
      status: "skipped",
      message: "El registro sigue pendiente de revisión",
    };
  }

  if (attendee.status === "rechazado") {
    if (attendee.approvedAt) {
      return {
        email,
        status: "skipped",
        message: "El rechazo ya fue procesado",
      };
    }

    await syncRejectedContact(attendee);
    await updateAttendeeRow(attendee.rowNumber, {
      approvedAt: new Date().toISOString(),
    });

    return {
      email,
      status: "rechazado",
      message: "Contacto marcado como rechazado en Brevo",
    };
  }

  if (attendee.qrToken) {
    return {
      email,
      status: "skipped",
      message: "La aprobación ya fue procesada",
    };
  }

  const token = generateQrToken();
  const approvedAt = new Date().toISOString();

  await updateAttendeeRow(attendee.rowNumber, {
    qrToken: token,
    approvedAt,
  });

  await syncApprovedContact(attendee, token);
  await sendApprovalEmail(attendee, token);

  return {
    email,
    status: "aprobado",
    message: "QR generado y correo de aprobación enviado",
  };
}

export async function processPendingApprovals(): Promise<ApprovalResult[]> {
  if (!isGoogleSheetsConfigured()) {
    return [];
  }

  const pending = await listRowsNeedingProcessing();
  const results: ApprovalResult[] = [];

  for (const attendee of pending) {
    try {
      const result = await processApprovalByEmail(attendee.email);
      results.push(result);
    } catch (error) {
      results.push({
        email: attendee.email,
        status: "skipped",
        message: error instanceof Error ? error.message : "Error al procesar aprobación",
      });
    }
  }

  return results;
}
