import {
  getBrevoSender,
  sendTransactionalEmail,
} from "@/lib/brevo";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSolicitudRecibidaHtml(firstName: string): string {
  const name = escapeHtml(firstName.trim() || "hola");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Recibimos tu solicitud para Cloud &amp; Coffee</title>
</head>
<body style="margin:0;background:#f4f4f5;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Te confirmaremos tu cupo para Cloud & Coffee el 30 de julio.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#151518;border-radius:24px;">
        <tr><td style="padding:28px 36px 20px;">
          <img src="https://www.c4c7ops.co/logo-c4c7ops-white.png" width="190" alt="C4c7Ops" style="display:block;width:190px;max-width:100%;height:auto;border:0;">
        </td></tr>
        <tr><td style="border:0;background:#151518;padding:28px 36px 40px;text-align:center;">
          <div style="display:inline-block;width:58px;height:58px;border-radius:50%;background:#252d15;color:#9ab83a;font-size:30px;line-height:58px;">✓</div>
          <p style="margin:24px 0 18px;color:#9ab83a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Solicitud recibida</p>
          <h1 style="margin:0 0 22px;font-size:34px;line-height:1.12;letter-spacing:-1.3px;">Recibimos tu solicitud</h1>
          <p style="margin:0 0 18px;color:#d8d8da;font-size:17px;line-height:1.7;">Hola ${name},</p>
          <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Recibimos tu solicitud para Cloud &amp; Coffee. Te confirmaremos el cupo pronto.</p>
          <p style="margin:0 0 18px;color:#a9a9ad;font-size:16px;line-height:1.7;">Mientras tanto no necesitas hacer nada más. Si te confirmamos el cupo, te enviamos la entrada.</p>
          <div style="border:1px solid #2a2b2d;border-radius:16px;background:#0f0f11;padding:18px;color:#fff;font-size:14px;line-height:1.8;">Jueves 30 de julio · 7:00 – 9:00 a. m.<br>Cerca al Ágora<br><span style="color:#a9a9ad;font-size:13px;">La dirección exacta se comparte al confirmar tu cupo.</span></div>
        </td></tr>
        <tr><td style="padding:8px 36px 28px;color:#77777c;font-size:11px;line-height:1.6;">Cloud &amp; Coffee · Coffee · Conversations · Cloud<br>Hosted by C4c7Ops</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSolicitudRecibidaEmail(input: {
  email: string;
  firstName: string;
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
    to: [{ email: input.email, name: input.firstName }],
    subject: "Listo: recibimos tu solicitud",
    htmlContent: buildSolicitudRecibidaHtml(input.firstName),
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
