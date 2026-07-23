import { normalizeEmail } from "@/lib/brevo";
import {
  addCloudConfessionsContactsToList,
  buildCloudConfessionsAttributes,
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
  type CloudConfessionsListIds,
} from "@/lib/cloud-confessions/brevo";

export type CloudCoffeeFunnelStage =
  | "invited"
  | "visited"
  | "incomplete"
  | "registered"
  | "approved";

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

  const upsert = await upsertCloudConfessionsContact({
    email,
    attributes: {
      ...buildCloudConfessionsAttributes({
        status: statusForStage(input.stage),
      }),
      ...(input.attributes ?? {}),
    },
    unlinkListIds,
  });

  if (!upsert.ok) {
    return { ok: false, error: `Brevo upsert falló (${upsert.status})` };
  }

  const add = await addCloudConfessionsContactsToList(targetId, [email]);
  if (!add.ok) {
    return { ok: false, error: `Brevo add-to-list falló (${add.status})` };
  }

  return { ok: true };
}
