import {
  BREVO_CONTACTS_URL,
  getBrevoApiKey,
  normalizeEmail,
  sendToBrevo,
  type BrevoContactBody,
} from "@/lib/brevo";
import type { CloudConfessionsOrigin } from "@/lib/cloud-confessions/config";

export const cloudConfessionsBrevoEnv = {
  invitedListId: "BREVO_CLOUD_CONFESSIONS_INVITED_LIST_ID",
  visitedListId: "BREVO_CLOUD_CONFESSIONS_VISITED_LIST_ID",
  incompleteListId: "BREVO_CLOUD_CONFESSIONS_INCOMPLETE_LIST_ID",
  registeredListId: "BREVO_CLOUD_CONFESSIONS_REGISTERED_LIST_ID",
  approvedListId: "BREVO_CLOUD_CONFESSIONS_APPROVED_LIST_ID",
} as const;

export interface CloudConfessionsContactData {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  telefono?: string;
}

export interface CloudConfessionsListIds {
  invited: number;
  visited: number;
  incomplete: number;
  registered: number;
  approved: number;
}

interface CloudConfessionsBrevoContact {
  email?: string;
  listIds?: number[];
  attributes?: Record<string, string | boolean | number | null>;
}

const COMPLETED_STATUSES = new Set([
  "pending_approval",
  "approved",
  "checked_in",
]);

function parsePositiveListId(value: string | undefined): number | null {
  if (!value?.trim()) return null;

  const listId = Number(value);
  return Number.isInteger(listId) && listId > 0 ? listId : null;
}

export function getCloudConfessionsListIds(): CloudConfessionsListIds | null {
  const invited = parsePositiveListId(
    process.env.BREVO_CLOUD_CONFESSIONS_INVITED_LIST_ID,
  );
  const visited = parsePositiveListId(
    process.env.BREVO_CLOUD_CONFESSIONS_VISITED_LIST_ID,
  );
  const incomplete = parsePositiveListId(
    process.env.BREVO_CLOUD_CONFESSIONS_INCOMPLETE_LIST_ID,
  );
  const registered = parsePositiveListId(
    process.env.BREVO_CLOUD_CONFESSIONS_REGISTERED_LIST_ID,
  );
  const approved = parsePositiveListId(
    process.env.BREVO_CLOUD_CONFESSIONS_APPROVED_LIST_ID,
  );

  if (
    invited === null ||
    visited === null ||
    incomplete === null ||
    registered === null ||
    approved === null
  ) {
    return null;
  }

  return { invited, visited, incomplete, registered, approved };
}

export function isCloudConfessionsBrevoConfigured(): boolean {
  return Boolean(getBrevoApiKey() && getCloudConfessionsListIds());
}

export function buildSharedContactAttributes(
  contact: CloudConfessionsContactData,
): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (contact.firstName?.trim()) attributes.NOMBRE = contact.firstName.trim();
  if (contact.lastName?.trim()) attributes.APELLIDOS = contact.lastName.trim();
  if (contact.company?.trim()) attributes.EVENT_COMPANY = contact.company.trim();
  if (contact.jobTitle?.trim()) attributes.JOB_TITLE = contact.jobTitle.trim();
  if (contact.telefono?.trim()) attributes.EVENT_PHONE = contact.telefono.trim();

  return attributes;
}

