import { isValidEmail, normalizeEmail } from "@/lib/brevo";
import type { CloudConfessionsOrigin } from "@/lib/cloud-confessions/config";
import type {
  CloudConfessionsIncompletePayload,
  CloudConfessionsRegistrationInput,
  CloudConfessionsRegistrationPayload,
} from "@/lib/cloud-confessions/types";

const TEXT_LIMITS = {
  firstName: 80,
  lastName: 100,
  company: 150,
  jobTitle: 120,
} as const;

export interface ValidationResult<T> {
  data?: T;
  error?: string;
}

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeContactNumber(value: unknown): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  const hasInternationalPrefix = trimmed.startsWith("+");

  return `${hasInternationalPrefix ? "+" : ""}${digits}`.slice(0, 16);
}

export function isValidContactNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function normalizeOrigin(value: unknown): CloudConfessionsOrigin {
  return value === "invitation_link" ? "invitation_link" : "landing";
}

export function validateRegistrationPayload(
  payload: Partial<CloudConfessionsRegistrationPayload>,
): ValidationResult<CloudConfessionsRegistrationInput> {
  const firstName = sanitizeText(payload.firstName, TEXT_LIMITS.firstName);
  const lastName = sanitizeText(payload.lastName, TEXT_LIMITS.lastName);
  const email =
    typeof payload.email === "string" ? normalizeEmail(payload.email).slice(0, 254) : "";
  const company = sanitizeText(payload.company, TEXT_LIMITS.company);
  const jobTitle = sanitizeText(payload.jobTitle, TEXT_LIMITS.jobTitle);
  const telefono = normalizeContactNumber(payload.telefono);

  if (!firstName) return { error: "El nombre es requerido" };
  if (!lastName) return { error: "Los apellidos son requeridos" };
  if (!isValidEmail(email)) return { error: "El correo no es válido" };
  if (!company) return { error: "La empresa es requerida" };
  if (!jobTitle) return { error: "El cargo es requerido" };
  if (!isValidContactNumber(telefono)) {
    return { error: "El número de contacto no es válido" };
  }
  if (payload.consent !== true) {
    return { error: "Debes aceptar el consentimiento" };
  }

  return {
    data: {
      firstName,
      lastName,
      email,
      company,
      jobTitle,
      telefono,
      consent: true,
      origin: normalizeOrigin(payload.origin),
    },
  };
}

export function sanitizeIncompletePayload(
  payload: CloudConfessionsIncompletePayload,
): CloudConfessionsIncompletePayload {
  const email =
    typeof payload.email === "string" ? normalizeEmail(payload.email).slice(0, 254) : "";

  return {
    email,
    firstName: sanitizeText(payload.firstName, TEXT_LIMITS.firstName),
    lastName: sanitizeText(payload.lastName, TEXT_LIMITS.lastName),
    company: sanitizeText(payload.company, TEXT_LIMITS.company),
    jobTitle: sanitizeText(payload.jobTitle, TEXT_LIMITS.jobTitle),
    telefono: normalizeContactNumber(payload.telefono),
    consent: payload.consent === true,
    origin: normalizeOrigin(payload.origin),
  };
}
