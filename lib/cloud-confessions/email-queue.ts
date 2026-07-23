import type { CloudCoffeeEmailJobType } from "@/lib/cloud-confessions/delays";

export interface CloudCoffeeEmailJob {
  id: string;
  email: string;
  jobType: CloudCoffeeEmailJobType;
  runAt: string;
  status: "pending" | "done" | "cancelled" | "failed";
  payload?: string;
  createdAt?: string;
  processedAt?: string;
  error?: string;
}

type AppsScriptAction =
  | "enqueueEmailJob"
  | "listDueEmailJobs"
  | "completeEmailJob"
  | "cancelEmailJobs"
  | "upsertInvitee"
  | "markInviteeInvited"
  | "updateInviteeStatus";

export type CloudCoffeeInviteeSheetStatus =
  | "pendiente"
  | "invitado"
  | "visitó"
  | "incompleto"
  | "registrado"
  | "aprobado"
  | "rechazado"
  | "error";

interface AppsScriptResponse {
  success?: boolean;
  error?: string;
  job?: CloudCoffeeEmailJob;
  jobs?: CloudCoffeeEmailJob[];
}

function getConfig() {
  const url = process.env.CLOUD_CONFESSIONS_GOOGLE_APPS_SCRIPT_URL?.trim();
  const secret = process.env.CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET?.trim();
  return { url, secret };
}

export function isCloudCoffeeJobsConfigured(): boolean {
  const { url, secret } = getConfig();
  return Boolean(url && secret);
}

async function callJobsAppsScript(
  action: AppsScriptAction,
  data?: Record<string, unknown>,
): Promise<AppsScriptResponse> {
  const { url, secret } = getConfig();
  if (!url || !secret) {
    throw new Error("Apps Script de Cloud & Coffee no configurado");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, action, data }),
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });

  const rawText = await response.text();
  let result: AppsScriptResponse = {};
  try {
    result = JSON.parse(rawText) as AppsScriptResponse;
  } catch {
    throw new Error(
      `Apps Script no devolvió JSON (HTTP ${response.status}): ${rawText.slice(0, 160)}`,
    );
  }

  if (!response.ok || result.success === false || result.error) {
    throw new Error(result.error ?? `Apps Script error HTTP ${response.status}`);
  }

  return result;
}

export async function enqueueCloudCoffeeEmailJob(input: {
  email: string;
  jobType: CloudCoffeeEmailJobType;
  runAt: string;
  payload?: Record<string, string>;
}): Promise<void> {
  if (!isCloudCoffeeJobsConfigured()) return;

  await callJobsAppsScript("enqueueEmailJob", {
    email: input.email.trim().toLowerCase(),
    jobType: input.jobType,
    runAt: input.runAt,
    payload: input.payload ? JSON.stringify(input.payload) : "",
  });
}

export async function listDueCloudCoffeeEmailJobs(
  nowIso = new Date().toISOString(),
): Promise<CloudCoffeeEmailJob[]> {
  if (!isCloudCoffeeJobsConfigured()) return [];
  const result = await callJobsAppsScript("listDueEmailJobs", { now: nowIso });
  return result.jobs ?? [];
}

export async function completeCloudCoffeeEmailJob(
  id: string,
  updates: { status: "done" | "failed" | "cancelled"; error?: string },
): Promise<void> {
  if (!isCloudCoffeeJobsConfigured()) return;
  await callJobsAppsScript("completeEmailJob", {
    id,
    status: updates.status,
    error: updates.error ?? "",
  });
}

export async function cancelCloudCoffeeEmailJobs(
  email: string,
  jobTypes?: CloudCoffeeEmailJobType[],
): Promise<void> {
  if (!isCloudCoffeeJobsConfigured()) return;
  await callJobsAppsScript("cancelEmailJobs", {
    email: email.trim().toLowerCase(),
    jobTypes: jobTypes ?? [],
  });
}

export async function upsertCloudCoffeeInvitee(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
}): Promise<void> {
  if (!isCloudCoffeeJobsConfigured()) return;
  await callJobsAppsScript("upsertInvitee", input);
}

export async function markCloudCoffeeInviteeInvited(email: string): Promise<void> {
  if (!isCloudCoffeeJobsConfigured()) return;
  await callJobsAppsScript("markInviteeInvited", {
    email: email.trim().toLowerCase(),
    invitedAt: new Date().toISOString(),
  });
}

export async function updateCloudCoffeeInviteeStatus(
  email: string,
  status: CloudCoffeeInviteeSheetStatus,
): Promise<void> {
  if (!isCloudCoffeeJobsConfigured()) return;
  try {
    await callJobsAppsScript("updateInviteeStatus", {
      email: email.trim().toLowerCase(),
      status,
    });
  } catch (error) {
    console.error("Cloud & Coffee invitee status sync failed", {
      email: email.trim().toLowerCase(),
      status,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
