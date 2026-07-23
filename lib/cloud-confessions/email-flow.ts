import { normalizeEmail } from "@/lib/brevo";
import {
  getCloudConfessionsContact,
} from "@/lib/cloud-confessions/brevo";
import {
  FOLLOWUP_1_DELAY_MS,
  FOLLOWUP_2_DELAY_MS,
  INCOMPLETE_EMAIL_DELAY_MS,
  REMINDER_1_AT_ISO,
  REMINDER_2_AT_ISO,
  VISITED_EMAIL_DELAY_MS,
  addMs,
  type CloudCoffeeEmailJobType,
} from "@/lib/cloud-confessions/delays";
import {
  cancelCloudCoffeeEmailJobs,
  completeCloudCoffeeEmailJob,
  enqueueCloudCoffeeEmailJob,
  listDueCloudCoffeeEmailJobs,
  markCloudCoffeeInviteeInvited,
  type CloudCoffeeEmailJob,
} from "@/lib/cloud-confessions/email-queue";
import { moveCloudCoffeeContactToStage } from "@/lib/cloud-confessions/list-sync";
import {
  getCloudConfessionsQrImageUrl,
  getCloudConfessionsTicketUrl,
} from "@/lib/cloud-confessions/qr";
import {
  sendCloudCoffeeApprovedQrEmail,
  sendCloudCoffeeFollowUp1Email,
  sendCloudCoffeeFollowUp2Email,
  sendCloudCoffeeIncompleteEmail,
  sendCloudCoffeeInviteEmail,
  sendCloudCoffeeReminder1Email,
  sendCloudCoffeeReminder2Email,
  sendCloudCoffeeVisitedEmail,
} from "@/lib/cloud-confessions/transactional-emails";
import { buildSharedContactAttributes } from "@/lib/cloud-confessions/brevo";

const FUNNEL_FOLLOWUP_JOBS: CloudCoffeeEmailJobType[] = [
  "followup_1",
  "followup_2",
  "visited",
  "incomplete",
];

function contactStatus(contact: Awaited<ReturnType<typeof getCloudConfessionsContact>>): string {
  return String(contact?.attributes?.CC_EVENT_STATUS ?? "")
    .trim()
    .toLowerCase();
}

function contactName(contact: Awaited<ReturnType<typeof getCloudConfessionsContact>>): {
  firstName: string;
  lastName: string;
} {
  const attrs = contact?.attributes ?? {};
  return {
    firstName: String(attrs.NOMBRE ?? attrs.FIRSTNAME ?? "").trim(),
    lastName: String(attrs.APELLIDOS ?? attrs.LASTNAME ?? "").trim(),
  };
}

function hasRegisteredOrBeyond(status: string): boolean {
  return (
    status === "pending_approval" ||
    status === "approved" ||
    status === "rejected" ||
    status === "checked_in"
  );
}

export async function processCloudCoffeeInvite(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(input.email);
  const firstName = (input.firstName ?? "").trim() || "hola";
  const lastName = (input.lastName ?? "").trim();

  const moved = await moveCloudCoffeeContactToStage({
    email,
    stage: "invited",
    attributes: buildSharedContactAttributes({
      firstName,
      lastName,
      company: input.company,
      jobTitle: input.jobTitle,
    }),
  });

  if (!moved.ok) return { ok: false, error: moved.error };

  const emailResult = await sendCloudCoffeeInviteEmail({
    email,
    firstName,
    lastName,
  });

  if (!emailResult.sent) {
    return { ok: false, error: emailResult.error ?? "No se pudo enviar la invitación" };
  }

  await cancelCloudCoffeeEmailJobs(email, FUNNEL_FOLLOWUP_JOBS);
  await enqueueCloudCoffeeEmailJob({
    email,
    jobType: "followup_1",
    runAt: addMs(new Date(), FOLLOWUP_1_DELAY_MS),
  });
  await markCloudCoffeeInviteeInvited(email);

  return { ok: true };
}

