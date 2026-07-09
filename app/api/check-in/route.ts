import { NextResponse } from "next/server";

import {
  getBrevoApiKey,
  getBrevoErrorMessage,
  normalizeEmail,
  sendToBrevo,
} from "@/lib/brevo";
import { findAttendeeByToken, isGoogleSheetsConfigured, updateAttendeeRow } from "@/lib/google-sheets";

interface CheckInPayload {
  token?: string;
}

export async function POST(request: Request) {
  try {
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({ error: "Google Sheets no configurado" }, { status: 500 });
    }

    const body = (await request.json()) as CheckInPayload;
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const attendee = await findAttendeeByToken(token);

    if (!attendee) {
      return NextResponse.json({ error: "Código QR no válido" }, { status: 404 });
    }

    if (attendee.status !== "aprobado") {
      return NextResponse.json(
        { error: "Este registro no está aprobado para ingresar" },
        { status: 403 },
      );
    }

    const alreadyCheckedIn = attendee.attended.toLowerCase() === "si";

    if (!alreadyCheckedIn) {
      const checkedInAt = new Date().toISOString();

      await updateAttendeeRow(attendee.rowNumber, {
        attended: "si",
        checkedInAt,
      });

      const apiKey = getBrevoApiKey();

      if (apiKey) {
        const response = await sendToBrevo({
          email: normalizeEmail(attendee.email),
          attributes: {
            EVENT_STATUS: "checked_in",
            EVENT_CHECKED_IN: true,
            EVENT_CHECKED_IN_AT: checkedInAt,
          },
          updateEnabled: true,
        });

        if (!response.ok) {
          const message = await getBrevoErrorMessage(response);
          console.error("Brevo check-in sync failed:", message);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        alreadyCheckedIn,
        attendee: {
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          company: attendee.company,
          jobTitle: attendee.jobTitle,
          checkedInAt: alreadyCheckedIn ? attendee.checkedInAt : new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos registrar la asistencia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
