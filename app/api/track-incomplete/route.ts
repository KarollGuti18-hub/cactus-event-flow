import { NextResponse } from "next/server";
import {
  buildOptionalAttributes,
  getBrevoApiKey,
  getBrevoErrorMessage,
  isValidEmail,
  normalizeEmail,
  parseListId,
  sendToBrevo,
} from "@/lib/brevo";

interface TrackIncompletePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  interest?: string;
}

function buildIncompleteAttributes(
  body: TrackIncompletePayload,
): Record<string, string | boolean> {
  const jobTitle = body.jobTitle?.trim();

  return {
    ...buildOptionalAttributes({
      NOMBRE: body.firstName,
      APELLIDOS: body.lastName,
      JOB_TITLE: jobTitle,
      EVENT_COMPANY: body.company,
      EVENT_INTEREST: body.interest,
    }),
    ...(jobTitle ? { EVENT_ROLE: jobTitle } : {}),
    EVENT_STATUS: "incomplete",
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = getBrevoApiKey();
    const incompleteListId = parseListId(process.env.BREVO_INCOMPLETE_LIST_ID);

    if (!apiKey || incompleteListId === null) {
      return NextResponse.json(
        { error: "Configuración de Brevo incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as TrackIncompletePayload;
    const email = body.email?.trim() ?? "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email no válido" }, { status: 400 });
    }

    const response = await sendToBrevo({
      email: normalizeEmail(email),
      attributes: buildIncompleteAttributes(body),
      listIds: [incompleteListId],
      updateEnabled: true,
    });

    if (!response.ok) {
      const message = await getBrevoErrorMessage(response);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos registrar el formulario incompleto" },
      { status: 500 },
    );
  }
}
