export const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";

export interface BrevoContactBody {
  email: string;
  attributes?: Record<string, string | boolean>;
  listIds?: number[];
  unlinkListIds?: number[];
  updateEnabled: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseListId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isNaN(id) ? null : id;
}

export function getBrevoApiKey(): string | null {
  const apiKey = process.env.BREVO_API_KEY;
  return apiKey?.trim() ? apiKey : null;
}

export async function sendToBrevo(body: BrevoContactBody): Promise<Response> {
  return fetch(BREVO_CONTACTS_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
}

export async function getBrevoErrorMessage(response: Response): Promise<string> {
  const error = await response.json().catch(() => ({}));
  return typeof error.message === "string" ? error.message : "Error al sincronizar con Brevo";
}

export function buildOptionalAttributes(
  fields: Record<string, string | boolean | undefined>,
): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      attributes[key] = value;
      continue;
    }

    const trimmed = value?.trim();
    if (trimmed) {
      attributes[key] = trimmed;
    }
  }

  return attributes;
}
