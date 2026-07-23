import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/brevo";
import { processCloudCoffeeInvite } from "@/lib/cloud-confessions/email-flow";

interface InvitePayload {
  secret?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  empresa?: string;
  cargo?: string;
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
    const body = (await request.json()) as InvitePayload;
    if (!isAuthorized(body.secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email =
      typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    const result = await processCloudCoffeeInvite({
      email,
      firstName: typeof body.nombre === "string" ? body.nombre : "",
      lastName: typeof body.apellido === "string" ? body.apellido : "",
      company: typeof body.empresa === "string" ? body.empresa : "",
      jobTitle: typeof body.cargo === "string" ? body.cargo : "",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "No se pudo invitar" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cloud & Coffee invite webhook failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos procesar la invitación" },
      { status: 500 },
    );
  }
}
