import { NextResponse } from "next/server";

import { getBrevoApiKey, isValidEmail, normalizeEmail } from "@/lib/brevo";
import {
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import type { CloudConfessionsVisitPayload } from "@/lib/cloud-confessions/types";
import { sanitizeText } from "@/lib/cloud-confessions/validation";

export async function POST(request: Request) {
  try {
    const listIds = getCloudConfessionsListIds();
    if (!getBrevoApiKey() || !listIds) {
      return NextResponse.json(
        { error: "Configuración de Cloud Confession incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as CloudConfessionsVisitPayload;
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Correo no válido" }, { status: 400 });
    }

    const response = await upsertCloudConfessionsContact({
      email,
      attributes: {
        ...buildSharedContactAttributes({
          firstName: sanitizeText(body.firstName, 80),
          lastName: sanitizeText(body.lastName, 100),
        }),
        ...buildCloudConfessionsAttributes({
          status: "visited",
          origin: "invitation_link",
        }),
      },
      listIds: [listIds.visited],
    });

    if (!response.ok) {
      console.error("Cloud Confession visit tracking failed", {
        status: response.status,
      });
      return NextResponse.json(
        { error: "No pudimos registrar la visita" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "No pudimos registrar la visita" },
      { status: 500 },
    );
  }
}