export function buildCloudConfessionsAttributes({
  status,
  consent,
  origin,
  registeredAt,
  approvedAt,
  qrToken,
  qrUrl,
  ticketUrl,
  checkedIn,
  checkedInAt,
}: {
  status:
    | "invited"
    | "visited"
    | "incomplete"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "checked_in";
  consent?: boolean;
  origin?: CloudConfessionsOrigin;
  registeredAt?: string;
  approvedAt?: string;
  qrToken?: string;
  qrUrl?: string;
  ticketUrl?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {
    CC_EVENT_STATUS: status,
  };

  if (typeof consent === "boolean") attributes.CC_EVENT_CONSENT = consent;
  if (origin) attributes.CC_EVENT_ORIGIN = origin;
  if (registeredAt) attributes.CC_REGISTERED_AT = registeredAt;
  if (approvedAt) attributes.CC_APPROVED_AT = approvedAt;
  if (qrToken) attributes.CC_EVENT_QR_TOKEN = qrToken;
  if (qrUrl) attributes.CC_EVENT_QR_URL = qrUrl;
  if (ticketUrl) attributes.CC_EVENT_CHECKIN_URL = ticketUrl;
  if (typeof checkedIn === "boolean") {
    attributes.CC_EVENT_CHECKED_IN = checkedIn;
  }
  if (checkedInAt) attributes.CC_EVENT_CHECKED_IN_AT = checkedInAt;

  return attributes;
}

export async function getCloudConfessionsContact(
  email: string,
): Promise<CloudConfessionsBrevoContact | null> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${BREVO_CONTACTS_URL}/${encodeURIComponent(normalizeEmail(email))}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`No se pudo consultar el contacto en Brevo (${response.status})`);
  }

  return (await response.json()) as CloudConfessionsBrevoContact;
}

export function hasCloudConfessionsCompletedRegistration(
  contact: CloudConfessionsBrevoContact | null,
  listIds: CloudConfessionsListIds,
): boolean {
  if (!contact) return false;

  const status = String(contact.attributes?.CC_EVENT_STATUS ?? "")
    .trim()
    .toLowerCase();
  if (COMPLETED_STATUSES.has(status)) return true;

  const currentListIds = contact.listIds ?? [];
  return (
    currentListIds.includes(listIds.registered) ||
    currentListIds.includes(listIds.approved)
  );
}

export async function upsertCloudConfessionsContact({
  email,
  attributes,
  listIds,
  unlinkListIds,
}: {
  email: string;
  attributes?: Record<string, string | boolean>;
  listIds?: number[];
  unlinkListIds?: number[];
}): Promise<Response> {
  const body: BrevoContactBody = {
    email: normalizeEmail(email),
    updateEnabled: true,
  };

  if (attributes && Object.keys(attributes).length > 0) {
    body.attributes = attributes;
  }
  if (listIds?.length) body.listIds = listIds;
  if (unlinkListIds?.length) body.unlinkListIds = unlinkListIds;

  return sendToBrevo(body);
}

/**
 * Añade contactos a una lista con el endpoint dedicado.
 * Evita el "move" en el mismo upsert (Brevo no dispara automation "added to list"
 * cuando el contacto se mueve desde otra lista en la misma petición).
 */
export async function addCloudConfessionsContactsToList(
  listId: number,
  emails: string[],
): Promise<Response> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ message: "Brevo API key missing" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return fetch(
    `https://api.brevo.com/v3/contacts/lists/${listId}/contacts/add`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        emails: emails.map((email) => normalizeEmail(email)),
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
}

/** Brevo responde 400 si el contacto ya está en la lista; para el funnel eso es OK. */
export async function isBrevoAlreadyInListResponse(
  response: Response,
): Promise<boolean> {
  if (response.ok) return false;
  if (response.status !== 400) return false;
  const body = (await response.clone().json().catch(() => ({}))) as {
    message?: string;
  };
  const message = typeof body.message === "string" ? body.message.toLowerCase() : "";
  // Cuidado: NO usar /exist/ suelto — también matchea "does not exist".
  return (
    message.includes("already in list") ||
    message.includes("already exists") ||
    message.includes("duplicate") ||
    message.includes("ya está en la lista") ||
    message.includes("ya esta en la lista")
  );
}

export async function isBrevoContactMissingForListResponse(
  response: Response,
): Promise<boolean> {
  if (response.ok || response.status !== 400) return false;
  const body = (await response.clone().json().catch(() => ({}))) as {
    message?: string;
  };
  const message = typeof body.message === "string" ? body.message.toLowerCase() : "";
  return (
    message.includes("does not exist") ||
    message.includes("not exist") ||
    message.includes("no existe") ||
    message.includes("unable to add")
  );
}
