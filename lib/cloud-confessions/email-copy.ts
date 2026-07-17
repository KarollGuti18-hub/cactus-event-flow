/**
 * Copy de correos Cloud Confession Breakfast para Brevo.
 *
 * Listas:
 * 11 · Invitados
 * 12 · Visitó landing
 * 13 · Registro incompleto
 * 14 · Registros (pendiente aprobación)
 * 15 · Aprobados
 *
 * Variables Brevo útiles:
 * {{ contact.NOMBRE }}
 * {{ contact.APELLIDOS }}
 * {{ contact.EVENT_COMPANY }}
 * {{ contact.CC_EVENT_QR_URL }}
 * {{ contact.CC_EVENT_CHECKIN_URL }}
 */

export const cloudConfessionsEmailConfig = {
  eventName: "Cloud Confession Breakfast",
  dateLabel: "jueves 30 de julio",
  timeLabel: "7:00 a. m.",
  publicLocationLabel: "A pocos pasos del Ágora",
  exactLocationLabel: "Brumo Bistro",
  landingUrl: "https://www.c4c7ops.co/cloud-confessions",
  personalizedLandingUrl:
    "https://www.c4c7ops.co/cloud-confessions?email={{ contact.EMAIL }}&firstname={{ contact.NOMBRE }}&lastname={{ contact.APELLIDOS }}",
  organizer: "C4C7OPS",
} as const;

export interface CloudConfessionsEmailTemplate {
  id: string;
  name: string;
  brevoListId: 11 | 12 | 13 | 14 | 15;
  trigger: string;
  timing: string;
  stopConditions: string[];
  subject: string;
  previewText: string;
  body: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  notes?: string[];
}

