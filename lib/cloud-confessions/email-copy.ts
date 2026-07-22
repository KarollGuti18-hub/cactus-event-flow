/**
 * Copy de correos Cloud & Coffee para Brevo.
 *
 * Remitente: mail@news.c4c7ops.co
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
  eventName: "Cloud & Coffee",
  tagline: "Coffee · Conversations · Cloud",
  hostedBy: "Hosted by C4c7Ops",
  dateLabel: "jueves 30 de julio",
  timeLabel: "7:00 – 9:00 a. m.",
  publicLocationLabel: "Cerca al Ágora",
  exactLocationLabel: "Antes, un café · Cl. 24d #40-34, Bogotá",
  landingUrl: "https://www.c4c7ops.co/cloud-and-coffee",
  personalizedLandingUrl:
    "https://www.c4c7ops.co/cloud-and-coffee?email={{ contact.EMAIL }}&firstname={{ contact.NOMBRE }}&lastname={{ contact.APELLIDOS }}",
  organizer: "C4c7Ops",
  senderEmail: "mail@news.c4c7ops.co",
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
    subject: "{{ contact.NOMBRE }}, estás invitado a Cloud & Coffee",
    previewText: "Café y desayuno con C4c7Ops · 30 jul · 7:00–9:00 a. m. · cerca al Ágora.",
    ctaLabel: "Solicitar mi cupo",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Antes del AWS Summit Bogotá queremos invitarte a Cloud & Coffee: tómate un café con C4c7Ops, desayuna y llega con toda la energía al Summit.",
      "Coffee · Conversations · Cloud.",
      "Será el jueves 30 de julio, cerca al Ágora, de 7:00 a. m. a 9:00 a. m. La dirección exacta te la compartimos al confirmar tu cupo.",
      "Los cupos son limitados y la asistencia se confirma después de tu solicitud.",
    ],
    notes: [
      "Usar imagen centrada de las tazas (cloud-and-coffee-email-hero.jpg)",
      "Remitente: mail@news.c4c7ops.co",
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
    subject: "¿Café el 30? Todavía hay cupo",
    previewText: "Cloud & Coffee con C4c7Ops · desayuna y llega con energía al Summit.",
    ctaLabel: "Ver la invitación",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Quizá se te pasó la invitación a Cloud & Coffee.",
      "Es un encuentro el jueves 30 de julio, cerca al Ágora: café, desayuno y gente de cloud, de 7:00 a. m. a 9:00 a. m. Tómate un café con C4c7Ops y llega con toda la energía al Summit.",
      "Si te late, solicita tu cupo desde aquí.",
    ],
  },
  {
    id: "cc-invite-followup-2",
    name: "Follow-up 2 · Último aviso",
    brevoListId: 11,
    trigger:
      "Fallidos: no abrió, visitó sin registrar, o registro incompleto sin completar",
    timing: "Insistencia final según automatización",
    stopConditions: [
      "Si abrió alguno de los correos previos y ya registró",
      "Si está en lista 14 o 15",
    ],
    subject: "Último aviso: Cloud & Coffee el 30",
    previewText: "Cupos limitados · café, desayuno y toda la energía para el Summit.",
    ctaLabel: "Solicitar mi cupo",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Este es un último aviso para Cloud & Coffee.",
      "El jueves 30 de julio, cerca al Ágora, de 7:00 a. m. a 9:00 a. m.: tómate un café con C4c7Ops, desayuna y llega con toda la energía al Summit.",
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
    subject: "Te faltó un paso para Cloud & Coffee",
    previewText: "Entraste a la página · completa tu solicitud en un minuto.",
    ctaLabel: "Continuar mi solicitud",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Vimos que entraste a la página de Cloud & Coffee.",
      "Si todavía quieres unirte el 30 de julio — café, desayuno y toda la energía para el Summit —, solo falta completar la solicitud.",
      "Cuando envíes tus datos, revisamos tu cupo y te confirmamos.",
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
    subject: "Tu solicitud de Cloud & Coffee quedó a medias",
    previewText: "30 jul · 7:00–9:00 a. m. · cerca al Ágora. Termínala aquí.",
    ctaLabel: "Completar solicitud",
    ctaUrl: cloudConfessionsEmailConfig.personalizedLandingUrl,
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Empezaste a llenar tu solicitud para Cloud & Coffee, pero aún no quedó completa.",
      "Si quieres tu lugar el 30 de julio (7:00 – 9:00 a. m., cerca al Ágora), vuelve y termina el formulario.",
      "Solo te toma un minuto. Después revisamos tu solicitud y te confirmamos.",
    ],
  },
  {
    id: "cc-registered",
    name: "Recibimos tu solicitud",
    brevoListId: 14,
    trigger: "Contacto entra a lista 14 (Registros)",
    timing: "Inmediato",
    stopConditions: ["Ninguno (correo de confirmación de recepción)"],
    subject: "Listo: recibimos tu solicitud",
    previewText: "Estamos revisando tu cupo para Cloud & Coffee el 30 de julio.",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Recibimos tu solicitud para Cloud & Coffee.",
      "Nuestro equipo la revisará y te confirmará el cupo próximamente.",
      "Será el jueves 30 de julio, cerca al Ágora, de 7:00 a. m. a 9:00 a. m. La dirección exacta se comparte si tu cupo es aprobado.",
      "Mientras tanto no necesitas hacer nada más. Si te aprobamos, te enviamos la confirmación con tu entrada.",
    ],
  },
  {
    id: "cc-approved-qr",
    name: "Aprobado + QR",
    brevoListId: 15,
    trigger: "Contacto entra a lista 15 (Aprobados)",
    timing: "Inmediato",
    stopConditions: ["Ninguno"],
    subject: "Tu cupo está listo · aquí va tu QR",
    previewText: "Antes, un café · 30 jul · 7:00–9:00 a. m. Guarda esta entrada.",
    ctaLabel: "Ver mi entrada",
    ctaUrl: "{{ contact.CC_EVENT_CHECKIN_URL }}",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Tu cupo para Cloud & Coffee fue aprobado.",
      "Te esperamos el jueves 30 de julio en Antes, un café · Cl. 24d #40-34, Bogotá (cerca al Ágora), de 7:00 a. m. a 9:00 a. m. Café, desayuno y toda la energía para el Summit.",
      "Guarda este correo: aquí está tu entrada con código QR.",
      "También te llegará una invitación de Google Calendar.",
      "Presenta tu QR al llegar. Si necesitas abrirlo después, usa el botón de abajo.",
    ],
    notes: [
      "Insertar imagen del QR con {{ contact.CC_EVENT_QR_URL }}",
      "CTA principal a {{ contact.CC_EVENT_CHECKIN_URL }}",
      "Remitente: mail@news.c4c7ops.co",
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
    subject: "Te esperamos el jueves · Cloud & Coffee",
    previewText: "30 jul · Antes, un café · ten tu QR a la mano.",
    ctaLabel: "Abrir mi entrada",
    ctaUrl: "{{ contact.CC_EVENT_CHECKIN_URL }}",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Recordatorio de tu cupo confirmado para Cloud & Coffee.",
      "Fecha: jueves 30 de julio",
      "Horario: 7:00 a. m. – 9:00 a. m.",
      "Lugar: Antes, un café · Cl. 24d #40-34, Bogotá",
      "Llega con tu QR. Café, desayuno y luego el Summit con toda la energía.",
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
    subject: "Mañana es Cloud & Coffee",
    previewText: "7:00–9:00 a. m. · Antes, un café · llega con tu QR.",
    ctaLabel: "Ver mi entrada",
    ctaUrl: "{{ contact.CC_EVENT_CHECKIN_URL }}",
    body: [
      "Hola {{ contact.NOMBRE }},",
      "Mañana es Cloud & Coffee.",
      "Nos vemos en Antes, un café · Cl. 24d #40-34, Bogotá, de 7:00 a. m. a 9:00 a. m. Café, desayuno y toda la energía para el Summit.",
      "Ten tu código QR listo al llegar.",
      "Mañana café, conversación y Summit con el día bien empezado.",
    ],
    notes: [
      "Insertar imagen del QR con {{ contact.CC_EVENT_QR_URL }}",
    ],
  },
];
