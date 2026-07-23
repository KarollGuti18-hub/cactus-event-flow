/** Delays del flujo transaccional · America/Bogota */

export const CLOUD_COFFEE_TZ = "America/Bogota";

/** Follow-up 1 tras invitación: 1.5 días */
export const FOLLOWUP_1_DELAY_MS = 36 * 60 * 60 * 1000;

/** Follow-up 2 tras FU1 / visitó / incompleto: 2 días */
export const FOLLOWUP_2_DELAY_MS = 2 * 24 * 60 * 60 * 1000;

/** Correo “visitó landing”: 2 horas */
export const VISITED_EMAIL_DELAY_MS = 2 * 60 * 60 * 1000;

/** Correo “registro incompleto”: 2 horas */
export const INCOMPLETE_EMAIL_DELAY_MS = 2 * 60 * 60 * 1000;

/** Recordatorio 1 · 28 jul 2026 09:00 Bogotá */
export const REMINDER_1_AT_ISO = "2026-07-28T09:00:00-05:00";

/** Recordatorio 2 · 29 jul 2026 17:00 Bogotá */
export const REMINDER_2_AT_ISO = "2026-07-29T17:00:00-05:00";

export function addMs(fromIso: string | Date, ms: number): string {
  const base = typeof fromIso === "string" ? new Date(fromIso) : fromIso;
  return new Date(base.getTime() + ms).toISOString();
}

export type CloudCoffeeEmailJobType =
  | "followup_1"
  | "followup_2"
  | "visited"
  | "incomplete"
  | "reminder_1"
  | "reminder_2";
