import {
  addCloudConfessionsContactsToList,
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import { onCloudCoffeeApproved } from "@/lib/cloud-confessions/email-flow";
import { updateCloudCoffeeInviteeStatus } from "@/lib/cloud-confessions/email-queue";
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
  emailSent?: boolean;
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

  const unlinkListIds =
    status === "approved"
      ? [
          listIds.invited,
          listIds.visited,
          listIds.incomplete,
          listIds.registered,
        ]
      : [
          listIds.invited,
          listIds.visited,
          listIds.incomplete,
          listIds.registered,
          listIds.approved,
        ];

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
    unlinkListIds,
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el estado en Brevo");
  }

  if (status === "approved") {
    const add = await addCloudConfessionsContactsToList(listIds.approved, [
      attendee.email,
    ]);
    if (!add.ok) {
      throw new Error("No se pudo añadir el contacto a la lista de aprobados");
    }
  }

  await updateCloudConfessionsAttendeeRow(attendee.rowNumber, {
    status: status === "approved" ? "aprobado" : "rechazado",
    ...(approvedAt ? { approvedAt } : {}),
    ...(qrToken ? { qrToken } : {}),
    updatedAt: now,
  });

  void updateCloudCoffeeInviteeStatus(
    attendee.email,
    status === "approved" ? "aprobado" : "rechazado",
  );

  let emailSent = false;
  if (status === "approved" && qrToken) {
    const mail = await onCloudCoffeeApproved({
      email: attendee.email,
      firstName: attendee.firstName,
      qrToken,
    });
    emailSent = mail.emailSent;
  }

  return {
    email: attendee.email,
    status,
    message:
      status === "approved"
        ? "Solicitud aprobada, QR generado, correo enviado y sincronizado"
        : "Solicitud rechazada y sincronizada",
    ...(qrImageUrl ? { qrImageUrl } : {}),
    ...(ticketUrl ? { ticketUrl } : {}),
    ...(status === "approved" ? { emailSent } : {}),
  };
}
