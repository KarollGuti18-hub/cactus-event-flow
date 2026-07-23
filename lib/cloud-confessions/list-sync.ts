import { normalizeEmail } from "@/lib/brevo";
import {
  addCloudConfessionsContactsToList,
  buildCloudConfessionsAttributes,
  getCloudConfessionsListIds,
  isBrevoAlreadyInListResponse,
  isBrevoContactMissingForListResponse,
  upsertCloudConfessionsContact,
  type CloudConfessionsListIds,
} from "@/lib/cloud-confessions/brevo";
import {
  updateCloudCoffeeInviteeStatus,
  type CloudCoffeeInviteeSheetStatus,
} from "@/lib/cloud-confessions/email-queue";

export type CloudCoffeeFunnelStage =
  | "invited"
  | "visited"
  | "incomplete"
  | "registered"
  | "approved";

function sheetStatusForStage(
  stage: CloudCoffeeFunnelStage,
): CloudCoffeeInviteeSheetStatus {
  switch (stage) {
    case "invited":
      return "invitado";
    case "visited":
      return "visitó";
    case "incomplete":
      return "incompleto";
    case "registered":
      return "registrado";
    case "approved":
      return "aprobado";
  }
}

function stageListId(
  listIds: CloudConfessionsListIds,
  stage: CloudCoffeeFunnelStage,
): number {
  switch (stage) {
    case "invited":
      return listIds.invited;
    case "visited":
      return listIds.visited;
    case "incomplete":
      return listIds.incomplete;
    case "registered":
      return listIds.registered;
    case "approved":
      return listIds.approved;
  }
}

function statusForStage(
  stage: CloudCoffeeFunnelStage,
):
  | "invited"
  | "visited"
  | "incomplete"
  | "pending_approval"
  | "approved" {
  if (stage === "registered") return "pending_approval";
  return stage;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Saca de las otras listas del funnel y deja solo la de destino. */
export async function moveCloudCoffeeContactToStage(input: {
  email: string;
  stage: CloudCoffeeFunnelStage;
  attributes?: Record<string, string | boolean>;
}): Promise<{ ok: boolean; error?: string }> {
  const listIds = getCloudConfessionsListIds();
  if (!listIds) {
    return { ok: false, error: "Listas de Brevo no configuradas" };
  }

  const email = normalizeEmail(input.email);
  const targetId = stageListId(listIds, input.stage);
  const unlinkListIds = [
    listIds.invited,
    listIds.visited,
    listIds.incomplete,
    listIds.registered,
    listIds.approved,
  ].filter((id) => id !== targetId);

  // listIds en el upsert garantiza que quede en la lista destino
  // aunque el endpoint /contacts/add falle por carrera.
  const upsert = await upsertCloudConfessionsContact({
    email,
    attributes: {
      ...buildCloudConfessionsAttributes({
        status: statusForStage(input.stage),
      }),
      ...(input.attributes ?? {}),
    },
    listIds: [targetId],
    unlinkListIds,
  });

  if (!upsert.ok) {
    return { ok: false, error: `Brevo upsert falló (${upsert.status})` };
  }

  let add = await addCloudConfessionsContactsToList(targetId, [email]);
  if (!add.ok && (await isBrevoContactMissingForListResponse(add))) {
    await sleep(800);
    add = await addCloudConfessionsContactsToList(targetId, [email]);
  }

  if (!add.ok && !(await isBrevoAlreadyInListResponse(add))) {
    const body = (await add.json().catch(() => ({}))) as { message?: string };
    const message = typeof body.message === "string" ? body.message : "";
    // El upsert ya lo puso en listIds; no tumbar el flujo solo por el add.
    console.error("Cloud & Coffee Brevo add-to-list soft-fail", {
      email,
      targetId,
      status: add.status,
      message,
    });
  }

  void updateCloudCoffeeInviteeStatus(email, sheetStatusForStage(input.stage));

  return { ok: true };
}
