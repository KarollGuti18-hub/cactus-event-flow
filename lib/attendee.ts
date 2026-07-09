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
