import { AttendeeRecord, RegistrationInput } from "@/lib/attendee";

type AppsScriptAction =
  | "appendRegistration"
  | "findByEmail"
  | "findByToken"
  | "updateRow"
  | "listNeedingProcessing";

interface AppsScriptResponse<T> {
  success?: boolean;
  error?: string;
  attendee?: AttendeeRecord | null;
  attendees?: AttendeeRecord[];
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_APPS_SCRIPT_URL?.trim() &&
      process.env.SHEETS_WEBHOOK_SECRET?.trim(),
  );
}

async function callAppsScript<T>(
  action: AppsScriptAction,
  data?: Record<string, unknown>,
): Promise<T> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const secret = process.env.SHEETS_WEBHOOK_SECRET?.trim();

  if (!url || !secret) {
    throw new Error("Google Apps Script no configurado");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, action, data }),
    redirect: "follow",
  });

  const result = (await response.json().catch(() => ({}))) as AppsScriptResponse<T>;

  if (!response.ok || result.error || result.success === false) {
    throw new Error(result.error ?? "Error al comunicarse con Google Apps Script");
  }

  return result as T;
}

export async function appendRegistration(
  input: RegistrationInput,
  registrationId: string,
): Promise<void> {
  await callAppsScript("appendRegistration", {
    registrationId,
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    company: input.company.trim(),
    jobTitle: input.jobTitle.trim(),
    phone: input.phone?.trim() ?? "",
    interest: input.interest.trim(),
  });
}

export async function findAttendeeByEmail(email: string): Promise<AttendeeRecord | null> {
  const result = await callAppsScript<{ attendee?: AttendeeRecord | null }>("findByEmail", {
    email: email.trim().toLowerCase(),
  });

  return result.attendee ?? null;
}

export async function findAttendeeByToken(token: string): Promise<AttendeeRecord | null> {
  const result = await callAppsScript<{ attendee?: AttendeeRecord | null }>("findByToken", {
    token: token.trim(),
  });

  return result.attendee ?? null;
}

export async function updateAttendeeRow(
  rowNumber: number,
  updates: Partial<{
    status: string;
    approvedAt: string;
    qrToken: string;
    attended: string;
    checkedInAt: string;
  }>,
): Promise<void> {
  await callAppsScript("updateRow", { rowNumber, updates });
}

export async function listRowsNeedingProcessing(): Promise<AttendeeRecord[]> {
  const result = await callAppsScript<{ attendees?: AttendeeRecord[] }>(
    "listNeedingProcessing",
  );

  return result.attendees ?? [];
}
