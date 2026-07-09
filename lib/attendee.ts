export type AttendeeStatus = "pendiente" | "aprobado" | "rechazado";

export interface AttendeeRecord {
  rowNumber: number;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  phone: string;
  interest: string;
  status: AttendeeStatus;
  registeredAt: string;
  approvedAt: string;
  qrToken: string;
  attended: string;
  checkedInAt: string;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone?: string;
  interest: string;
}

export const SHEET_HEADERS = [
  "id",
  "email",
  "nombre",
  "apellido",
  "empresa",
  "cargo",
  "telefono",
  "interes",
  "estado",
  "registrado_at",
  "aprobado_at",
  "qr_token",
  "asistio",
  "check_in_at",
] as const;

export const SHEET_COLUMN_INDEX = {
  id: 0,
  email: 1,
  firstName: 2,
  lastName: 3,
  company: 4,
  jobTitle: 5,
  phone: 6,
  interest: 7,
  status: 8,
  registeredAt: 9,
  approvedAt: 10,
  qrToken: 11,
  attended: 12,
  checkedInAt: 13,
} as const;

export function parseAttendeeStatus(value: string | undefined): AttendeeStatus {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "aprobado" || normalized === "approved") {
    return "aprobado";
  }

  if (normalized === "rechazado" || normalized === "rejected") {
    return "rechazado";
  }

  return "pendiente";
}

export function rowToAttendee(rowNumber: number, values: string[]): AttendeeRecord | null {
  if (values.length === 0 || !values[SHEET_COLUMN_INDEX.email]) {
    return null;
  }

  return {
    rowNumber,
    id: values[SHEET_COLUMN_INDEX.id] ?? "",
    email: values[SHEET_COLUMN_INDEX.email] ?? "",
    firstName: values[SHEET_COLUMN_INDEX.firstName] ?? "",
    lastName: values[SHEET_COLUMN_INDEX.lastName] ?? "",
    company: values[SHEET_COLUMN_INDEX.company] ?? "",
    jobTitle: values[SHEET_COLUMN_INDEX.jobTitle] ?? "",
    phone: values[SHEET_COLUMN_INDEX.phone] ?? "",
    interest: values[SHEET_COLUMN_INDEX.interest] ?? "",
    status: parseAttendeeStatus(values[SHEET_COLUMN_INDEX.status]),
    registeredAt: values[SHEET_COLUMN_INDEX.registeredAt] ?? "",
    approvedAt: values[SHEET_COLUMN_INDEX.approvedAt] ?? "",
    qrToken: values[SHEET_COLUMN_INDEX.qrToken] ?? "",
    attended: values[SHEET_COLUMN_INDEX.attended] ?? "",
    checkedInAt: values[SHEET_COLUMN_INDEX.checkedInAt] ?? "",
  };
}