export async function onCloudCoffeeVisit(input: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const contact = await getCloudConfessionsContact(email);
  const status = contactStatus(contact);
  if (hasRegisteredOrBeyond(status) || status === "incomplete") {
    return;
  }

  const firstName =
    (input.firstName ?? "").trim() || contactName(contact).firstName || "hola";
  const lastName =
    (input.lastName ?? "").trim() || contactName(contact).lastName;

  await moveCloudCoffeeContactToStage({
    email,
    stage: "visited",
    attributes: buildSharedContactAttributes({ firstName, lastName }),
  });

  await cancelCloudCoffeeEmailJobs(email, [
    "followup_1",
    "followup_2",
    "visited",
    "incomplete",
  ]);
  await enqueueCloudCoffeeEmailJob({
    email,
    jobType: "visited",
    runAt: addMs(new Date(), VISITED_EMAIL_DELAY_MS),
    payload: { firstName, lastName },
  });
}

export async function onCloudCoffeeIncomplete(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  telefono?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const contact = await getCloudConfessionsContact(email);
  const status = contactStatus(contact);
  if (hasRegisteredOrBeyond(status)) return;

  const names = contactName(contact);
  const firstName = (input.firstName ?? "").trim() || names.firstName || "hola";
  const lastName = (input.lastName ?? "").trim() || names.lastName;

  await moveCloudCoffeeContactToStage({
    email,
    stage: "incomplete",
    attributes: buildSharedContactAttributes({
      firstName,
      lastName,
      company: input.company,
      jobTitle: input.jobTitle,
      telefono: input.telefono,
    }),
  });

  await cancelCloudCoffeeEmailJobs(email, [
    "followup_1",
    "followup_2",
    "visited",
    "incomplete",
  ]);
  await enqueueCloudCoffeeEmailJob({
    email,
    jobType: "incomplete",
    runAt: addMs(new Date(), INCOMPLETE_EMAIL_DELAY_MS),
    payload: { firstName, lastName },
  });
}

/** Tras registro completo: cancela follow-ups del funnel. */
export async function onCloudCoffeeRegistered(email: string): Promise<void> {
  await cancelCloudCoffeeEmailJobs(normalizeEmail(email), FUNNEL_FOLLOWUP_JOBS);
}

export async function onCloudCoffeeApproved(input: {
  email: string;
  firstName: string;
  qrToken: string;
}): Promise<{ emailSent: boolean; error?: string }> {
  const email = normalizeEmail(input.email);
  await cancelCloudCoffeeEmailJobs(email, [
    ...FUNNEL_FOLLOWUP_JOBS,
    "reminder_1",
    "reminder_2",
  ]);

  const qrImageUrl = getCloudConfessionsQrImageUrl(input.qrToken);
  const ticketUrl = getCloudConfessionsTicketUrl(input.qrToken);

  const emailResult = await sendCloudCoffeeApprovedQrEmail({
    email,
    firstName: input.firstName,
    qrImageUrl,
    ticketUrl,
  });

  const now = Date.now();
  if (new Date(REMINDER_1_AT_ISO).getTime() > now) {
    await enqueueCloudCoffeeEmailJob({
      email,
      jobType: "reminder_1",
      runAt: new Date(REMINDER_1_AT_ISO).toISOString(),
      payload: { ticketUrl, firstName: input.firstName },
    });
  }
  if (new Date(REMINDER_2_AT_ISO).getTime() > now) {
    await enqueueCloudCoffeeEmailJob({
      email,
      jobType: "reminder_2",
      runAt: new Date(REMINDER_2_AT_ISO).toISOString(),
      payload: {
        ticketUrl,
        qrImageUrl,
        firstName: input.firstName,
      },
    });
  }

  return {
    emailSent: emailResult.sent,
    error: emailResult.error,
  };
}

function parsePayload(job: CloudCoffeeEmailJob): Record<string, string> {
  if (!job.payload) return {};
  try {
    return JSON.parse(job.payload) as Record<string, string>;
  } catch {
    return {};
  }
}

