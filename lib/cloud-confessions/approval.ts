import {
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import {
  findCloudConfessionsAttendeeByEmail,
  isCloudConfessionsGoogleSheetsConfigured,
  updateCloudConfessionsAttendeeRow,
} from "@/lib/cloud-confessions/google-sheets";
import {
  generateQrToken,
  getCloudConfessionsQrImageUrl,
  getCloudConfessionsTicketUrl,
} from "@/lib/cloud-confessions/qr";

export interface CloudConfessionsApprovalResult {
  email: string;
  status: "approved" | "rejected";
  message: string;
  qrImageUrl?: string;
  ticketUrl?: string;
}

export async function processCloudConfessionsApprovalByEmail(
  email: string,
  status: "approved" | "rejected",
): Promise<CloudConfessionsApprovalResult> {
  if (!isCloudConfessionsGoogleSheetsConfigured()) {
    throw new Error("Google Apps Script de Cloud Confession no configurado");
  }

  const listIds = getCloudConfessionsListIds();
  if (!listIds) {
    throw new Error("Listas de Brevo de Cloud Confession no configuradas");
  }

  const attendee = await findCloudConfessionsAttendeeByEmail(email);
  if (!attendee) {
    throw new Error("No se encontró la solicitud de Cloud Confession");
  }

  if (status === "approved" && attendee.status === "aprobado" && attendee.qrToken) {
    return {
      email: attendee.email,
      status,
      message: "La aprobación ya fue procesada",
      qrImageUrl: getCloudConfessionsQrImageUrl(attendee.qrToken),
      ticketUrl: getCloudConfessionsTicketUrl(attendee.qrToken),
    };
  }

  const now = new Date().toISOString();
  const approvedAt =
    status === "approved" ? attendee.approvedAt || now : undefined;
  const qrToken =
    status === "approved" ? attendee.qrToken || generateQrToken() : undefined;
  const qrImageUrl = qrToken
    ? getCloudConfessionsQrImageUrl(qrToken)
    : undefined;
  const ticketUrl = qrToken
    ? getCloudConfessionsTicketUrl(qrToken)
    : undefined;

  const response = await upsertCloudConfessionsContact({
    email: attendee.email,
    attributes: {
      ...buildSharedContactAttributes({
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        company: attendee.company,
        jobTitle: attendee.jobTitle,
        telefono: attendee.telefono,
      }),
      ...buildCloudConfessionsAttributes({
        status,
        consent: attendee.consent,
        origin: attendee.origin,
        approvedAt,
        qrToken,
        qrUrl: qrImageUrl,
        ticketUrl,
        ...(status === "approved" ? { checkedIn: false } : {}),
      }),
    },
    listIds: status === "approved" ? [listIds.approved] : undefined,
    unlinkListIds:
      status === "approved"
        ? [listIds.registered]
        : [listIds.registered, listIds.approved],
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el estado en Brevo");
  }

  await updateCloudConfessionsAttendeeRow(attendee.rowNumber, {
    status: status === "approved" ? "aprobado" : "rechazado",
    ...(approvedAt ? { approvedAt } : {}),
    ...(qrToken ? { qrToken } : {}),
    updatedAt: now,
  });

  return {
    email: attendee.email,
    status,
    message:
      status === "approved"
        ? "Solicitud aprobada, QR generado y sincronizado"
        : "Solicitud rechazada y sincronizada",
    ...(qrImageUrl ? { qrImageUrl } : {}),
    ...(ticketUrl ? { ticketUrl } : {}),
  };
}