export const cloudConfessionsEmails: CloudConfessionsEmailTemplate[] = [
  {
    id: "cc-invite-1",
    name: "Invitación",
    brevoListId: 11,
    trigger: "Contacto entra a lista 11 (Invitados)",
    timing: "Inmediato",
    stopConditions: [
      "Si abre el correo, no enviar follow-ups de no apertura",
      "Si entra a lista 14 o 15, salir de esta secuencia",
    ],
    subject: "Estás invitado a Cloud Confession Breakfast",
    previewText: "Un desayuno privado antes del AWS Summit Bogotá.",
    ctaLabel: "Solicitar mi cupo",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Te invitamos a Cloud Confession Breakfast, un desayuno privado organizado por C4C7OPS antes del AWS Summit Bogotá.",
      "La idea es empezar el día con buena comida, conversaciones reales y un ambiente relajado, antes de entrar a una jornada larga e intensa.",
      "Será el jueves 30 de julio a las 7:00 a. m., a pocos pasos del Ágora. La ubicación exacta se compartirá al confirmar tu cupo.",
      "No es una conferencia ni tendrá presentaciones. Es un espacio cercano para desayunar bien, hacer networking y llegar al Summit con nuevas conexiones y mejor energía.",
      "Los cupos son limitados y la asistencia se confirma después de tu solicitud.",
    ],
  },
  {
    id: "cc-invite-followup-1",
    name: "Follow-up 1 · No abrió la invitación",
    brevoListId: 11,
    trigger: "Sigue en lista 11 y no abrió el correo de invitación",
    timing: "2 días después de la invitación",
    stopConditions: [
      "Si abrió el correo de invitación",
      "Si visitó la landing (lista 12)",
      "Si está en lista 13, 14 o 15",
    ],
    subject: "¿Viste tu invitación a Cloud Confession?",
    previewText: "Todavía hay cupos para el desayuno del 30 de julio.",
    ctaLabel: "Ver la invitación",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Te escribimos de nuevo porque quizá se te pasó la invitación a Cloud Confession Breakfast.",
      "Es un desayuno privado el jueves 30 de julio a las 7:00 a. m., a pocos pasos del Ágora, antes del AWS Summit Bogotá.",
      "Buena comida, conversaciones reales y un espacio cercano para conectar con personas de infraestructura, cloud, DevOps, SRE y tecnología.",
      "Si te interesa, puedes solicitar tu cupo desde aquí.",
    ],
  },
  {
    id: "cc-invite-followup-2",
    name: "Follow-up 2 · No abrió la invitación",
    brevoListId: 11,
    trigger: "Sigue en lista 11 y no abrió ni el correo 1 ni el follow-up 1",
    timing: "4 días después de la invitación (2 días después del follow-up 1)",
    stopConditions: [
      "Si abrió alguno de los correos previos",
      "Si visitó la landing (lista 12)",
      "Si está en lista 13, 14 o 15",
    ],
    subject: "Último aviso: Cloud Confession Breakfast",
    previewText: "Cupos limitados · 30 de julio · 7:00 a. m.",
    ctaLabel: "Solicitar mi cupo",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Este es un último recordatorio de tu invitación a Cloud Confession Breakfast.",
      "El desayuno es el jueves 30 de julio a las 7:00 a. m., a pocos pasos del Ágora, justo antes del AWS Summit.",
      "Si quieres unirte, solicita tu cupo pronto: los lugares son limitados y la confirmación es por aprobación.",
    ],
  },
  {
    id: "cc-visited",
    name: "Visitó la landing",
    brevoListId: 12,
    trigger: "Contacto entra a lista 12 (Visitó landing)",
    timing: "1 hora después de la visita, si aún no está en 13, 14 o 15",
    stopConditions: [
      "Si ya está en lista 13, 14 o 15",
      "Si completa el registro antes del envío",
    ],
    subject: "¿Te ayudamos a completar tu solicitud?",
    previewText: "Cloud Confession Breakfast · cupos limitados",
    ctaLabel: "Continuar mi solicitud",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Vimos que entraste a la página de Cloud Confession Breakfast.",
      "Si todavía quieres unirte al desayuno del 30 de julio, solo falta completar la solicitud.",
      "Es un espacio privado, con buena comida y conversaciones reales antes del AWS Summit Bogotá.",
      "Cuando envíes tus datos, nuestro equipo revisará tu solicitud y te confirmará el cupo.",
    ],
    notes: [
      "Ideal para quienes llegaron por el link personalizado y no enviaron el formulario.",
    ],
  },
  {
    id: "cc-incomplete",
    name: "Registro incompleto",
    brevoListId: 13,
    trigger: "Contacto entra a lista 13 (Registro incompleto)",
    timing: "30–60 minutos después, si no pasó a lista 14",
    stopConditions: [
      "Si entra a lista 14 o 15",
      "Si completa el formulario antes del envío",
    ],
    subject: "Te faltó un paso para solicitar tu cupo",
    previewText: "Tu solicitud de Cloud Confession quedó a medias.",
    ctaLabel: "Completar solicitud",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Empezaste a llenar tu solicitud para Cloud Confession Breakfast, pero aún no quedó completa.",
      "Si quieres reservar tu lugar en el desayuno del 30 de julio, vuelve y termina el formulario.",
      "Solo te tomará un minuto. Después nuestro equipo revisará tu solicitud y te confirmará si hay cupo.",
    ],
  },
  {
    id: "cc-registered",
    name: "Recibimos tu solicitud",
    brevoListId: 14,
    trigger: "Contacto entra a lista 14 (Registros)",
    timing: "Inmediato",
    stopConditions: ["Ninguno (correo de confirmación de recepción)"],
    subject: "Recibimos tu solicitud para Cloud Confession",
    previewText: "Estamos revisando tu cupo para el 30 de julio.",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Recibimos tu solicitud para Cloud Confession Breakfast.",
      "Nuestro equipo revisará tu registro y te confirmará el cupo próximamente.",
      "El desayuno es el jueves 30 de julio a las 7:00 a. m., a pocos pasos del Ágora. La ubicación exacta se compartirá si tu cupo es aprobado.",
      "Mientras tanto, no necesitas hacer nada más. Si tu cupo es aprobado, te enviaremos la confirmación con tu entrada.",
    ],
    notes: [
      "Alinear con confirmationMessage de la landing.",
    ],
  },
  {
    id: "cc-approved-qr",
    name: "Aprobado + QR",
    brevoListId: 15,
    trigger: "Contacto entra a lista 15 (Aprobados)",
    timing: "Inmediato",
    stopConditions: ["Ninguno"],
    subject: "Tu cupo fue aprobado · Cloud Confession Breakfast",
    previewText: "Aquí tienes tu entrada para el 30 de julio.",
    ctaLabel: "Ver mi entrada",
    ctaUrl: "{{ contact.CC_EVENT_CHECKIN_URL }}",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Tu cupo para Cloud Confession Breakfast fue aprobado.",
      "Te esperamos el jueves 30 de julio a las 7:00 a. m. en Brumo Bistro, a pocos pasos del Ágora.",
      "Guarda este correo: aquí está tu entrada con código QR.",
      "También te llegará una invitación de Google Calendar para agregar el evento.",
      "Presenta tu QR al llegar. Si necesitas abrirlo después, usa el botón de abajo.",
    ],
    notes: [
      "Insertar imagen del QR con {{ contact.CC_EVENT_QR_URL }}",
      "CTA principal a {{ contact.CC_EVENT_CHECKIN_URL }}",
      "Si Brevo no renderiza bien la imagen remota, usar el link del ticket como respaldo",
    ],
  },
  {
    id: "cc-reminder-1",
    name: "Recordatorio 1 · Aprobados",
    brevoListId: 15,
    trigger: "Está en lista 15 y CC_EVENT_STATUS = approved",
    timing: "2 días antes del evento (28 de julio)",
    stopConditions: [
      "Si CC_EVENT_STATUS = checked_in",
      "Si fue rechazado o removido de lista 15",
    ],
    subject: "Te esperamos el jueves · Cloud Confession",
    previewText: "30 de julio · 7:00 a. m. · Brumo Bistro",
    ctaLabel: "Abrir mi entrada",
    ctaUrl: "{{ contact.CC_EVENT_CHECKIN_URL }}",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Este es un recordatorio de tu cupo confirmado para Cloud Confession Breakfast.",
      "Fecha: jueves 30 de julio",
      "Hora: 7:00 a. m.",
      "Lugar: Brumo Bistro · a pocos pasos del Ágora",
      "Llega con tu QR a la mano. Vamos a desayunar bien, conversar sin formalidades y empezar el AWS Summit con buena energía.",
    ],
  },
  {
    id: "cc-reminder-2",
    name: "Recordatorio 2 · Aprobados",
    brevoListId: 15,
    trigger: "Está en lista 15 y CC_EVENT_STATUS = approved",
    timing: "1 día antes del evento, a las 5:00 p. m. (29 de julio)",
    stopConditions: [
      "Si CC_EVENT_STATUS = checked_in",
      "Si fue rechazado o removido de lista 15",
    ],
    subject: "Mañana nos vemos en Cloud Confession",
    previewText: "7:00 a. m. · Brumo Bistro · ten tu QR listo",
    ctaLabel: "Ver mi entrada",
    ctaUrl: "{{ contact.CC_EVENT_CHECKIN_URL }}",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Mañana es Cloud Confession Breakfast.",
      "Nos vemos a las 7:00 a. m. en Brumo Bistro, a pocos pasos del Ágora.",
      "Ten tu código QR listo para presentarlo al llegar.",
      "Mañana desayunamos, conversamos y llegamos al Summit con el día bien empezado.",
    ],
    notes: [
      "Insertar imagen del QR con {{ contact.CC_EVENT_QR_URL }}",
    ],
  },
];
