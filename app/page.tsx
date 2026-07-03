"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const VISIT_TRACK_KEY = "c4c7ops_visit_tracked";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Stat {
  value: string;
  label: string;
}

interface Benefit {
  title: string;
  description: string;
  icon: "shield" | "cloud" | "network";
}

interface Highlight {
  title: string;
  description: string;
  icon: "users" | "mic" | "coffee";
}

interface Track {
  id: string;
  label: string;
  title: string;
  description: string;
  points: string[];
}

interface Speaker {
  name: string;
  role: string;
  company: string;
  topic: string;
}

interface AgendaItem {
  time: string;
  title: string;
  description?: string;
}

interface FormData {
  nombre: string;
  apellido: string;
  email: string;
  empresa: string;
  cargo: string;
  telefono: string;
  interes: string;
  consentimiento: boolean;
}

interface FormErrors {
  [key: string]: string;
}

interface RegisterApiPayload {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  interest: string;
  consent: boolean;
}

function toRegisterPayload(data: FormData): RegisterApiPayload {
  return {
    firstName: data.nombre,
    lastName: data.apellido,
    email: data.email,
    company: data.empresa,
    jobTitle: data.cargo,
    phone: data.telefono,
    interest: data.interes,
    consent: data.consentimiento,
  };
}

// ─── Contenido editable ──────────────────────────────────────────────────────

const EVENT = {
  title: "C4C7OPS Tech Summit",
  subtitle: "IA, Cloud, AWS y Seguridad para empresas",
  date: "Jueves 15 de mayo, 2025",
  time: "2:00 p.m.",
  location: "Bogotá",
  format: "Evento presencial · Cupos limitados",
};

