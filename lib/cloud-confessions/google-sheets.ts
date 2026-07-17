import type {
  CloudConfessionsAttendeeRecord,
  CloudConfessionsRegistrationInput,
  CloudConfessionsStatus,
} from "@/lib/cloud-confessions/types";

type CloudConfessionsAppsScriptAction =
  | "upsertRegistration"
  | "findByEmail"
  | "findByToken"
  | "updateRow"
  | "listNeedingProcessing";

interface CloudConfessionsAppsScriptResponse {
  success?: boolean;
  error?: string;
  attendee?: CloudConfessionsAttendeeRecord | null;
  attendees?: CloudConfessionsAttendeeRecord[];
}

export function isCloudConfessionsGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.CLOUD_CONFESSIONS_GOOGLE_APPS_SCRIPT_URL?.trim() &&
      process.env.CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET?.trim(),
  );
}

async function callCloudConfessionsAppsScript(
  action: CloudConfessionsAppsScriptAction,
  data?: Record<string, unknown>,
): Promise<CloudConfessionsAppsScriptResponse> {
  const url = process.env.CLOUD_CONFESSIONS_GOOGLE_APPS_SCRIPT_URL?.trim();
  const secret = process.env.CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET?.trim();

  if (!url || !secret) {
    throw new Error("Google Apps Script de Cloud Confessions no configurado");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, action, data }),
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  const result = (await response.json().catch(() => ({}))) as
    CloudConfessionsAppsScriptResponse;

  if (!response.ok || result.error || result.success === false) {
    throw new Error(result.error ?? "Error al comunicarse con Google Apps Script");
  }

  return result;
}

export async function upsertCloudConfessionsRegistration(
  input: CloudConfessionsRegistrationInput,
  registrationId: string,
  registeredAt: string,
): Promise<CloudConfessionsAttendeeRecord | null> {
  const result = await callCloudConfessionsAppsScript("upsertRegistration", {
    registrationId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    jobTitle: input.jobTitle,
    telefono: input.telefono,
    consent: input.consent,
    origin: input.origin,
    registeredAt,
  });

  return result.attendee ?? null;
}

export async function findCloudConfessionsAttendeeByEmail(
  email: string,
): Promise<CloudConfessionsAttendeeRecord | null> {
  const result = await callCloudConfessionsAppsScript("findByEmail", {
    email: email.trim().toLowerCase(),
  });

  return result.attendee ?? null;
}

export async function findCloudConfessionsAttendeeByToken(
  token: string,
): Promise<CloudConfessionsAttendeeRecord | null> {
  const result = await callCloudConfessionsAppsScript("findByToken", {
    token: token.trim(),
  });

  return result.attendee ?? null;
}

export async function updateCloudConfessionsAttendeeRow(
  rowNumber: number,
  updates: Partial<{
    status: CloudConfessionsStatus;
    approvedAt: string;
    qrToken: string;
    attended: string;
    checkedInAt: string;
    updatedAt: string;
  }>,
): Promise<void> {
  await callCloudConfessionsAppsScript("updateRow", { rowNumber, updates });
}

export async function listCloudConfessionsRowsNeedingProcessing(): Promise<
  CloudConfessionsAttendeeRecord[]
> {
  const result = await callCloudConfessionsAppsScript("listNeedingProcessing");
  return result.attendees ?? [];
}
