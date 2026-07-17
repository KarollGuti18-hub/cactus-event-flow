export const cloudConfessionsConfig = {
  slug: "cloud-confessions",
  name: "Cloud Confession Breakfast",
  organizer: "C4C7OPS",
  description:
    "Un desayuno privado antes del AWS Summit Bogotá para empezar el día con buena comida, conversaciones reales y networking en un ambiente relajado.",
  date: "Jueves 30 de julio, 2026",
  time: "7:00 a. m.",
  publicLocation: "A pocos pasos del Ágora",
  exactAddress: "Brumo Bistro",
  calendarOrganizerEmail: "kasogumo2006@gmail.com",
  calendarStartIso: "2026-07-30T07:00:00-05:00",
  calendarEndIso: "2026-07-30T09:00:00-05:00",
  calendarTimezone: "America/Bogota",
  ctaLabel: "Solicitar mi cupo",
  confirmationMessage:
    "Recibimos tu solicitud para Cloud Confession Breakfast. Nuestro equipo revisará tu registro y te confirmará el cupo próximamente.",
  limitedSpots: true,
  invitationOnly: true,
  sheetName: "Registros",
  initialStatus: "pendiente_aprobacion",
  visitStorageKey: "cloud-confessions-visit-tracked",
} as const;

export const cloudConfessionsCopy = {
  invitationBadge: "Desayuno privado · Por invitación",
  summitContext: "Desayuno previo al AWS Summit Bogotá",
  heroLead:
    "Empieza el día con buena comida, conversaciones reales y un ambiente relajado antes de entrar a una jornada larga e intensa.",
  conversationTopics: [
    "Lo que funciona cuando trabajas con AWS",
    "Lo que cuesta más de lo esperado",
    "Aprendizajes reales operando en la nube",
    "Experiencias que rara vez se cuentan",
  ],
  audienceTags: ["Infraestructura", "Cloud", "DevOps", "SRE", "Plataforma", "AWS"],
  formatNoteTitle: "Nada de conferencias",
  formatNote:
    "No hay presentaciones ni agenda formal: solo desayunar bien, pasar un buen rato y conversar sin formalidades.",
  topicsEyebrow: "De qué se habla",
  topicsTitle: "Conversaciones reales sobre la nube",
  aboutEyebrow: "Qué es Cloud Confession",
  aboutTitle: "Primero desayunamos. Después, el Summit.",
  aboutDescription:
    "Un desayuno privado a pocos pasos del Ágora para líderes y profesionales de infraestructura, cloud, DevOps, SRE y tecnología. Un espacio cercano para conocerse, comer bien y llegar al AWS Summit con nuevas conexiones y mejor energía.",
  benefitsEyebrow: "Por qué asistir",
  benefitsTitle: "Más que un registro: una mañana bien empezada",
  benefits: [
    {
      title: "Buena comida",
      description:
        "Desayuna bien y con calma antes de una jornada larga e intensa en el AWS Summit.",
    },
    {
      title: "Conversaciones reales",
      description:
        "Comparte sin formalidades lo que funciona, lo que cuesta y lo que has aprendido trabajando con la nube.",
    },
    {
      title: "Networking que suma",
      description:
        "Conoce a otros líderes y profesionales de infraestructura, cloud, DevOps, SRE y tecnología.",
    },
    {
      title: "Mejor energía",
      description:
        "Llega al Summit relajado, con nuevas conexiones y en un ambiente cercano, no una conferencia más.",
    },
  ],
  registrationEyebrow: "Solicitud de registro",
  registrationTitle: "Solicita tu cupo",
  registrationDescription:
    "Déjanos tus datos. Nuestro equipo revisará cada solicitud y te confirmará si hay cupo disponible.",
  form: {
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Correo",
    company: "Empresa",
    jobTitle: "Cargo",
    phone: "Número de contacto",
    consent:
      "Acepto recibir comunicaciones relacionadas con Cloud Confession Breakfast y con el estado de mi solicitud.",
    submitting: "Enviando solicitud...",
    submit: "Enviar solicitud",
    genericError: "No pudimos completar la solicitud. Intenta de nuevo.",
    connectionError: "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.",
  },
  footerDescription:
    "Un desayuno privado antes del AWS Summit Bogotá.",
} as const;

export type CloudConfessionsOrigin = "landing" | "invitation_link";
