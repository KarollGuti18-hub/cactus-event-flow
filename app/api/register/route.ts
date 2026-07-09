import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  getBrevoApiKey,
  getBrevoErrorMessage,
  isValidEmail,
  normalizeEmail,
  parseListId,
  sendToBrevo,
} from "@/lib/brevo";
import { appendRegistration, isGoogleSheetsConfigured } from "@/lib/google-sheets";

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone?: string;
  interest: string;
  consent: boolean;
}

function isMissing(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}

function validatePayload(body: Partial<RegisterPayload>): string | null {
  if (isMissing(body.firstName)) return "El nombre es requerido";
  if (isMissing(body.lastName)) return "El apellido es requerido";
  if (isMissing(body.email)) return "El email es requerido";
  if (!isValidEmail(body.email!)) return "El email no es válido";
  if (isMissing(body.company)) return "La empresa es requerida";
  if (isMissing(body.jobTitle)) return "El cargo es requerido";
  if (isMissing(body.interest)) return "El interés principal es requerido";
  if (body.consent !== true) return "Debes aceptar el consentimiento";
  return null;
}

function buildRegisterAttributes(data: RegisterPayload): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {
    NOMBRE: data.firstName.trim(),
    APELLIDOS: data.lastName.trim(),
    JOB_TITLE: data.jobTitle.trim(),
    EVENT_COMPANY: data.company.trim(),
    EVENT_ROLE: data.jobTitle.trim(),
    EVENT_INTEREST: data.interest.trim(),
    EVENT_STATUS: "registered",
    EVENT_CONSENT: data.consent,
  };

  const phone = data.phone?.trim();
  if (phone) {
    attributes.EVENT_PHONE = phone;
  }

  return attributes;
}

async function sendRegistrationToBrevo(
  email: string,
  attributes: Record<string, string | boolean>,
  registeredListId: number,
  incompleteListId: number,
): Promise<Response> {
  const body = {
    email,
    attributes,
    listIds: [registeredListId],
    unlinkListIds: [incompleteListId],
    updateEnabled: true,
  };

  const response = await sendToBrevo(body);

  if (response.ok) {
    return response;
  }

  const message = await getBrevoErrorMessage(response);

  if (!message.toLowerCase().includes("sms")) {
    return Response.json({ message }, { status: response.status });
  }

  const { EVENT_PHONE: _removed, ...attributesWithoutPhone } = attributes;

  return sendToBrevo({ ...body, attributes: attributesWithoutPhone });
}

export async function POST(request: Request) {
  try {
    const apiKey = getBrevoApiKey();
    const registeredListId = parseListId(process.env.BREVO_REGISTERED_LIST_ID);
    const incompleteListId = parseListId(process.env.BREVO_INCOMPLETE_LIST_ID);

    if (!apiKey || registeredListId === null || incompleteListId === null) {
      return NextResponse.json(
        { error: "Configuración de Brevo incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Partial<RegisterPayload>;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const data = body as RegisterPayload;
    const registrationId = randomUUID();
    const normalizedEmail = normalizeEmail(data.email);

    const response = await sendRegistrationToBrevo(
      normalizedEmail,
      buildRegisterAttributes(data),
      registeredListId,
      incompleteListId,
    );

    if (!response.ok) {
      const message = await getBrevoErrorMessage(response);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    let sheetsSynced = false;
    let sheetsError: string | undefined;

    if (isGoogleSheetsConfigured()) {
      try {
        await appendRegistration(
          {
            firstName: data.firstName,
            lastName: data.lastName,
            email: normalizedEmail,
            company: data.company,
            jobTitle: data.jobTitle,
            phone: data.phone,
            interest: data.interest,
          },
          registrationId,
        );
        sheetsSynced = true;
      } catch (error) {
        sheetsError = error instanceof Error ? error.message : "Error al guardar en Sheets";
        console.error("Google Sheets sync failed:", error);
      }
    }

    return NextResponse.json(
      { success: true, registrationId, sheetsSynced, sheetsError },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar el registro" },
      { status: 500 },
    );
  }
}
