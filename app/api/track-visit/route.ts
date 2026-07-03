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

interface TrackVisitPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export async function POST(request: Request) {
  try {
    const apiKey = getBrevoApiKey();
    const visitedListId = parseListId(process.env.BREVO_VISITED_LIST_ID);

    if (!apiKey || visitedListId === null) {
      return NextResponse.json(
        { error: "Configuración de Brevo incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as TrackVisitPayload;
    const email = body.email?.trim() ?? "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email no válido" }, { status: 400 });
    }

    const response = await sendToBrevo({
      email: normalizeEmail(email),
      attributes: {
        ...buildOptionalAttributes({
          NOMBRE: body.firstName,
          APELLIDOS: body.lastName,
        }),
        EVENT_STATUS: "visited",
      },
      listIds: [visitedListId],
      updateEnabled: true,
    });

    if (!response.ok) {
      const message = await getBrevoErrorMessage(response);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos registrar la visita" },
      { status: 500 },
    );
  }
}
