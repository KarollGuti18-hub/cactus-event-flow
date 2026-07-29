import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/brevo";
import { sendCloudCoffeeLastChanceEmail } from "@/lib/cloud-confessions/transactional-emails";

interface LastChanceAttendee {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface LastChancePayload {
  secret?: string;
  attendees?: LastChanceAttendee[];
}

function isAuthorized(secret: string | undefined): boolean {
  const expected = process.env.CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET?.trim();
  const received = secret?.trim();
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Envío inmediato del último aviso a no registrados (menú Sheets).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LastChancePayload;
    if (!isAuthorized(body.secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const raw = Array.isArray(body.attendees) ? body.attendees : [];
    if (!raw.length) {
      return NextResponse.json(
        { error: "Lista de destinatarios vacía" },
        { status: 400 },
      );
    }

    const results: Array<{
      email: string;
      sent: boolean;
      error?: string;
    }> = [];

    for (const item of raw.slice(0, 200)) {
      const email =
        typeof item.email === "string"
          ? normalizeEmail(item.email).slice(0, 254)
          : "";
      if (!isValidEmail(email)) {
        results.push({
          email: String(item.email || ""),
          sent: false,
          error: "Correo inválido",
        });
        continue;
      }

      const firstName =
        typeof item.firstName === "string" && item.firstName.trim()
          ? item.firstName.trim()
          : "hola";
      const lastName =
        typeof item.lastName === "string" ? item.lastName.trim() : "";

      const sendResult = await sendCloudCoffeeLastChanceEmail({
        email,
        firstName,
        lastName,
      });

      results.push({
        email,
        sent: sendResult.sent,
        error: sendResult.error,
      });
    }

    const sent = results.filter((r) => r.sent).length;
    const failed = results.length - sent;

    return NextResponse.json(
      { success: true, sent, failed, results },
      { status: 200 },
    );
  } catch (error) {
    console.error("Cloud & Coffee last-chance blast failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos enviar los últimos avisos" },
      { status: 500 },
    );
  }
}
