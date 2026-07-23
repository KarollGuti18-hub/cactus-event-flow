import {
  getBrevoSender,
  sendTransactionalEmail,
} from "@/lib/brevo";
import { getAppUrl } from "@/lib/app-url";
import { cloudConfessionsEmailConfig } from "@/lib/cloud-confessions/email-copy";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapEmail(input: {
  preview: string;
  title: string;
  bodyHtml: string;
  /** Absolute URL to hero image (e.g. cups). Shown under the logo when set. */
  heroImageUrl?: string;
  heroImageAlt?: string;
}): string {
  const hero = input.heroImageUrl
    ? `<tr><td style="padding:0 0 8px;">
          <img src="${escapeHtml(input.heroImageUrl)}" width="620" alt="${escapeHtml(input.heroImageAlt ?? "Cloud & Coffee")}" style="display:block;width:100%;max-width:620px;height:auto;border:0;">
        </td></tr>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;background:#f4f4f5;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#151518;border-radius:24px;">
        <tr><td style="padding:28px 36px 20px;">
          <img src="https://www.c4c7ops.co/logo-c4c7ops-white.png" width="190" alt="C4c7Ops" style="display:block;width:190px;max-width:100%;height:auto;border:0;">
        </td></tr>
        ${hero}
        <tr><td style="border:0;background:#151518;padding:28px 36px 40px;">
          ${input.bodyHtml}
        </td></tr>
        <tr><td style="padding:8px 36px 28px;color:#77777c;font-size:11px;line-height:1.6;">Cloud &amp; Coffee · Coffee · Conversations · Cloud<br>Hosted by C4c7Ops</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const INVITE_HERO_IMAGE_URL = "https://www.c4c7ops.co/cloud-and-coffee-email-hero.jpg";

function landingUrl(firstName: string, lastName: string, email: string): string {
  const base = `${getAppUrl()}/cloud-and-coffee`;
  const params = new URLSearchParams({
    email,
    firstname: firstName,
    lastname: lastName,
  });
  return `${base}?${params.toString()}`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:24px auto 0;"><tr><td align="center" style="border-radius:999px;background:#7f9b28;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:16px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(label)} →</a></td></tr></table>`;
}

