import { NextResponse } from "next/server";

import {
  findCloudConfessionsAttendeeByToken,
  isCloudConfessionsGoogleSheetsConfigured,
} from "@/lib/cloud-confessions/google-sheets";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isCloudConfessionsGoogleSheetsConfigured()) {
      return NextResponse.json(
        { error: "Google Sheets de Cloud Confessions no configurado" },
        { status: 500 },
      );
    }

    const { token } = await context.params;
    if (!token?.trim()) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const attendee = await findCloudConfessionsAttendeeByToken(token);
    if (!attendee) {
      return NextResponse.json({ error: "Entrada no válida" }, { status: 404 });
    }

    if (attendee.status !== "aprobado") {
      return NextResponse.json(
        { error: "Esta solicitud no está aprobada" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: attendee.attended.toLowerCase() === "si",
      attendee: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        company: attendee.company,
        jobTitle: attendee.jobTitle,
        checkedInAt: attendee.checkedInAt,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos validar la entrada" },
      { status: 500 },
    );
  }
}
