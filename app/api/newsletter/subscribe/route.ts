import { NextResponse } from "next/server";

import {
  getBrevoApiKey,
  isValidEmail,
  normalizeEmail,
  parseListId,
  sendToBrevo,
} from "@/lib/brevo";
import {
  isCloudConfessionsGoogleSheetsConfigured,
  upsertCloudConfessionsSubscription,
} from "@/lib/cloud-confessions/google-sheets";

interface SubscribePayload {
  email?: string;
  firstName?: string;
  source?: string;
}

export async function POST(request: Request) {
  try {
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

    if (!isCloudConfessionsGoogleSheetsConfigured()) {
      return NextResponse.json(
        { error: "Google Sheets no configurado" },
        { status: 500 },
      );
    }

    await upsertCloudConfessionsSubscription({
      email,
      firstName,
      source,
    });

    // Opcional: también a Brevo si hay lista configurada.
    const listId = parseListId(process.env.BREVO_NEWSLETTER_LIST_ID);
    if (getBrevoApiKey() && listId) {
      const attributes: Record<string, string | boolean> = {
        NEWSLETTER_SOURCE: source,
        NEWSLETTER_OPT_IN: true,
      };
      if (firstName) attributes.NOMBRE = firstName;

      const response = await sendToBrevo({
        email,
        updateEnabled: true,
        attributes,
        listIds: [listId],
      });

      if (!response.ok && response.status !== 204) {
        console.error("Newsletter Brevo sync failed", {
          status: response.status,
        });
      }
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
