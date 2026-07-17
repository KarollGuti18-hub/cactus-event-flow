import { NextResponse } from "next/server";

import { getBrevoErrorMessage } from "@/lib/brevo";
import {
  buildCloudConfessionsAttributes,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import {
  findCloudConfessionsAttendeeByToken,
  isCloudConfessionsGoogleSheetsConfigured,
  updateCloudConfessionsAttendeeRow,
} from "@/lib/cloud-confessions/google-sheets";
import { isValidCloudConfessionsStaffPin } from "@/lib/cloud-confessions/staff-auth";

interface CheckInPayload {
  token?: string;
  staffPin?: string;
}

export async function POST(request: Request) {
  try {
    if (!isCloudConfessionsGoogleSheetsConfigured()) {
      return NextResponse.json(
        { error: "Google Sheets de Cloud Confession no configurado" },
        { status: 500 },
      );
    }

    if (!process.env.CLOUD_CONFESSIONS_STAFF_CHECKIN_PIN?.trim()) {
      return NextResponse.json(
        { error: "CLOUD_CONFESSIONS_STAFF_CHECKIN_PIN no configurado" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as CheckInPayload;
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    if (!isValidCloudConfessionsStaffPin(body.staffPin)) {
      return NextResponse.json(
        { error: "PIN de staff incorrecto" },
        { status: 401 },
      );
    }

    const attendee = await findCloudConfessionsAttendeeByToken(token);
    if (!attendee) {
      return NextResponse.json({ error: "Código QR no válido" }, { status: 404 });
    }

    if (attendee.status !== "aprobado") {
      return NextResponse.json(
        { error: "Esta solicitud no está aprobada para ingresar" },
        { status: 403 },
      );
    }

    const alreadyCheckedIn = attendee.attended.toLowerCase() === "si";
    const checkedInAt = alreadyCheckedIn
      ? attendee.checkedInAt
      : new Date().toISOString();

    if (!alreadyCheckedIn) {
      await updateCloudConfessionsAttendeeRow(attendee.rowNumber, {
        attended: "si",
        checkedInAt,
        updatedAt: checkedInAt,
      });

      const response = await upsertCloudConfessionsContact({
        email: attendee.email,
        attributes: buildCloudConfessionsAttributes({
          status: "checked_in",
          checkedIn: true,
          checkedInAt,
        }),
      });

      if (!response.ok) {
        console.error(
          "Cloud Confession Brevo check-in sync failed:",
          await getBrevoErrorMessage(response),
        );
      }
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn,
      attendee: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        company: attendee.company,
        jobTitle: attendee.jobTitle,
        checkedInAt,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos registrar la asistencia" },
      { status: 500 },
    );
  }
}
