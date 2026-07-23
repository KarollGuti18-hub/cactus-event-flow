import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/brevo";
import { resetCloudCoffeeTestContact } from "@/lib/cloud-confessions/reset-test-contact";

interface ResetPayload {
  secret?: string;
  email?: string;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPayload;
    if (!isAuthorized(body.secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email =
      typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    const result = await resetCloudCoffeeTestContact(email);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "No se pudo resetear" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, email }, { status: 200 });
  } catch (error) {
    console.error("Cloud & Coffee reset-test webhook failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos resetear el contacto" },
      { status: 500 },
    );
  }
}
