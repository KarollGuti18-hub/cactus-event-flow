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

/** Correo “comparte y gana obsequio” tras aprobación: 1 hora */
export const SHARE_INVITE_DELAY_MS = 1 * 60 * 60 * 1000;

/**
 * Tope para el correo de referidos · 29 jul 2026 12:00 Bogotá.
 * Después de esta hora el invitado nuevo no alcanza a registrarse y ser aprobado.
 */
export const SHARE_INVITE_CUTOFF_AT_ISO = "2026-07-29T12:00:00-05:00";

/** Recordatorio 1 · 28 jul 2026 09:00 Bogotá */
export const REMINDER_1_AT_ISO = "2026-07-28T09:00:00-05:00";

/** Recordatorio 2 · 29 jul 2026 17:00 Bogotá */
export const REMINDER_2_AT_ISO = "2026-07-29T17:00:00-05:00";

/** Fin de Cloud & Coffee · 30 jul 2026 09:00 Bogotá */
export const EVENT_END_AT_ISO = "2026-07-30T09:00:00-05:00";

/**
 * Tope duro: no programar ni enviar correos desde el inicio del evento
 * (30 jul 2026 07:00 Bogotá).
 */
export const EMAIL_SCHEDULE_HARD_CUTOFF_AT_ISO = "2026-07-30T07:00:00-05:00";

export function addMs(fromIso: string | Date, ms: number): string {
  const base = typeof fromIso === "string" ? new Date(fromIso) : fromIso;
  return new Date(base.getTime() + ms).toISOString();
}

export function isRunAtPastHardCutoff(runAt: string | Date): boolean {
  const t = typeof runAt === "string" ? new Date(runAt).getTime() : runAt.getTime();
  return t >= new Date(EMAIL_SCHEDULE_HARD_CUTOFF_AT_ISO).getTime();
}

export type CloudCoffeeEmailJobType =
  | "followup_1"
  | "followup_2"
  | "visited"
  | "incomplete"
  | "reminder_1"
  | "reminder_2"
  | "share_invite"
  | "last_chance";
