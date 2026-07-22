export const cloudConfessionsConfig = {
  slug: "cloud-and-coffee",
  name: "Cloud & Coffee",
  tagline: "Coffee · Conversations · Cloud",
  hostedBy: "Hosted by C4c7Ops",
  organizer: "C4c7Ops",
  description:
    "Un café informal antes del AWS Summit Bogotá. Conversaciones sin formalidades, de 7:00 a. m. a 9:00 a. m., cerca del Ágora. Llega cuando te quede bien dentro de esa franja.",
  date: "Jueves 30 de julio, 2026",
  time: "7:00 – 9:00 a. m.",
  publicLocation: "Cerca al Ágora",
  exactAddress: "Antes, un café · Cl. 24d #40-34, Bogotá",
  calendarOrganizerEmail: "ext-s@c4c7us.com",
  calendarStartIso: "2026-07-30T07:00:00-05:00",
  calendarEndIso: "2026-07-30T09:00:00-05:00",
  calendarTimezone: "America/Bogota",
  ctaLabel: "Solicitar mi cupo",
  confirmationMessage:
    "Recibimos tu solicitud para Cloud & Coffee. Nuestro equipo la revisará y te confirmará el cupo pronto.",
  alreadyPendingMessage:
    "Este correo ya tiene una solicitud en revisión. Te confirmaremos el cupo cuando la revisemos.",
  alreadyApprovedMessage:
    "Este correo ya tiene un cupo aprobado. Revisa tu correo de confirmación o abre tu entrada desde el enlace que te enviamos.",
  limitedSpots: true,
  invitationOnly: true,
  sheetName: "Registros",
  initialStatus: "pendiente_aprobacion",
  visitStorageKey: "cloud-and-coffee-visit-tracked",
} as const;

export const cloudConfessionsCopy = {
  invitationBadge: "Antes del Summit · Por invitación",
  summitContext: "Antes del AWS Summit Bogotá",
  heroLead:
    "Tómate un café con nosotros. Conversaciones ligeras, sin agenda formal. De 7:00 a. m. a 9:00 a. m.; llega cuando te quede bien.",
  conversationTopics: [
    "Lo que funciona cuando trabajas con AWS",
    "Lo que cuesta más de lo esperado",
    "Aprendizajes reales operando en la nube",
    "Historias de café, no de slides",
  ],
  audienceTags: ["Infraestructura", "Cloud", "DevOps", "SRE", "Plataforma", "AWS"],
  formatNoteTitle: "Sin presentaciones",
  formatNote:
    "No hay agenda formal ni charlas: solo café, conversación y un rato relajado antes del Summit.",
  topicsEyebrow: "De qué se habla",
  topicsTitle: "Conversaciones reales, con café de por medio",
  aboutEyebrow: "Qué es Cloud & Coffee",
  aboutTitle: "Primero el café. Después, el Summit.",
  aboutDescription:
    "Un espacio informal cerca del Ágora, de 7:00 a. m. a 9:00 a. m.: tómate un café con C4c7Ops y conecta con gente de cloud, DevOps, SRE e infraestructura antes del AWS Summit. Llega cuando te acomode dentro de esa franja.",
  benefitsEyebrow: "Por qué ir",
  benefitsTitle: "Una mañana más fácil antes del Summit",
  benefits: [
    {
      title: "Café con calma",
      description:
        "Empieza el día sin prisa: un café bueno y un rato para respirar antes de la jornada intensa.",
    },
    {
      title: "Conversaciones reales",
      description:
        "Habla de lo que funciona, lo que cuesta y lo que has aprendido — sin micrófonos ni slides.",
    },
    {
      title: "Gente de cloud",
      description:
        "Conoce a otros de infraestructura, cloud, DevOps, SRE y tecnología en un ambiente cercano.",
    },
    {
      title: "Llegas mejor al Summit",
      description:
        "Sales con energía, caras nuevas y el día bien empezado.",
    },
  ],
  registrationEyebrow: "Solicitud de cupo",
  registrationTitle: "Solicita tu lugar",
  registrationDescription:
    "Déjanos tus datos. Revisamos cada solicitud y te confirmamos si hay cupo.",
  form: {
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Correo",
    company: "Empresa",
    jobTitle: "Cargo",
    phone: "Número de contacto",
    consent:
      "Acepto recibir comunicaciones relacionadas con Cloud & Coffee y con el estado de mi solicitud.",
    submitting: "Enviando solicitud...",
    submit: "Enviar solicitud",
    genericError: "No pudimos completar la solicitud. Intenta de nuevo.",
    connectionError: "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.",
  },
  footerDescription:
    "Coffee · Conversations · Cloud · Hosted by C4c7Ops",
} as const;

export type CloudConfessionsOrigin = "landing" | "invitation_link";
