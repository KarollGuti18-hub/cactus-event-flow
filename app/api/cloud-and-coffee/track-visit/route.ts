import { NextResponse } from "next/server";

import { getBrevoApiKey, isValidEmail, normalizeEmail } from "@/lib/brevo";
import { getCloudConfessionsListIds } from "@/lib/cloud-confessions/brevo";
import { onCloudCoffeeVisit } from "@/lib/cloud-confessions/email-flow";
import type { CloudConfessionsVisitPayload } from "@/lib/cloud-confessions/types";
import { sanitizeText } from "@/lib/cloud-confessions/validation";

export async function POST(request: Request) {
  try {
    const listIds = getCloudConfessionsListIds();
    if (!getBrevoApiKey() || !listIds) {
      return NextResponse.json(
        { error: "Configuración de Cloud Confession incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as CloudConfessionsVisitPayload;
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Correo no válido" }, { status: 400 });
    }

    await onCloudCoffeeVisit({
      email,
      firstName: sanitizeText(body.firstName, 80),
      lastName: sanitizeText(body.lastName, 100),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cloud Confession visit tracking failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos registrar la visita" },
      { status: 500 },
    );
  }
}
