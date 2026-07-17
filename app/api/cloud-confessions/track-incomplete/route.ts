import { NextResponse } from "next/server";

import { getBrevoApiKey, isValidEmail } from "@/lib/brevo";
import {
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
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
