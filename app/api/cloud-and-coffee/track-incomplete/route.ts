import { NextResponse } from "next/server";

import { getBrevoApiKey, isValidEmail } from "@/lib/brevo";
import {
  getCloudConfessionsContact,
  getCloudConfessionsListIds,
  hasCloudConfessionsCompletedRegistration,
} from "@/lib/cloud-confessions/brevo";
import { onCloudCoffeeIncomplete } from "@/lib/cloud-confessions/email-flow";
import {
  findCloudConfessionsAttendeeByEmail,
  isCloudConfessionsGoogleSheetsConfigured,
} from "@/lib/cloud-confessions/google-sheets";
import type { CloudConfessionsIncompletePayload } from "@/lib/cloud-confessions/types";
import { sanitizeIncompletePayload } from "@/lib/cloud-confessions/validation";

export async function POST(request: Request) {
  try {
    const listIds = getCloudConfessionsListIds();
    if (!getBrevoApiKey() || !listIds) {
      return NextResponse.json(
        { error: "Configuración de Cloud Confession incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as CloudConfessionsIncompletePayload;
    const data = sanitizeIncompletePayload(body);

    if (!data.email || !isValidEmail(data.email)) {
      return NextResponse.json({ error: "Correo no válido" }, { status: 400 });
    }

    if (isCloudConfessionsGoogleSheetsConfigured()) {
      try {
        const attendee = await findCloudConfessionsAttendeeByEmail(data.email);
        if (
          attendee &&
          (attendee.status === "pendiente_aprobacion" ||
            attendee.status === "aprobado")
        ) {
          return NextResponse.json(
            { success: true, skipped: true, reason: "already_registered" },
            { status: 200 },
          );
        }
      } catch (error) {
        console.error("Cloud Confession incomplete Sheets lookup failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    try {
      const contact = await getCloudConfessionsContact(data.email);
      if (hasCloudConfessionsCompletedRegistration(contact, listIds)) {
        return NextResponse.json(
          { success: true, skipped: true, reason: "already_registered" },
          { status: 200 },
        );
      }
    } catch (error) {
      console.error("Cloud Confession incomplete Brevo lookup failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "unknown",
      });
    }

    await onCloudCoffeeIncomplete({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      jobTitle: data.jobTitle,
      telefono: data.telefono,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cloud Confession incomplete tracking failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos guardar el avance" },
      { status: 500 },
    );
  }
}
