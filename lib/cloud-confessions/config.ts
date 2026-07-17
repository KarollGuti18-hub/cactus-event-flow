export const cloudConfessionsConfig = {
  slug: "cloud-confessions",
  name: "Cloud Confessions Breakfast",
  organizer: "C4C7OPS",
  description:
    "Un desayuno privado antes del AWS Summit Bogotá para compartir mesa, ideas y aprendizajes reales de cloud.",
  date: "Pendiente de confirmación",
  time: "7:00 a. m.",
  publicLocation: "A pocos pasos de Ágora Bogotá",
  exactAddress: "Se compartirá con los asistentes aprobados",
  ctaLabel: "Solicitar mi cupo",
  confirmationMessage:
    "Recibimos tu solicitud para Cloud Confessions Breakfast. Nuestro equipo revisará tu registro y te confirmará el cupo próximamente.",
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
    "Empieza el día con buen desayuno, mesa pequeña y charla real entre personas que construyen y operan en AWS.",
  conversationTopics: [
    "Qué nos está costando más de lo esperado",
    "Lo que sí nos funcionó en producción",
    "Atajos que preferimos no repetir",
    "Preguntas que normalmente no salen en un keynote",
  ],
  audienceTags: ["Infraestructura", "Cloud", "DevOps", "SRE", "Plataforma", "AWS"],
  formatNoteTitle: "Mesa, no escenario",
  formatNote:
    "Café, comida buena y tiempo suficiente para hablar. Sin slides interminables ni pitch comercial.",
  topicsEyebrow: "En la mesa",
  topicsTitle: "De qué vamos a hablar entre bocados",
  aboutEyebrow: "Qué es Cloud Confessions",
  aboutTitle: "Primero desayunamos. Después, el Summit.",
  aboutDescription:
    "Es un encuentro cercano, a pocos pasos de Ágora Bogotá, pensado para llegar al AWS Summit con energía, contexto y nuevas caras. Compartimos mesa, comemos rico y hablamos de lo que realmente pasa cuando construyes en la nube.",
  benefitsEyebrow: "Por qué asistir",
  benefitsTitle: "Más que un registro: una mañana bien empezada",
  benefits: [
    {
      title: "Desayuno de verdad",
      description:
        "Buena comida, buen café y el tiempo justo para sentarte sin prisa antes de que arranque el Summit.",
    },
    {
      title: "Mesa con gente afín",
      description:
        "Personas de infraestructura, plataforma, DevOps, SRE y tecnología que viven los mismos retos día a día.",
    },
    {
      title: "El momento justo",
      description:
        "Llegas temprano, cerca del venue, y entras al AWS Summit ya calentado y con mejores conversaciones.",
    },
    {
      title: "Formato íntimo",
      description:
        "Cupos limitados, por invitación y con espacio real para compartir experiencias, no solo escuchar.",
    },
  ],
  detailsEyebrow: "Información del evento",
  detailsTitle: "Lo práctico, sin rodeos",
  approvalNotice:
    "La solicitud está sujeta a aprobación. La dirección exacta se compartirá únicamente con las personas aprobadas.",
  registrationEyebrow: "Solicitud de registro",
  registrationTitle: "Reserva tu lugar en la mesa",
  registrationDescription:
    "Déjanos tus datos. Revisamos cada solicitud y te confirmamos si hay cupo disponible.",
  form: {
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Correo",
    company: "Empresa",
    jobTitle: "Cargo",
    phone: "Número de contacto",
    consent:
      "Acepto recibir comunicaciones relacionadas con Cloud Confessions Breakfast y con el estado de mi solicitud.",
    submitting: "Enviando solicitud...",
    submit: "Enviar solicitud",
    genericError: "No pudimos completar la solicitud. Intenta de nuevo.",
    connectionError: "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.",
  },
  footerDescription:
    "Un desayuno privado de C4C7OPS antes del AWS Summit Bogotá.",
} as const;

export type CloudConfessionsOrigin = "landing" | "invitation_link";
