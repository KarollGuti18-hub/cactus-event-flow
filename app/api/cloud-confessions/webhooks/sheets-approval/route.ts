import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/brevo";
import { processCloudConfessionsApprovalByEmail } from "@/lib/cloud-confessions/approval";

interface CloudConfessionsApprovalPayload {
  secret?: string;
  email?: string;
  estado?: string;
}

function isAuthorized(secret: string | undefined): boolean {
  const expected = process.env.CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET?.trim();
  const received = secret?.trim();

  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function parseApprovalStatus(value: string | undefined): "approved" | "rejected" | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "aprobado") return "approved";
  if (normalized === "rechazado") return "rejected";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CloudConfessionsApprovalPayload;

    if (!isAuthorized(body.secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email =
      typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";
    const status = parseApprovalStatus(body.estado);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json(
        { error: "El estado debe ser aprobado o rechazado" },
        { status: 400 },
      );
    }

    const result = await processCloudConfessionsApprovalByEmail(email, status);

    return NextResponse.json(
      {
        success: true,
        status: result.status,
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Cloud Confessions approval webhook failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "No pudimos procesar la aprobación" },
      { status: 500 },
    );
  }
}
