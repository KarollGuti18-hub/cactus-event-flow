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
  findCloudConfessionsAttendeeByEmail,
  isCloudConfessionsGoogleSheetsConfigured,
  upsertCloudConfessionsRegistration,
} from "@/lib/cloud-confessions/google-sheets";
import { getCloudConfessionsTicketUrl } from "@/lib/cloud-confessions/qr";
import type { CloudConfessionsRegistrationPayload } from "@/lib/cloud-confessions/types";
import { validateRegistrationPayload } from "@/lib/cloud-confessions/validation";

export async function POST(request: Request) {
  try {
    const listIds = getCloudConfessionsListIds();
    if (!getBrevoApiKey() || !listIds) {
      return NextResponse.json(
        { error: "Configuración de Cloud Confession incompleta" },
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
    const sheetsConfigured = isCloudConfessionsGoogleSheetsConfigured();

    let existing = null;
    if (sheetsConfigured) {
      try {
        existing = await findCloudConfessionsAttendeeByEmail(data.email);
      } catch (error) {
        console.error("Cloud Confession duplicate lookup failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    if (existing?.status === "aprobado") {
      return NextResponse.json(
        {
          success: true,
          alreadyRegistered: true,
          status: "approved",
          registrationId: existing.id,
          ...(existing.qrToken
            ? { ticketUrl: getCloudConfessionsTicketUrl(existing.qrToken) }
            : {}),
        },
        { status: 200 },
      );
    }

    if (existing?.status === "pendiente_aprobacion") {
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
            registeredAt: existing.registeredAt,
          }),
        },
        listIds: [listIds.registered],
        unlinkListIds: [listIds.visited, listIds.incomplete],
      });

      if (!brevoResponse.ok) {
        console.error("Cloud Confession duplicate registration sync failed", {
          status: brevoResponse.status,
        });
        return NextResponse.json(
          { error: "No pudimos completar la solicitud" },
          { status: 502 },
        );
      }

      let sheetsSynced = false;
      try {
        await upsertCloudConfessionsRegistration(
          data,
          existing.id || randomUUID(),
          existing.registeredAt,
        );
        sheetsSynced = true;
      } catch (error) {
        console.error("Cloud Confession duplicate Sheets sync failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : "unknown",
        });
      }

      return NextResponse.json(
        {
          success: true,
          alreadyRegistered: true,
          status: "pending_approval",
          registrationId: existing.id,
          sheetsSynced,
        },
        { status: 200 },
      );
    }

    const registrationId = existing?.id || randomUUID();
    const registeredAt = existing?.registeredAt || new Date().toISOString();

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
      unlinkListIds: [listIds.visited, listIds.incomplete, listIds.approved],
    });

    if (!brevoResponse.ok) {
      console.error("Cloud Confession registration failed in Brevo", {
        status: brevoResponse.status,
      });
      return NextResponse.json(
        { error: "No pudimos completar la solicitud" },
        { status: 502 },
      );
    }

    let sheetsSynced = false;
    let sheetsError: string | undefined;

    if (sheetsConfigured) {
      try {
        await upsertCloudConfessionsRegistration(
          data,
          registrationId,
          registeredAt,
        );
        sheetsSynced = true;
      } catch (error) {
        sheetsError = "No se pudo sincronizar el registro adicional";
        console.error("Cloud Confession Sheets sync failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        alreadyRegistered: false,
        status: "pending_approval",
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
