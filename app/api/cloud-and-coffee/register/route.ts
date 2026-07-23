import { randomUUID } from "crypto";
import { after, NextResponse } from "next/server";

import { getBrevoApiKey, getBrevoErrorMessage } from "@/lib/brevo";
import {
  addCloudConfessionsContactsToList,
  buildCloudConfessionsAttributes,
  buildSharedContactAttributes,
  getCloudConfessionsListIds,
  isBrevoAlreadyInListResponse,
  upsertCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import {
  findCloudConfessionsAttendeeByEmail,
  isCloudConfessionsGoogleSheetsConfigured,
  upsertCloudConfessionsRegistration,
} from "@/lib/cloud-confessions/google-sheets";
import { getCloudConfessionsTicketUrl } from "@/lib/cloud-confessions/qr";
import { sendSolicitudRecibidaEmail } from "@/lib/cloud-confessions/registration-email";
import { onCloudCoffeeRegistered } from "@/lib/cloud-confessions/email-flow";
import { updateCloudCoffeeInviteeStatus } from "@/lib/cloud-confessions/email-queue";
import type { CloudConfessionsRegistrationPayload } from "@/lib/cloud-confessions/types";
import { validateRegistrationPayload } from "@/lib/cloud-confessions/validation";

function scheduleRegistrationSideEffects(input: {
  email: string;
  firstName: string;
  sendConfirmationEmail: boolean;
}) {
  after(() => {
    void (async () => {
      try {
        await onCloudCoffeeRegistered(input.email);
      } catch (error) {
        console.error("Cloud Confession cancel follow-ups failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
      }

      void updateCloudCoffeeInviteeStatus(input.email, "registrado");

      if (!input.sendConfirmationEmail) return;

      try {
        const emailResult = await sendSolicitudRecibidaEmail({
          email: input.email,
          firstName: input.firstName,
        });
        if (!emailResult.sent) {
          console.error("Cloud Confession registration email failed", {
            emailError: emailResult.error,
          });
        }
      } catch (error) {
        console.error("Cloud Confession registration email failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    })();
  });
}

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

      // Re-añadir a lista 14 por si salió; no re-dispara automation si ya estaba.
      await addCloudConfessionsContactsToList(listIds.registered, [data.email]);

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

      scheduleRegistrationSideEffects({
        email: data.email,
        firstName: data.firstName,
        sendConfirmationEmail: false,
      });

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

    // 1) Upsert atributos y sacar de visitó/incompleto/aprobados (sin meter a 14 aún).
    // 2) Añadir a lista 14 en llamada aparte para que Brevo dispare "Contact added to list".
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
      unlinkListIds: [
        listIds.invited,
        listIds.visited,
        listIds.incomplete,
        listIds.approved,
      ],
    });

    if (!brevoResponse.ok) {
      const brevoError = await getBrevoErrorMessage(brevoResponse);
      console.error("Cloud Confession registration failed in Brevo", {
        status: brevoResponse.status,
        brevoError,
      });
      return NextResponse.json(
        {
          error: "No pudimos completar la solicitud en Brevo",
          brevoStatus: brevoResponse.status,
          brevoError,
        },
        { status: 502 },
      );
    }

    const addToListResponse = await addCloudConfessionsContactsToList(
      listIds.registered,
      [data.email],
    );

    if (
      !addToListResponse.ok &&
      !(await isBrevoAlreadyInListResponse(addToListResponse))
    ) {
      const brevoError = await getBrevoErrorMessage(addToListResponse);
      console.error("Cloud Confession add to registered list failed", {
        status: addToListResponse.status,
        brevoError,
      });
      return NextResponse.json(
        {
          error: "Registramos tus datos pero no pudimos añadirlos a la lista",
          brevoStatus: addToListResponse.status,
          brevoError,
        },
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
        sheetsError =
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar el registro adicional";
        console.error("Cloud Confession Sheets sync failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
          message: sheetsError,
        });
        return NextResponse.json(
          {
            error:
              "No pudimos guardar tu solicitud en Sheets. Revisa la pestaña Registros (encabezados) e inténtalo de nuevo.",
            sheetsError,
          },
          { status: 502 },
        );
      }
    } else {
      sheetsError =
        "Faltan CLOUD_CONFESSIONS_GOOGLE_APPS_SCRIPT_URL o CLOUD_CONFESSIONS_SHEETS_WEBHOOK_SECRET en Vercel";
      return NextResponse.json(
        {
          error: "Registro no configurado en Sheets",
          sheetsError,
        },
        { status: 500 },
      );
    }

    // Responder ya: correo + cancelar follow-ups no deben bloquear la UI.
    scheduleRegistrationSideEffects({
      email: data.email,
      firstName: data.firstName,
      sendConfirmationEmail: true,
    });

    return NextResponse.json(
      {
        success: true,
        alreadyRegistered: false,
        status: "pending_approval",
        registrationId,
        sheetsConfigured,
        sheetsSynced,
        emailSent: true,
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
