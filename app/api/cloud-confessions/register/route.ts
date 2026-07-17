import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getBrevoApiKey } from "@/lib/brevo";
import {
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsListIds,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import {
  isCloudConfessionsGoogleSheetsConfigured,
  upsertCloudConfessionsRegistration,
} from "@/lib/cloud-confessions/google-sheets";
import type { CloudConfessionsRegistrationPayload } from "@/lib/cloud-confessions/types";
import { validateRegistrationPayload } from "@/lib/cloud-confessions/validation";

export async function POST(request: Request) {
  try {
    const listIds = getCloudConfessionsListIds();
    if (!getBrevoApiKey() || !listIds) {
      return NextResponse.json(
        { error: "Configuración de Cloud Confessions incompleta" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Partial<CloudConfessionsRegistrationPayload>;
    const validation = validateRegistrationPayload(body);

    if (!validation.data) {
      return NextResponse.json(
        { error: validation.error ?? "Datos de registro no válidos" },
        { status: 400 },
      );
    }

    const data = validation.data;
    const registrationId = randomUUID();
    const registeredAt = new Date().toISOString();

    const brevoResponse = await upsertCloudConfessionsContact({
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
          status: "pending_approval",
          consent: data.consent,
          origin: data.origin,
          registeredAt,
        }),
      },
      listIds: [listIds.registered],
      unlinkListIds: [listIds.incomplete],
    });

    if (!brevoResponse.ok) {
      console.error("Cloud Confessions registration failed in Brevo", {
        status: brevoResponse.status,
      });
      return NextResponse.json(
        { error: "No pudimos completar la solicitud" },
        { status: 502 },
      );
    }

    let sheetsSynced = false;
    let sheetsError: string | undefined;

    if (isCloudConfessionsGoogleSheetsConfigured()) {
      try {
        await upsertCloudConfessionsRegistration(
          data,
          registrationId,
          registeredAt,
        );
        sheetsSynced = true;
      } catch (error) {
        sheetsError = "No se pudo sincronizar el registro adicional";
        console.error("Cloud Confessions Sheets sync failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        registrationId,
        sheetsSynced,
        ...(sheetsError ? { sheetsError } : {}),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la solicitud" },
      { status: 500 },
    );
  }
}
