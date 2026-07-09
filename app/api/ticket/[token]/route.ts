import { NextResponse } from "next/server";

import { findAttendeeByToken, isGoogleSheetsConfigured } from "@/lib/google-sheets";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({ error: "Google Sheets no configurado" }, { status: 500 });
    }

    const { token } = await context.params;

    if (!token?.trim()) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const attendee = await findAttendeeByToken(token);

    if (!attendee) {
      return NextResponse.json({ error: "Entrada no válida" }, { status: 404 });
    }

    if (attendee.status !== "aprobado") {
      return NextResponse.json({ error: "Este registro no está aprobado" }, { status: 403 });
    }

    const alreadyCheckedIn = attendee.attended.toLowerCase() === "si";

    return NextResponse.json({
      success: true,
      alreadyCheckedIn,
      attendee: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        company: attendee.company,
        jobTitle: attendee.jobTitle,
        checkedInAt: attendee.checkedInAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos validar la entrada";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