async function processOneJob(job: CloudCoffeeEmailJob): Promise<void> {
  const email = normalizeEmail(job.email);
  const contact = await getCloudConfessionsContact(email);
  const status = contactStatus(contact);
  const names = contactName(contact);
  const payload = parsePayload(job);
  const firstName = payload.firstName || names.firstName || "hola";
  const lastName = payload.lastName || names.lastName;

  if (job.jobType === "followup_1") {
    if (status !== "invited" && status !== "") {
      await completeCloudCoffeeEmailJob(job.id, { status: "cancelled" });
      return;
    }
    const result = await sendCloudCoffeeFollowUp1Email({
      email,
      firstName,
      lastName,
    });
    if (!result.sent) {
      await completeCloudCoffeeEmailJob(job.id, {
        status: "failed",
        error: result.error,
      });
      return;
    }
    await enqueueCloudCoffeeEmailJob({
      email,
      jobType: "followup_2",
      runAt: addMs(new Date(), FOLLOWUP_2_DELAY_MS),
      payload: { firstName, lastName },
    });
    await completeCloudCoffeeEmailJob(job.id, { status: "done" });
    return;
  }

  if (job.jobType === "visited") {
    if (status !== "visited") {
      await completeCloudCoffeeEmailJob(job.id, { status: "cancelled" });
      return;
    }
    const result = await sendCloudCoffeeVisitedEmail({
      email,
      firstName,
      lastName,
    });
    if (!result.sent) {
      await completeCloudCoffeeEmailJob(job.id, {
        status: "failed",
        error: result.error,
      });
      return;
    }
    await enqueueCloudCoffeeEmailJob({
      email,
      jobType: "followup_2",
      runAt: addMs(new Date(), FOLLOWUP_2_DELAY_MS),
      payload: { firstName, lastName },
    });
    await completeCloudCoffeeEmailJob(job.id, { status: "done" });
    return;
  }

  if (job.jobType === "incomplete") {
    if (status !== "incomplete") {
      await completeCloudCoffeeEmailJob(job.id, { status: "cancelled" });
      return;
    }
    const result = await sendCloudCoffeeIncompleteEmail({
      email,
      firstName,
      lastName,
    });
    if (!result.sent) {
      await completeCloudCoffeeEmailJob(job.id, {
        status: "failed",
        error: result.error,
      });
      return;
    }
    await enqueueCloudCoffeeEmailJob({
      email,
      jobType: "followup_2",
      runAt: addMs(new Date(), FOLLOWUP_2_DELAY_MS),
      payload: { firstName, lastName },
    });
    await completeCloudCoffeeEmailJob(job.id, { status: "done" });
    return;
  }

  if (job.jobType === "followup_2") {
    if (hasRegisteredOrBeyond(status)) {
      await completeCloudCoffeeEmailJob(job.id, { status: "cancelled" });
      return;
    }
    // Solo si sigue en invited / visited / incomplete (no hizo nada definitivo).
    if (
      status !== "invited" &&
      status !== "visited" &&
      status !== "incomplete" &&
      status !== ""
    ) {
      await completeCloudCoffeeEmailJob(job.id, { status: "cancelled" });
      return;
    }
    const result = await sendCloudCoffeeFollowUp2Email({
      email,
      firstName,
      lastName,
    });
    if (!result.sent) {
      await completeCloudCoffeeEmailJob(job.id, {
        status: "failed",
        error: result.error,
      });
      return;
    }
    await completeCloudCoffeeEmailJob(job.id, { status: "done" });
    return;
  }

  if (job.jobType === "reminder_1" || job.jobType === "reminder_2") {
    if (status !== "approved") {
      await completeCloudCoffeeEmailJob(job.id, { status: "cancelled" });
      return;
    }
    const ticketUrl =
      payload.ticketUrl ||
      String(contact?.attributes?.CC_EVENT_CHECKIN_URL ?? "");
    const qrImageUrl =
      payload.qrImageUrl ||
      String(contact?.attributes?.CC_EVENT_QR_URL ?? "");

    const result =
      job.jobType === "reminder_1"
        ? await sendCloudCoffeeReminder1Email({
            email,
            firstName,
            ticketUrl,
          })
        : await sendCloudCoffeeReminder2Email({
            email,
            firstName,
            ticketUrl,
            qrImageUrl,
          });

    if (!result.sent) {
      await completeCloudCoffeeEmailJob(job.id, {
        status: "failed",
        error: result.error,
      });
      return;
    }
    await completeCloudCoffeeEmailJob(job.id, { status: "done" });
  }
}

export async function processDueCloudCoffeeEmailJobs(): Promise<{
  processed: number;
  errors: string[];
}> {
  const jobs = await listDueCloudCoffeeEmailJobs();
  const errors: string[] = [];
  let processed = 0;

  for (const job of jobs) {
    try {
      await processOneJob(job);
      processed += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error procesando job";
      errors.push(`${job.id}: ${message}`);
      try {
        await completeCloudCoffeeEmailJob(job.id, {
          status: "failed",
          error: message,
        });
      } catch {
        // ignore
      }
    }
  }

  return { processed, errors };
}
