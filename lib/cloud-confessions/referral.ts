import { normalizeEmail } from "@/lib/brevo";

/**
 * Codifica el correo de quien invita en un código para el link de referido.
 * base64url para que el amigo que recibe el link no vea el correo en claro
 * y para evitar caracteres como "@" en la URL.
 */
export function encodeReferralCode(email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";

  return btoa(normalized)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decodifica el código del link de vuelta al correo de quien invitó. */
export function decodeReferralCode(code: string): string {
  const trimmed = (code || "").trim();
  if (!trimmed) return "";

  try {
    const base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = normalizeEmail(atob(padded));
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded) ? decoded : "";
  } catch {
    return "";
  }
}
