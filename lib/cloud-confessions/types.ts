import type { CloudConfessionsOrigin } from "@/lib/cloud-confessions/config";

export type CloudConfessionsStatus =
  | "pendiente_aprobacion"
  | "aprobado"
  | "rechazado";

export interface CloudConfessionsRegistrationPayload {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  telefono: string;
  consent: boolean;
  origin: CloudConfessionsOrigin;
}

export interface CloudConfessionsIncompletePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  telefono?: string;
  consent?: boolean;
  origin?: CloudConfessionsOrigin;
}

export interface CloudConfessionsVisitPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface CloudConfessionsRegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  telefono: string;
  consent: true;
  origin: CloudConfessionsOrigin;
}

export interface CloudConfessionsAttendeeRecord {
  rowNumber: number;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  telefono: string;
  consent: boolean;
  origin: CloudConfessionsOrigin;
  status: CloudConfessionsStatus;
  registeredAt: string;
  approvedAt: string;
  qrToken: string;
  attended: string;
  checkedInAt: string;
  calendarInvitedAt: string;
  updatedAt: string;
}