async function send(input: {
  email: string;
  name: string;
  subject: string;
  preview: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const sender = getBrevoSender();
  if (!sender) {
    return {
      sent: false,
      error: "Faltan BREVO_SENDER_EMAIL / BREVO_SENDER_NAME en Vercel",
    };
  }

  const response = await sendTransactionalEmail({
    sender,
    to: [{ email: input.email, name: input.name }],
    subject: input.subject,
    htmlContent: input.html,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return {
      sent: false,
      error:
        typeof error.message === "string"
          ? error.message
          : `Brevo transactional falló (${response.status})`,
    };
  }

  return { sent: true };
}

export async function sendCloudCoffeeInviteEmail(input: {
  email: string;
  firstName: string;
  lastName?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const href = landingUrl(input.firstName, input.lastName ?? "", input.email);
  const subject = `${name}, estás invitad@ a Cloud & Coffee`;
  const preview =
    "Café y desayuno con C4c7Ops · 30 jul · 7:00–9:00 a. m. · cerca al Ágora.";
  const html = wrapEmail({
    preview,
    title: subject,
    heroImageUrl: INVITE_HERO_IMAGE_URL,
    heroImageAlt: "Cloud & Coffee · tazas C4c7Ops",
    bodyHtml: `
      <p style="margin:0 0 18px;color:#9ab83a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Antes del Summit · Por invitación</p>
      <h1 style="margin:0 0 22px;font-size:34px;line-height:1.12;letter-spacing:-1.3px;color:#fff;">${escapeHtml(name)}, estás invitad@ a<br><span style="color:#9ab83a;">Cloud &amp; Coffee</span></h1>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Antes del AWS Summit Bogotá te invitamos: tómate un café con C4c7Ops, desayuna y llega con toda la energía al Summit.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Será el <strong style="color:#fff;">jueves 30 de julio</strong>, cerca al Ágora, de <strong style="color:#fff;">7:00 a. m. a 9:00 a. m.</strong> La dirección exacta te la compartimos al confirmar tu cupo.</p>
      ${ctaButton(href, "Solicitar mi cupo")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeFollowUp1Email(input: {
  email: string;
  firstName: string;
  lastName?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const href = landingUrl(input.firstName, input.lastName ?? "", input.email);
  const subject = "¿Café el 30? Quedan pocos cupos";
  const preview =
    "Cloud & Coffee con C4c7Ops · desayuna y llega con energía al Summit.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 22px;font-size:32px;line-height:1.15;color:#fff;">¿Te tomas un café con nosotros?</h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Quizá se te pasó la invitación a Cloud &amp; Coffee.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;"><strong style="color:#fff;">30 de julio · 7:00 – 9:00 a. m. · Cerca al Ágora</strong><br>Tómate un café con C4c7Ops, desayuna y llega con toda la energía al Summit.</p>
      ${ctaButton(href, "Ver la invitación")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeFollowUp2Email(input: {
  email: string;
  firstName: string;
  lastName?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const href = landingUrl(input.firstName, input.lastName ?? "", input.email);
  const subject = "Último aviso: Cloud & Coffee el 30";
  const preview =
    "Cupos limitados · café, desayuno y toda la energía para el Summit.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 22px;font-size:32px;line-height:1.15;color:#fff;">Último aviso</h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Este es un último aviso para Cloud &amp; Coffee.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">El jueves 30 de julio, cerca al Ágora, de 7:00 a. m. a 9:00 a. m.: tómate un café con C4c7Ops, desayuna y llega con toda la energía al Summit.</p>
      ${ctaButton(href, "Solicitar mi cupo")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeVisitedEmail(input: {
  email: string;
  firstName: string;
  lastName?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const href = landingUrl(input.firstName, input.lastName ?? "", input.email);
  const subject = "Te faltó un paso para Cloud & Coffee";
  const preview = "Entraste a la página · completa tu solicitud en un minuto.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 22px;font-size:32px;line-height:1.15;color:#fff;">¿Terminamos tu solicitud?</h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Vimos que entraste a la página de Cloud &amp; Coffee.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Si todavía quieres unirte el 30 de julio — café, desayuno y toda la energía para el Summit —, solo falta completar la solicitud.</p>
      ${ctaButton(href, "Continuar mi solicitud")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeIncompleteEmail(input: {
  email: string;
  firstName: string;
  lastName?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const href = landingUrl(input.firstName, input.lastName ?? "", input.email);
  const subject = "Tu solicitud de Cloud & Coffee quedó a medias";
  const preview = "30 jul · 7:00–9:00 a. m. · cerca al Ágora. Termínala aquí.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 22px;font-size:32px;line-height:1.15;color:#fff;">Te faltó un paso</h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Empezaste a llenar tu solicitud para Cloud &amp; Coffee, pero aún no quedó completa.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Si quieres tu lugar el 30 de julio (7:00 – 9:00 a. m., cerca al Ágora), vuelve y termina el formulario.</p>
      ${ctaButton(href, "Completar solicitud")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeApprovedQrEmail(input: {
  email: string;
  firstName: string;
  qrImageUrl: string;
  ticketUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const subject = "Tu cupo está listo · aquí va tu QR";
  const preview =
    "Antes, un café · 30 jul · 7:00–9:00 a. m. Guarda esta entrada.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <p style="margin:0 0 18px;color:#9ab83a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;">Cupo aprobado</p>
      <h1 style="margin:0 0 22px;font-size:34px;line-height:1.12;letter-spacing:-1.3px;color:#fff;text-align:center;">Nos vemos en<br><span style="color:#9ab83a;">Cloud &amp; Coffee</span></h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;text-align:center;">Hola ${escapeHtml(name)}, tu cupo fue confirmado.</p>
      <div style="margin:0 0 28px;border:1px solid #2a2b2d;border-radius:16px;background:#0f0f11;padding:18px;color:#fff;font-size:14px;line-height:1.8;text-align:center;">Jueves 30 de julio · 7:00 – 9:00 a. m.<br>${escapeHtml(cloudConfessionsEmailConfig.exactLocationLabel)}<br><span style="color:#a9a9ad;font-size:13px;">Cerca al Ágora</span></div>
      <p style="margin:0 0 16px;color:#a9a9ad;font-size:14px;line-height:1.7;text-align:center;">Presenta este código al llegar:</p>
      <div style="text-align:center;margin:0 0 24px;"><div style="display:inline-block;border-radius:18px;background:#fff;padding:14px;"><img src="${escapeHtml(input.qrImageUrl)}" width="220" height="220" alt="Código QR de entrada" style="display:block;width:220px;max-width:100%;height:auto;border:0;"></div></div>
      <div style="text-align:center;">${ctaButton(input.ticketUrl, "Ver mi entrada")}</div>
      <p style="margin:18px 0 0;color:#77777c;font-size:13px;line-height:1.7;text-align:center;">También recibirás una invitación de Google Calendar.</p>
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeReminder1Email(input: {
  email: string;
  firstName: string;
  ticketUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const subject = "Te esperamos el jueves · Cloud & Coffee";
  const preview = "30 jul · Antes, un café · ten tu QR a la mano.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 22px;font-size:32px;line-height:1.15;color:#fff;">Te esperamos el jueves</h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Recordatorio de tu cupo confirmado para Cloud &amp; Coffee.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Fecha: jueves 30 de julio<br>Horario: 7:00 a. m. – 9:00 a. m.<br>Lugar: ${escapeHtml(cloudConfessionsEmailConfig.exactLocationLabel)}</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Llega con tu QR. Café, desayuno y luego el Summit con toda la energía.</p>
      ${ctaButton(input.ticketUrl, "Abrir mi entrada")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}

export async function sendCloudCoffeeReminder2Email(input: {
  email: string;
  firstName: string;
  ticketUrl: string;
  qrImageUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const name = input.firstName.trim() || "hola";
  const subject = "Mañana es Cloud & Coffee";
  const preview = "7:00–9:00 a. m. · Antes, un café · llega con tu QR.";
  const html = wrapEmail({
    preview,
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 22px;font-size:32px;line-height:1.15;color:#fff;">Mañana nos vemos</h1>
      <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Mañana es Cloud &amp; Coffee.</p>
      <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Nos vemos en ${escapeHtml(cloudConfessionsEmailConfig.exactLocationLabel)}, de 7:00 a. m. a 9:00 a. m. Café, desayuno y toda la energía para el Summit.</p>
      <div style="text-align:center;margin:0 0 24px;"><div style="display:inline-block;border-radius:18px;background:#fff;padding:14px;"><img src="${escapeHtml(input.qrImageUrl)}" width="200" height="200" alt="Código QR" style="display:block;width:200px;max-width:100%;height:auto;border:0;"></div></div>
      ${ctaButton(input.ticketUrl, "Ver mi entrada")}
    `,
  });

  return send({ email: input.email, name, subject, preview, html });
}
