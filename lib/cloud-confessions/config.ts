export const cloudConfessionsConfig = {
  slug: "cloud-confessions",
  name: "Cloud Confessions Breakfast",
  organizer: "Cactus",
  description:
    "Un desayuno privado para conversar con honestidad sobre infraestructura, cloud y las decisiones que tomamos construyendo sobre AWS.",
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
    "Una conversación honesta sobre lo que funciona, lo que duele y lo que aprendemos construyendo en la nube.",
  conversationTopics: [
    "Decisiones técnicas difíciles",
    "Operación y confiabilidad",
    "Fricciones construyendo en AWS",
    "Aprendizajes entre equipos",
  ],
  audienceTags: ["Infraestructura", "Cloud", "DevOps", "SRE", "Plataforma", "AWS"],
  conversationNote:
    "Un espacio cercano para compartir lo que normalmente no cabe en una presentación.",
  aboutEyebrow: "Qué es Cloud Confessions",
  aboutTitle: "Antes del Summit, hablemos sin filtros",
  aboutDescription:
    "Un desayuno entre profesionales que toman decisiones de infraestructura todos los días. Sin presentaciones formales ni discursos comerciales: experiencias reales, aprendizajes útiles y nuevas conexiones antes de llegar al AWS Summit.",
  benefitsEyebrow: "Por qué asistir",
  benefitsTitle: "Una mesa para quienes operan la nube de verdad",
  benefits: [
    {
      title: "Conversaciones honestas",
      description:
        "Decisiones difíciles, errores, aprendizajes y prácticas que sí funcionan en equipos reales.",
    },
    {
      title: "Networking relevante",
      description:
        "Conecta con profesionales de infraestructura, plataforma, DevOps, SRE, tecnología y AWS.",
    },
    {
      title: "Desayuno antes del Summit",
      description:
        "Empieza el día cerca de Ágora Bogotá, con buena conversación y una comunidad técnica cercana.",
    },
    {
      title: "Experiencias compartidas",
      description:
        "Contrasta retos operativos con personas que enfrentan fricciones similares al construir en cloud.",
    },
  ],
  detailsEyebrow: "Información del evento",
  detailsTitle: "Todo lo esencial, antes de comenzar el día",
  approvalNotice:
    "La solicitud está sujeta a aprobación. La dirección exacta se compartirá únicamente con las personas aprobadas.",
  registrationEyebrow: "Solicitud de registro",
  registrationTitle: "Solicita tu cupo",
  registrationDescription:
    "Completa tus datos. Nuestro equipo revisará la solicitud y te confirmará si tu cupo fue aprobado.",
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
    "Conversaciones reales sobre infraestructura, cloud y AWS, organizadas por Cactus.",
} as const;

export type CloudConfessionsOrigin = "landing" | "invitation_link";
