import { NextResponse } from "next/server";

import {
  getBrevoApiKey,
  isValidEmail,
  normalizeEmail,
  parseListId,
  sendToBrevo,
} from "@/lib/brevo";

interface SubscribePayload {
  email?: string;
  firstName?: string;
  source?: string;
}

export async function POST(request: Request) {
  try {
    if (!getBrevoApiKey()) {
      return NextResponse.json(
        { error: "Brevo no configurado" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as SubscribePayload;
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
    const source =
      typeof body.source === "string"
        ? body.source.trim().slice(0, 80)
        : "newsletter";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    const listId = parseListId(process.env.BREVO_NEWSLETTER_LIST_ID);
    const attributes: Record<string, string | boolean> = {
      NEWSLETTER_SOURCE: source,
      NEWSLETTER_OPT_IN: true,
    };
    if (firstName) attributes.NOMBRE = firstName;

    const response = await sendToBrevo({
      email,
      updateEnabled: true,
      attributes,
      ...(listId ? { listIds: [listId] } : {}),
    });

    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      console.error("Newsletter subscribe failed", {
        status: response.status,
        err,
      });
      return NextResponse.json(
        { error: "No pudimos suscribirte ahora" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscribe error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos suscribirte" },
      { status: 500 },
    );
  }
}
