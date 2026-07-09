export const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";
export const BREVO_SMTP_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

export interface BrevoContactBody {
  email: string;
  attributes?: Record<string, string | boolean>;
  listIds?: number[];
  unlinkListIds?: number[];
  updateEnabled: boolean;
}

export interface BrevoTransactionalEmailBody {
  to: Array<{ email: string; name?: string }>;
  templateId?: number;
  subject?: string;
  htmlContent?: string;
  params?: Record<string, string>;
  sender: {
    email: string;
    name: string;
  };
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

export async function sendTransactionalEmail(
  body: BrevoTransactionalEmailBody,
): Promise<Response> {
  return fetch(BREVO_SMTP_EMAIL_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
}

export function getBrevoSender(): { email: string; name: string } | null {
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  const name = process.env.BREVO_SENDER_NAME?.trim() || "C4C7OPS Tech Summit";

  if (!email) {
    return null;
  }

  return { email, name };
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
