import { normalizeEmail } from "@/lib/brevo";
import {
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import { cancelCloudCoffeeEmailJobs } from "@/lib/cloud-confessions/email-queue";
import type { CloudCoffeeEmailJobType } from "@/lib/cloud-confessions/delays";

const ALL_FUNNEL_JOBS: CloudCoffeeEmailJobType[] = [
  "followup_1",
  "followup_2",
  "visited",
  "incomplete",
  "reminder_1",
  "reminder_2",
];

/**
 * Deja un contacto listo para volver a probar el funnel
 * (invitar → visitar → incompleto → registrar → aprobar).
 */
export async function resetCloudCoffeeTestContact(emailInput: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const email = normalizeEmail(emailInput);
  if (!email) {
    return { ok: false, error: "Correo requerido" };
  }

  const listIds = getCloudConfessionsListIds();
  if (!listIds) {
    return { ok: false, error: "Listas de Brevo no configuradas" };
  }

  const unlinkListIds = [
    listIds.invited,
    listIds.visited,
    listIds.incomplete,
    listIds.registered,
    listIds.approved,
  ];

  const upsert = await upsertCloudConfessionsContact({
    email,
    attributes: {
      CC_EVENT_STATUS: "",
      CC_EVENT_ORIGIN: "",
      CC_REGISTERED_AT: "",
      CC_APPROVED_AT: "",
      CC_EVENT_QR_TOKEN: "",
      CC_EVENT_QR_URL: "",
      CC_EVENT_CHECKIN_URL: "",
      CC_EVENT_CHECKED_IN: false,
      CC_EVENT_CHECKED_IN_AT: "",
    },
    unlinkListIds,
  });

  if (!upsert.ok) {
    return {
      ok: false,
      error: `No se pudo resetear el contacto en Brevo (${upsert.status})`,
    };
  }

  try {
    await cancelCloudCoffeeEmailJobs(email, ALL_FUNNEL_JOBS);
  } catch (error) {
    console.error("Cloud & Coffee reset: cancel jobs failed", {
      email,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return { ok: true };
}
