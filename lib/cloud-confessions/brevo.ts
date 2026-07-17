import {
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

interface CloudConfessionsListIds {
  invited: number;
  visited: number;
  incomplete: number;
  registered: number;
  approved: number;
}

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

export async function upsertCloudConfessionsContact({
  email,
  attributes,
  listIds,
  unlinkListIds,
}: {
  email: string;
  attributes: Record<string, string | boolean>;
  listIds?: number[];
  unlinkListIds?: number[];
}): Promise<Response> {
  const body: BrevoContactBody = {
    email: normalizeEmail(email),
    attributes,
    updateEnabled: true,
  };

  if (listIds?.length) body.listIds = listIds;
  if (unlinkListIds?.length) body.unlinkListIds = unlinkListIds;

  return sendToBrevo(body);
}