const NAV_LINKS = [
  { href: "#experiencia", label: "Experiencia" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#destacados", label: "Destacados" },
  { href: "#speakers", label: "Speakers" },
  { href: "#agenda", label: "Agenda" },
  { href: "#registro", label: "Registro" },
];

const STATS: Stat[] = [
  { value: "Presencial", label: "Evento en vivo con experiencia inmersiva" },
  { value: "Limitado", label: "Cupos exclusivos para máximo networking" },
  { value: "Networking", label: "Conecta con líderes y equipos técnicos" },
  { value: "4 Tracks", label: "IA · Seguridad · Cloud · Operación" },
];

const BENEFITS: Benefit[] = [
  {
    title: "Entiende los riesgos reales de la IA en tu empresa",
    description:
      "Conoce los desafíos de gobernanza, privacidad y cumplimiento que enfrentan las organizaciones al adoptar inteligencia artificial a escala.",
    icon: "shield",
  },
  {
    title: "Prepara tu infraestructura para adoptar IA con seguridad",
    description:
      "Aprende cómo diseñar arquitecturas cloud resilientes, optimizar costos y proteger tus datos mientras integras capacidades de IA.",
    icon: "cloud",
  },
  {
    title: "Conecta con líderes que enfrentan los mismos retos",
    description:
      "Comparte experiencias con directivos, CTOs y responsables de tecnología que navegan la misma transformación digital.",
    icon: "network",
  },
];

const HIGHLIGHTS: Highlight[] = [
  {
    title: "Networking con líderes y equipos técnicos",
    description:
      "Espacios diseñados para conversaciones de alto valor entre tomadores de decisión y especialistas en infraestructura, cloud y seguridad.",
    icon: "users",
  },
  {
    title: "Speakers con experiencia real",
    description:
      "Expertos que han implementado soluciones de IA, AWS y ciberseguridad en entornos empresariales complejos y regulados.",
    icon: "mic",
  },
  {
    title: "Welcome café, catering y conversación",
    description:
      "Una experiencia premium desde el registro: café de bienvenida, catering selecto y ambiente propicio para relaciones de negocio.",
    icon: "coffee",
  },
];

const TRACKS: Track[] = [
  {
    id: "ia",
    label: "IA para empresas",
    title: "Inteligencia artificial con propósito empresarial",
    description:
      "Explora cómo las organizaciones están integrando IA de forma responsable: casos de uso reales, gobernanza de datos y retorno de inversión medible.",
    points: [
      "Estrategias de adopción de IA alineadas al negocio",
      "Gobernanza de datos y modelos en producción",
      "Casos de éxito en automatización e insights",
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad",
    title: "Ciberseguridad en la era de la IA",
    description:
      "La expansión de la IA amplifica la superficie de ataque. Conoce frameworks, mejores prácticas y arquitecturas de defensa para proteger tu organización.",
    points: [
      "Amenazas emergentes en entornos con IA",
      "Zero Trust y protección de datos sensibles",
      "Cumplimiento normativo y auditoría continua",
    ],
  },
  {
    id: "cloud",
    label: "Cloud & AWS",
    title: "Infraestructura cloud lista para escalar",
    description:
      "Profundiza en arquitecturas AWS, migración estratégica y diseño de plataformas que soporten cargas de IA y aplicaciones críticas de negocio.",
    points: [
      "Arquitecturas de referencia en AWS",
      "Alta disponibilidad y recuperación ante desastres",
      "Integración de servicios de IA en la nube",
    ],
  },
  {
    id: "operacion",
    label: "Operación y costos",
    title: "Operación eficiente y costos bajo control",
    description:
      "Optimiza tu inversión cloud sin sacrificar rendimiento. Herramientas, métricas y estrategias para una operación financieramente sostenible.",
    points: [
      "FinOps y visibilidad de costos en tiempo real",
      "Automatización de operaciones y observabilidad",
      "Balance entre performance, costo y resiliencia",
    ],
  },
];

const SPEAKERS: Speaker[] = [
  {
    name: "María González",
    role: "CTO",
    company: "TechCorp Latam",
    topic: "Arquitecturas cloud para cargas de IA",
  },
  {
    name: "Carlos Ruiz",
    role: "Director de Seguridad",
    company: "SecureOps",
    topic: "Zero Trust en entornos híbridos",
  },
  {
    name: "Ana Martínez",
    role: "Head of AI",
    company: "DataDrive",
    topic: "Gobernanza de IA en producción",
  },
  {
    name: "Roberto Sánchez",
    role: "Cloud Architect",
    company: "AWS Partner",
    topic: "Optimización de costos en AWS",
  },
];

const AGENDA: AgendaItem[] = [
  {
    time: "1:30 p.m.",
    title: "Registro y welcome café",
    description: "Recepción, credenciales y networking inicial",
  },
  {
    time: "2:00 p.m.",
    title: "Charla principal",
    description: "IA, Cloud, AWS y Seguridad: el eje de la transformación empresarial",
  },
  {
    time: "2:45 p.m.",
    title: "Panel / conversación guiada",
    description: "Líderes técnicos comparten retos y aprendizajes reales",
  },
  {
    time: "3:15 p.m.",
    title: "Networking y catering",
    description: "Espacio abierto para conexiones de negocio",
  },
];

const INTEREST_OPTIONS = [
  "IA para empresas",
  "Seguridad y cumplimiento",
  "Cloud & AWS",
  "Operación y costos",
  "Networking general",
];

// ─── Iconos ──────────────────────────────────────────────────────────────────

function IconShield() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function IconCoffee() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BenefitIcon({ type }: { type: Benefit["icon"] }) {
  const icons = { shield: <IconShield />, cloud: <IconCloud />, network: <IconNetwork /> };
  return <div className="text-cactus-green">{icons[type]}</div>;
}

function HighlightIcon({ type }: { type: Highlight["icon"] }) {
  const icons = { users: <IconUsers />, mic: <IconMic />, coffee: <IconCoffee /> };
  return <div className="text-cactus-green">{icons[type]}</div>;
}

// ─── Componentes auxiliares ────────────────────────────────────────────────────

function scrollTo(href: string) {
  const el = document.querySelector(href);
  el?.scrollIntoView({ behavior: "smooth" });
}

function CtaButton({
  children,
  variant = "primary",
  href = "#registro",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold sm:px-7 sm:py-3 transition-all duration-200 cursor-pointer whitespace-nowrap";
  const styles =
    variant === "primary"
      ? "bg-[#7F9B28] text-white shadow-[0_0_24px_rgba(127,155,40,0.3)] hover:bg-[#9AB83A] hover:shadow-[0_0_40px_rgba(127,155,40,0.5)]"
      : "border border-[#7F9B28]/40 text-white hover:border-[#7F9B28] hover:bg-[#7F9B28]/10";

  return (
    <button type="button" onClick={() => scrollTo(href)} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

type FormStatus = "idle" | "submitting" | "success" | "error";

// ─── Página principal ────────────────────────────────────────────────────────

export default function Home() {
  const [activeTrack, setActiveTrack] = useState(TRACKS[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    apellido: "",
    email: "",
    empresa: "",
    cargo: "",
    telefono: "",
    interes: "",
    consentimiento: false,
  });

  const currentTrack = TRACKS.find((t) => t.id === activeTrack) ?? TRACKS[0];

  function handleNavClick(href: string) {
    setMobileMenuOpen(false);
    scrollTo(href);
  }

  function validateForm(): FormErrors {
    const errors: FormErrors = {};
    if (!formData.nombre.trim()) errors.nombre = "El nombre es requerido";
    if (!formData.apellido.trim()) errors.apellido = "El apellido es requerido";
    if (!formData.email.trim()) {
      errors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Ingresa un email válido";
    }
    if (!formData.empresa.trim()) errors.empresa = "La empresa es requerida";
    if (!formData.cargo.trim()) errors.cargo = "El cargo es requerido";
    if (!formData.telefono.trim()) errors.telefono = "El teléfono es requerido";
    if (!formData.interes) errors.interes = "Selecciona un interés principal";
    if (!formData.consentimiento) errors.consentimiento = "Debes aceptar el consentimiento";
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormStatus("submitting");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRegisterPayload(formData)),
      });

      if (!response.ok) {
        setFormStatus("error");
        return;
      }

      setFormStatus("success");
    } catch {
      setFormStatus("error");
    }
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email")?.trim() ?? "";
    const firstname = params.get("firstname")?.trim() ?? "";
    const lastname = params.get("lastname")?.trim() ?? "";

    if (!isValidEmail(email)) return;

    setFormData((prev) => ({
      ...prev,
      email,
      nombre: firstname || prev.nombre,
      apellido: lastname || prev.apellido,
    }));

    const storageKey = `${VISIT_TRACK_KEY}:${email.toLowerCase()}`;
    if (sessionStorage.getItem(storageKey)) return;

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        firstName: firstname,
        lastName: lastname,
      }),
    })
      .then((response) => {
        if (response.ok) {
          sessionStorage.setItem(storageKey, "1");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (formStatus === "success") return;
    if (!isValidEmail(formData.email)) return;

    const hasStartedFilling =
      formData.nombre.trim() !== "" ||
      formData.apellido.trim() !== "" ||
      formData.empresa.trim() !== "" ||
      formData.cargo.trim() !== "" ||
      formData.interes !== "";

    if (!hasStartedFilling) return;

    const timer = window.setTimeout(() => {
      fetch("/api/track-incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.nombre,
          lastName: formData.apellido,
          company: formData.empresa,
          jobTitle: formData.cargo,
          interest: formData.interes,
        }),
      }).catch(() => {});
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [formData, formStatus]);

  return (
    <div className="min-h-screen bg-cactus-bg text-white">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 min-h-[var(--header-height)] border-b border-[#7F9B28]/20 bg-black/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--header-height)] max-w-7xl items-center justify-between px-6 lg:px-8">
          <button type="button" onClick={() => scrollTo("#hero")} className="flex min-w-0 shrink items-center py-2 cursor-pointer">
            <Image src="/logo-c4c7ops-white.png" alt="C4C7OPS" width={168} height={44} priority className="h-8 w-auto max-w-[120px] object-contain sm:h-9 sm:max-w-none lg:h-10" />
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-white/60 transition-colors hover:text-[#7F9B28] cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <CtaButton className="hidden lg:inline-flex px-5 py-2 text-sm">Reservar cupo</CtaButton>
            <button
              type="button"
              className="lg:hidden p-2 -mr-2 text-white/70 cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-white/5 bg-cactus-bg-elevated px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavClick(link.href)}
                  className="py-2 text-left text-sm font-medium text-white/70 hover:text-white cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <CtaButton className="mt-2 w-full justify-center py-2.5 text-sm lg:hidden">Reservar cupo</CtaButton>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* ── Hero ── */}
        <section id="hero" className="section-anchor relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
          <div className="absolute inset-0 grid-pattern opacity-60" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-cactus-green/8 blur-[120px]" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cactus-green/30 bg-cactus-green/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cactus-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-cactus-green animate-pulse" />
                  Evento exclusivo · C4C7OPS
                </div>

                <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="text-gradient-green">{EVENT.title}</span>
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
                  {EVENT.subtitle}
                </p>

                <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/50">
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-cactus-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {EVENT.date}
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-cactus-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {EVENT.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-cactus-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {EVENT.time}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-cactus-green">{EVENT.format}</p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <CtaButton>Reservar mi cupo</CtaButton>
                  <CtaButton variant="secondary" href="#agenda">Ver agenda</CtaButton>
                </div>
              </div>

              {/* Hero visual */}
              <div className="relative hidden lg:block">
                <div className="relative rounded-3xl border border-white/8 bg-cactus-bg-card p-8 glow-green">
                  <div className="absolute -top-3 -right-3 h-24 w-24 rounded-2xl border border-cactus-green/20 bg-cactus-green/10 backdrop-blur" />
                  <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full border border-white/5 bg-white/3" />

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "IA", value: "Gobernanza" },
                      { label: "Cloud", value: "AWS" },
                      { label: "Seguridad", value: "Zero Trust" },
                      { label: "FinOps", value: "Costos" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/6 bg-white/3 p-5 transition-colors hover:border-cactus-green/30"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-cactus-green">{item.label}</p>
                        <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-cactus-green/20 bg-cactus-green/5 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider">Infraestructura</p>
                        <p className="text-2xl font-bold text-white mt-1">+99.9%</p>
                        <p className="text-xs text-white/50">uptime objetivo</p>
                      </div>
                      <div className="flex gap-1">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="w-2 rounded-full bg-cactus-green/60"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-3">
                    <div className="h-2 w-2 rounded-full bg-cactus-green animate-pulse" />
                    <p className="text-xs text-white/50">Conexiones activas · Networking en tiempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="border-y border-[#7F9B28]/15 bg-cactus-bg-elevated py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-3xl font-extrabold text-cactus-green sm:text-4xl">{stat.value}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Experiencia ── */}
        <section id="experiencia" className="section-anchor py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Experiencia</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  Vive la experiencia C4C7OPS
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-white/60">
                  Un encuentro diseñado para líderes de negocio, equipos técnicos y responsables de tecnología
                  que necesitan adoptar inteligencia artificial sin comprometer la seguridad, la operación
                  ni la integridad de sus datos.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-white/60">
                  Más que una conferencia: un espacio curado donde la estrategia empresarial se encuentra
                  con la infraestructura cloud, la ciberseguridad y las decisiones que definen el futuro
                  tecnológico de tu organización.
                </p>
                <CtaButton className="mt-8">Reservar mi cupo</CtaButton>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-white/8 bg-cactus-bg-card">
                  <div className="absolute inset-0 grid-pattern" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-cactus-green/30 bg-cactus-green/10">
                        <Image src="/logo-c4c7ops-white.png" alt="" width={120} height={30} className="h-6 w-auto opacity-80" />
                      </div>
                      <p className="text-2xl font-bold text-white">IA · Cloud · Seguridad</p>
                      <p className="mt-2 text-sm text-white/40">Transformación con confianza</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-cactus-bg to-transparent" />
                </div>
                <div className="absolute -bottom-6 -right-6 hidden h-48 w-48 rounded-3xl border border-cactus-green/15 bg-cactus-green/5 lg:block" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Beneficios ── */}
        <section id="beneficios" className="section-anchor py-24 lg:py-32 bg-cactus-bg-elevated">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Beneficios</p>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                ¿Por qué debes asistir?
              </h2>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="group rounded-3xl border border-white/6 bg-cactus-bg-card p-8 transition-all duration-300 hover:border-cactus-green/25 hover:bg-cactus-bg-card/80"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-cactus-green/20 bg-cactus-green/10 transition-colors group-hover:bg-cactus-green/15">
                    <BenefitIcon type={benefit.icon} />
                  </div>
                  <h3 className="text-xl font-bold leading-snug">{benefit.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Destacados ── */}
        <section id="destacados" className="section-anchor py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Destacados</p>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Lo más destacado del evento
              </h2>
            </div>

            <div className="mt-16 space-y-6">
              {HIGHLIGHTS.map((item, index) => (
                <div
                  key={item.title}
                  className={`group flex flex-col gap-8 rounded-3xl border border-white/6 bg-cactus-bg-card p-8 transition-all hover:border-cactus-green/20 md:flex-row md:items-center ${
                    index % 2 === 1 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-cactus-green/20 bg-cactus-green/10">
                    <HighlightIcon type={item.icon} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                    <p className="mt-3 text-white/55 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="hidden md:block text-6xl font-extrabold text-white/5 select-none">
                    0{index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tracks / Tabs ── */}
        <section id="tracks" className="section-anchor py-24 lg:py-32 bg-cactus-bg-elevated">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Tracks</p>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Temas que importan
              </h2>
            </div>

            <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:mt-12">
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setActiveTrack(track.id)}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer sm:w-auto sm:rounded-full sm:px-5 sm:py-2.5 ${
                    activeTrack === track.id
                      ? "bg-[#7F9B28] text-white shadow-[0_0_20px_rgba(127,155,40,0.35)] ring-1 ring-[#7F9B28]/60"
                      : "border border-[#7F9B28]/25 text-white/60 hover:border-[#7F9B28]/60 hover:text-[#7F9B28]"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-8 lg:p-12">
              <h3 className="text-2xl font-bold lg:text-3xl">{currentTrack.title}</h3>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/55">{currentTrack.description}</p>
              <ul className="mt-8 space-y-4">
                {currentTrack.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cactus-green/20">
                      <svg className="h-3 w-3 text-cactus-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-white/70">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Speakers ── */}
        <section id="speakers" className="section-anchor py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Speakers</p>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Descubre a nuestros speakers
              </h2>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SPEAKERS.map((speaker) => (
                <div
                  key={speaker.name}
                  className="group overflow-hidden rounded-3xl border border-white/6 bg-cactus-bg-card transition-all hover:border-cactus-green/25"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-cactus-green/10 to-cactus-bg-elevated">
                    <div className="absolute inset-0 grid-pattern opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-cactus-green/30 bg-cactus-bg text-3xl font-bold text-cactus-green">
                        {speaker.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold">{speaker.name}</h3>
                    <p className="mt-1 text-sm text-cactus-green">{speaker.role}</p>
                    <p className="text-sm text-white/50">{speaker.company}</p>
                    <div className="mt-4 rounded-xl border border-white/5 bg-white/3 px-3 py-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Tema</p>
                      <p className="mt-0.5 text-sm text-white/70">{speaker.topic}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Agenda ── */}
        <section id="agenda" className="section-anchor py-24 lg:py-32 bg-cactus-bg-elevated">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Agenda</p>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Programa del evento
              </h2>
              <p className="mt-4 text-white/50">{EVENT.date} · {EVENT.location}</p>
            </div>

            <div className="mt-16 relative">
              <div className="absolute left-[27px] top-0 bottom-0 w-px bg-cactus-green/20 hidden sm:block" />
              <div className="space-y-6">
                {AGENDA.map((item, index) => (
                  <div key={item.time} className="relative flex gap-6 sm:gap-8">
                    <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-cactus-green/40 bg-cactus-bg-elevated z-10">
                      <span className="text-xs font-bold text-cactus-green">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="flex-1 rounded-2xl border border-white/6 bg-cactus-bg-card p-6 transition-colors hover:border-cactus-green/20">
                      <p className="text-sm font-bold text-cactus-green">{item.time}</p>
                      <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
                      {item.description && (
                        <p className="mt-2 text-sm text-white/50">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 text-center">
              <CtaButton>Reservar mi cupo</CtaButton>
            </div>
          </div>
        </section>

        {/* ── Registro ── */}
        <section id="registro" className="section-anchor py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Registro</p>
                <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                  Reserva tu cupo
                </h2>
                <p className="mt-6 text-lg text-white/55 leading-relaxed">
                  Los cupos son limitados. Completa el formulario para asegurar tu lugar en este
                  encuentro exclusivo de tecnología y negocio.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    "Acceso completo al evento",
                    "Welcome café y catering incluido",
                    "Networking con líderes del sector",
                    "Material exclusivo post-evento",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cactus-green/20">
                        <svg className="h-3 w-3 text-cactus-green" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-sm text-white/60">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[#7F9B28]/15 bg-cactus-bg-card p-8 lg:p-10">
                {formStatus === "success" ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cactus-green/20">
                      <svg className="h-8 w-8 text-cactus-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="mt-6 text-2xl font-bold">¡Registro exitoso!</h3>
                    <p className="mt-3 max-w-sm text-white/55">
                      Tu registro fue recibido. Te enviaremos la confirmación por correo.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    {formStatus === "error" && (
                      <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        No pudimos completar el registro. Intenta de nuevo.
                      </div>
                    )}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="nombre" className="mb-1.5 block text-sm font-medium text-white/70">Nombre</label>
                        <input
                          id="nombre"
                          type="text"
                          className={`cactus-input ${formErrors.nombre ? "error" : ""}`}
                          value={formData.nombre}
                          onChange={(e) => updateField("nombre", e.target.value)}
                          placeholder="Tu nombre"
                        />
                        {formErrors.nombre && <p className="mt-1 text-xs text-red-400">{formErrors.nombre}</p>}
                      </div>
                      <div>
                        <label htmlFor="apellido" className="mb-1.5 block text-sm font-medium text-white/70">Apellido</label>
                        <input
                          id="apellido"
                          type="text"
                          className={`cactus-input ${formErrors.apellido ? "error" : ""}`}
                          value={formData.apellido}
                          onChange={(e) => updateField("apellido", e.target.value)}
                          placeholder="Tu apellido"
                        />
                        {formErrors.apellido && <p className="mt-1 text-xs text-red-400">{formErrors.apellido}</p>}
                      </div>
                    </div>

                    <div className="mt-5">
                      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/70">Email corporativo</label>
                      <input
                        id="email"
                        type="email"
                        className={`cactus-input ${formErrors.email ? "error" : ""}`}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="nombre@empresa.com"
                      />
                      {formErrors.email && <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>}
                    </div>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="empresa" className="mb-1.5 block text-sm font-medium text-white/70">Empresa</label>
                        <input
                          id="empresa"
                          type="text"
                          className={`cactus-input ${formErrors.empresa ? "error" : ""}`}
                          value={formData.empresa}
                          onChange={(e) => updateField("empresa", e.target.value)}
                          placeholder="Nombre de la empresa"
                        />
                        {formErrors.empresa && <p className="mt-1 text-xs text-red-400">{formErrors.empresa}</p>}
                      </div>
                      <div>
                        <label htmlFor="cargo" className="mb-1.5 block text-sm font-medium text-white/70">Cargo</label>
                        <input
                          id="cargo"
                          type="text"
                          className={`cactus-input ${formErrors.cargo ? "error" : ""}`}
                          value={formData.cargo}
                          onChange={(e) => updateField("cargo", e.target.value)}
                          placeholder="Tu cargo"
                        />
                        {formErrors.cargo && <p className="mt-1 text-xs text-red-400">{formErrors.cargo}</p>}
                      </div>
                    </div>

                    <div className="mt-5">
                      <label htmlFor="telefono" className="mb-1.5 block text-sm font-medium text-white/70">Teléfono</label>
                      <input
                        id="telefono"
                        type="tel"
                        className={`cactus-input ${formErrors.telefono ? "error" : ""}`}
                        value={formData.telefono}
                        onChange={(e) => updateField("telefono", e.target.value)}
                        placeholder="+57 300 000 0000"
                      />
                      {formErrors.telefono && <p className="mt-1 text-xs text-red-400">{formErrors.telefono}</p>}
                    </div>

                    <div className="mt-5">
                      <label htmlFor="interes" className="mb-1.5 block text-sm font-medium text-white/70">Interés principal</label>
                      <select
                        id="interes"
                        className={`cactus-input ${formErrors.interes ? "error" : ""}`}
                        value={formData.interes}
                        onChange={(e) => updateField("interes", e.target.value)}
                      >
                        <option value="" className="bg-cactus-bg-card">Selecciona una opción</option>
                        {INTEREST_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-cactus-bg-card">{opt}</option>
                        ))}
                      </select>
                      {formErrors.interes && <p className="mt-1 text-xs text-red-400">{formErrors.interes}</p>}
                    </div>

                    <div className="mt-6">
                      <label className="cactus-checkbox-row">
                        <input
                          id="consentimiento"
                          type="checkbox"
                          checked={formData.consentimiento}
                          onChange={(e) => updateField("consentimiento", e.target.checked)}
                          className="cactus-checkbox"
                        />
                        <span className="text-sm leading-relaxed text-white/55">
                          Acepto recibir comunicaciones sobre el evento y autorizo el tratamiento de mis datos conforme a la política de privacidad de C4C7OPS.
                        </span>
                      </label>
                      {formErrors.consentimiento && <p className="mt-1 text-xs text-red-400">{formErrors.consentimiento}</p>}
                    </div>

                    <button
                      type="submit"
                      className="cactus-btn-submit mt-8 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={formStatus === "submitting"}
                    >
                      {formStatus === "submitting" ? "Enviando registro..." : "Confirmar registro"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-cactus-bg-elevated py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <Image src="/logo-c4c7ops-white.png" alt="C4C7OPS" width={168} height={44} className="h-10 w-auto object-contain" />
              <p className="mt-4 text-sm leading-relaxed text-white/45">
                C4C7OPS conecta estrategia, infraestructura cloud y seguridad para empresas que escalan con confianza.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Navegación</p>
              <nav className="mt-4 flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => scrollTo(link.href)}
                    className="text-left text-sm text-white/45 transition-colors hover:text-cactus-green cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Evento</p>
              <div className="mt-4 space-y-2 text-sm text-white/45">
                <p>{EVENT.title}</p>
                <p>{EVENT.date}</p>
                <p>{EVENT.location}</p>
                <p>{EVENT.time}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
            <p className="text-xs text-white/30">© 2025 C4C7OPS. Todos los derechos reservados.</p>
            <CtaButton className="text-sm px-5 py-2.5">Reservar cupo</CtaButton>
          </div>
        </div>
      </footer>
    </div>
  );
}
