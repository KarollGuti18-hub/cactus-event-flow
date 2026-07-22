import { NextResponse } from "next/server";

import { getBrevoApiKey, isValidEmail } from "@/lib/brevo";
import {
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsContact,
  getCloudConfessionsListIds,
  hasCloudConfessionsCompletedRegistration,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
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
        // Si ya está registrado/aprobado, no lo devolvemos a incompleto.
        await upsertCloudConfessionsContact({
          email: data.email,
          unlinkListIds: [listIds.visited, listIds.incomplete],
        });

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

    const response = await upsertCloudConfessionsContact({
      email: data.email,
      attributes: {
        ...buildSharedContactAttributes({
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
          jobTitle: data.jobTitle,
          telefono: data.telefono,
        }),
        ...buildCloudConfessionsAttributes({
          status: "incomplete",
          consent: data.consent === true,
          origin: data.origin,
        }),
      },
      listIds: [listIds.incomplete],
      unlinkListIds: [listIds.visited],
    });

    if (!response.ok) {
      console.error("Cloud Confession incomplete tracking failed", {
        status: response.status,
      });
      return NextResponse.json(
        { error: "No pudimos guardar el avance" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos guardar el avance" },
      { status: 500 },
    );
  }
}
