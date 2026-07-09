import { NextResponse } from "next/server";

import { parseAttendeeStatus } from "@/lib/attendee";
import { processApprovalByEmail } from "@/lib/approval";

interface SheetsApprovalPayload {
  secret?: string;
  email?: string;
  estado?: string;
}

function isAuthorized(secret: string | undefined): boolean {
  const expected = process.env.SHEETS_WEBHOOK_SECRET?.trim();

  if (!expected) {
    return false;
  }

  return secret === expected;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SheetsApprovalPayload;

    if (!isAuthorized(body.secret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const status = parseAttendeeStatus(body.estado);

    if (status === "pendiente") {
      return NextResponse.json(
        { error: "El estado debe ser aprobado o rechazado" },
        { status: 400 },
      );
    }

    const result = await processApprovalByEmail(email);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar aprobación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
