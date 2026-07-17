"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  cloudConfessionsConfig,
  cloudConfessionsCopy,
  type CloudConfessionsOrigin,
} from "@/lib/cloud-confessions/config";
import {
  isValidContactNumber,
  normalizeContactNumber,
} from "@/lib/cloud-confessions/validation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CloudConfessionsFormData {
  nombre: string;
  apellidos: string;
  email: string;
  empresa: string;
  cargo: string;
  telefono: string;
  consentimiento: boolean;
}

type FormField = keyof CloudConfessionsFormData;
type FormErrors = Partial<Record<FormField, string>>;
type FormStatus = "idle" | "submitting" | "success" | "error";

const INITIAL_FORM_DATA: CloudConfessionsFormData = {
  nombre: "",
  apellidos: "",
  email: "",
  empresa: "",
  cargo: "",
  telefono: "",
  consentimiento: false,
};

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function DetailIcon({ type }: { type: "time" | "location" | "access" }) {
  if (type === "time") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (type === "location") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

export default function CloudConfessionsLanding() {
  const [formData, setFormData] =
    useState<CloudConfessionsFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [origin, setOrigin] = useState<CloudConfessionsOrigin>("landing");
  const submitLockRef = useRef(false);

  function validateForm(): FormErrors {
    const errors: FormErrors = {};

    if (!formData.nombre.trim()) errors.nombre = "El nombre es requerido";
    if (!formData.apellidos.trim()) errors.apellidos = "Los apellidos son requeridos";
    if (!isValidEmail(formData.email)) errors.email = "Ingresa un correo válido";
    if (!formData.empresa.trim()) errors.empresa = "La empresa es requerida";
    if (!formData.cargo.trim()) errors.cargo = "El cargo es requerido";
    if (!isValidContactNumber(normalizeContactNumber(formData.telefono))) {
      errors.telefono = "Ingresa un número de contacto válido";
    }
    if (!formData.consentimiento) {
      errors.consentimiento = "Debes aceptar el consentimiento";
    }

    return errors;
  }

  function updateField(field: FormField, value: string | boolean) {
    setHasUserInteracted(true);
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

    if (formStatus === "error") {
      setFormStatus("idle");
      setSubmitError("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasUserInteracted(true);

    if (submitLockRef.current) return;

    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submitLockRef.current = true;
    setFormStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/cloud-confessions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.nombre,
          lastName: formData.apellidos,
          email: formData.email,
          company: formData.empresa,
          jobTitle: formData.cargo,
          telefono: formData.telefono,
          consent: formData.consentimiento,
          origin,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        submitLockRef.current = false;
        setSubmitError(result.error ?? cloudConfessionsCopy.form.genericError);
        setFormStatus("error");
        return;
      }

      setFormStatus("success");
    } catch {
      submitLockRef.current = false;
      setSubmitError(cloudConfessionsCopy.form.connectionError);
      setFormStatus("error");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email")?.trim() ?? "";
    const firstName = params.get("firstname")?.trim() ?? "";
    const lastName = params.get("lastname")?.trim() ?? "";

    if (!isValidEmail(email)) return;

    const prefillTimer = window.setTimeout(() => {
      setOrigin("invitation_link");
      setFormData((current) => ({
        ...current,
        email,
        nombre: firstName || current.nombre,
        apellidos: lastName || current.apellidos,
      }));
    }, 0);

    const storageKey = `${cloudConfessionsConfig.visitStorageKey}:${email.toLowerCase()}`;

    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      // El tracking continúa aunque el navegador bloquee sessionStorage.
    }

    void fetch("/api/cloud-confessions/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName }),
    })
      .then((response) => {
        if (!response.ok) return;
        try {
          sessionStorage.setItem(storageKey, "1");
        } catch {
          // La visita ya fue registrada; no es necesario interrumpir la UX.
        }
      })
      .catch(() => undefined);

    return () => window.clearTimeout(prefillTimer);
  }, []);

  useEffect(() => {
    if (!hasUserInteracted || !isValidEmail(formData.email)) return;
    if (formStatus === "success" || formStatus === "submitting") return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/cloud-confessions/track-incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.nombre,
          lastName: formData.apellidos,
          company: formData.empresa,
          jobTitle: formData.cargo,
          telefono: formData.telefono,
          consent: formData.consentimiento,
          origin,
        }),
        signal: controller.signal,
      }).catch(() => undefined);
    }, 1_000);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [formData, formStatus, hasUserInteracted, origin]);

  const eventFacts = [
    {
      label: "Hora",
      value: cloudConfessionsConfig.time,
      icon: "time" as const,
    },
    {
      label: "Ubicación",
      value: cloudConfessionsConfig.publicLocation,
      icon: "location" as const,
    },
    {
      label: "Acceso",
      value: cloudConfessionsConfig.invitationOnly
        ? "Evento por invitación"
        : "Registro abierto",
      icon: "access" as const,
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-cactus-bg text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="#inicio" aria-label="Ir al inicio" className="flex items-center">
            <Image
              src="/logo-c4c7ops-white.png"
              alt="Cactus"
              width={168}
              height={44}
              priority
              className="h-8 w-auto object-contain sm:h-9"
            />
          </a>
          <a
            href="#registro"
            className="rounded-full bg-cactus-green px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cactus-green-light sm:px-6 sm:text-sm"
          >
            {cloudConfessionsConfig.ctaLabel}
          </a>
        </div>
      </header>

      <main>
        <section
          id="inicio"
          className="section-anchor relative min-h-[760px] overflow-hidden pt-32 pb-20 sm:pt-40 lg:flex lg:min-h-screen lg:items-center lg:py-32"
        >
          <div className="absolute inset-0 grid-pattern opacity-70" />
          <div className="absolute top-24 right-[-15%] h-80 w-80 rounded-full bg-cactus-green/10 blur-[110px] sm:h-[520px] sm:w-[520px]" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cactus-green/30 bg-cactus-green/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cactus-green">
                <span className="h-1.5 w-1.5 rounded-full bg-cactus-green" />
                {cloudConfessionsCopy.invitationBadge}
              </div>

              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                {cloudConfessionsCopy.summitContext}
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                Cloud
                <span className="block text-cactus-green">Confessions</span>
                <span className="mt-2 block text-3xl tracking-[-0.03em] text-white/75 sm:text-4xl">
                  Breakfast
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
                {cloudConfessionsCopy.heroLead}
              </p>

              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
                <span>{cloudConfessionsConfig.date}</span>
                <span className="text-cactus-green">{cloudConfessionsConfig.time}</span>
                <span>{cloudConfessionsConfig.publicLocation}</span>
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  href="#registro"
                  className="inline-flex items-center justify-center rounded-full bg-cactus-green px-7 py-4 text-sm font-bold text-white transition-all hover:bg-cactus-green-light hover:shadow-[0_0_32px_rgba(127,155,40,0.35)]"
                >
                  {cloudConfessionsConfig.ctaLabel}
                </a>
                <span className="text-center text-xs uppercase tracking-[0.14em] text-white/38 sm:text-left">
                  {cloudConfessionsConfig.limitedSpots ? "Cupos limitados" : "Cupos disponibles"}
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="rounded-[2rem] border border-white/10 bg-cactus-bg-card/90 p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-white/8 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cactus-green">
                      Mesa abierta
                    </p>
                    <p className="mt-2 text-xl font-bold">Infraestructura sin libreto</p>
                  </div>
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-cactus-green" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                    <span className="h-2 w-2 rounded-full bg-white/10" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {cloudConfessionsCopy.conversationTopics.map((topic, index) => (
                    <div
                      key={topic}
                      className="flex items-center gap-4 rounded-2xl border border-white/7 bg-white/[0.025] px-4 py-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cactus-green/12 text-xs font-bold text-cactus-green">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-white/72">{topic}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-cactus-green/20 bg-cactus-green/8 p-5">
                  <p className="text-sm leading-6 text-white/65">
                    {cloudConfessionsCopy.conversationNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/7 bg-cactus-bg-elevated py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cactus-green">
                {cloudConfessionsCopy.aboutEyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
                {cloudConfessionsCopy.aboutTitle}
              </h2>
            </div>
            <div>
              <p className="text-lg leading-8 text-white/58">
                {cloudConfessionsCopy.aboutDescription}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {cloudConfessionsCopy.audienceTags.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/55"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cactus-green">
              {cloudConfessionsCopy.benefitsEyebrow}
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              {cloudConfessionsCopy.benefitsTitle}
            </h2>

            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/8 bg-white/8 sm:grid-cols-2">
              {cloudConfessionsCopy.benefits.map((benefit, index) => (
                <article key={benefit.title} className="bg-cactus-bg p-7 sm:p-9">
                  <span className="text-xs font-bold text-cactus-green">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 text-xl font-bold">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-cactus-bg-elevated py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-12 rounded-[2rem] border border-white/8 bg-cactus-bg-card p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cactus-green">
                  {cloudConfessionsCopy.detailsEyebrow}
                </p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
                  {cloudConfessionsCopy.detailsTitle}
                </h2>
                <p className="mt-6 text-sm leading-6 text-white/45">
                  {cloudConfessionsConfig.date}
                </p>
              </div>

              <div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {eventFacts.map((fact) => (
                    <div key={fact.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
                      <span className="text-cactus-green">
                        <DetailIcon type={fact.icon} />
                      </span>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/35">
                        {fact.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-cactus-green/20 bg-cactus-green/8 p-5">
                  <p className="text-sm leading-6 text-white/62">
                    {cloudConfessionsCopy.approvalNotice}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/45">
                    Dirección exacta: {cloudConfessionsConfig.exactAddress}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="registro" className="section-anchor relative py-20 sm:py-28">
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cactus-green">
                {cloudConfessionsCopy.registrationEyebrow}
              </p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                {cloudConfessionsCopy.registrationTitle}
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-white/52">
                {cloudConfessionsCopy.registrationDescription}
              </p>

              <div className="mt-10 space-y-4 text-sm text-white/55">
                {[
                  `${cloudConfessionsConfig.time} · ${cloudConfessionsConfig.publicLocation}`,
                  cloudConfessionsConfig.invitationOnly
                    ? "Evento privado por invitación"
                    : "Evento con registro abierto",
                  cloudConfessionsConfig.limitedSpots
                    ? "Cupos limitados"
                    : "Cupos disponibles",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-cactus-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-cactus-green/15 bg-cactus-bg-card p-6 sm:p-9">
              {formStatus === "success" ? (
                <div
                  className="flex min-h-[460px] flex-col items-center justify-center text-center"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cactus-green/15 text-cactus-green">
                    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-7 text-2xl font-bold">Solicitud recibida</h3>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/58">
                    {cloudConfessionsConfig.confirmationMessage}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {formStatus === "error" ? (
                    <div
                      className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                      role="alert"
                    >
                      {submitError || cloudConfessionsCopy.form.genericError}
                    </div>
                  ) : null}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cc-nombre" className="mb-2 block text-sm font-medium text-white/70">
                        {cloudConfessionsCopy.form.firstName}
                      </label>
                      <input
                        id="cc-nombre"
                        type="text"
                        autoComplete="given-name"
                        maxLength={80}
                        className={`cactus-input ${formErrors.nombre ? "error" : ""}`}
                        value={formData.nombre}
                        onChange={(event) => updateField("nombre", event.target.value)}
                        aria-invalid={Boolean(formErrors.nombre)}
                        aria-describedby={formErrors.nombre ? "cc-nombre-error" : undefined}
                      />
                      {formErrors.nombre ? (
                        <p id="cc-nombre-error" className="mt-1.5 text-xs text-red-400">
                          {formErrors.nombre}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="cc-apellidos" className="mb-2 block text-sm font-medium text-white/70">
                        {cloudConfessionsCopy.form.lastName}
                      </label>
                      <input
                        id="cc-apellidos"
                        type="text"
                        autoComplete="family-name"
                        maxLength={100}
                        className={`cactus-input ${formErrors.apellidos ? "error" : ""}`}
                        value={formData.apellidos}
                        onChange={(event) => updateField("apellidos", event.target.value)}
                        aria-invalid={Boolean(formErrors.apellidos)}
                        aria-describedby={formErrors.apellidos ? "cc-apellidos-error" : undefined}
                      />
                      {formErrors.apellidos ? (
                        <p id="cc-apellidos-error" className="mt-1.5 text-xs text-red-400">
                          {formErrors.apellidos}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="cc-email" className="mb-2 block text-sm font-medium text-white/70">
                      {cloudConfessionsCopy.form.email}
                    </label>
                    <input
                      id="cc-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      className={`cactus-input ${formErrors.email ? "error" : ""}`}
                      value={formData.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      aria-invalid={Boolean(formErrors.email)}
                      aria-describedby={formErrors.email ? "cc-email-error" : undefined}
                    />
                    {formErrors.email ? (
                      <p id="cc-email-error" className="mt-1.5 text-xs text-red-400">
                        {formErrors.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cc-empresa" className="mb-2 block text-sm font-medium text-white/70">
                        {cloudConfessionsCopy.form.company}
                      </label>
                      <input
                        id="cc-empresa"
                        type="text"
                        autoComplete="organization"
                        maxLength={150}
                        className={`cactus-input ${formErrors.empresa ? "error" : ""}`}
                        value={formData.empresa}
                        onChange={(event) => updateField("empresa", event.target.value)}
                        aria-invalid={Boolean(formErrors.empresa)}
                        aria-describedby={formErrors.empresa ? "cc-empresa-error" : undefined}
                      />
                      {formErrors.empresa ? (
                        <p id="cc-empresa-error" className="mt-1.5 text-xs text-red-400">
                          {formErrors.empresa}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="cc-cargo" className="mb-2 block text-sm font-medium text-white/70">
                        {cloudConfessionsCopy.form.jobTitle}
                      </label>
                      <input
                        id="cc-cargo"
                        type="text"
                        autoComplete="organization-title"
                        maxLength={120}
                        className={`cactus-input ${formErrors.cargo ? "error" : ""}`}
                        value={formData.cargo}
                        onChange={(event) => updateField("cargo", event.target.value)}
                        aria-invalid={Boolean(formErrors.cargo)}
                        aria-describedby={formErrors.cargo ? "cc-cargo-error" : undefined}
                      />
                      {formErrors.cargo ? (
                        <p id="cc-cargo-error" className="mt-1.5 text-xs text-red-400">
                          {formErrors.cargo}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="cc-telefono" className="mb-2 block text-sm font-medium text-white/70">
                      {cloudConfessionsCopy.form.phone}
                    </label>
                    <input
                      id="cc-telefono"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={24}
                      className={`cactus-input ${formErrors.telefono ? "error" : ""}`}
                      value={formData.telefono}
                      onChange={(event) => updateField("telefono", event.target.value)}
                      placeholder="+57 300 000 0000"
                      aria-invalid={Boolean(formErrors.telefono)}
                      aria-describedby={formErrors.telefono ? "cc-telefono-error" : undefined}
                    />
                    {formErrors.telefono ? (
                      <p id="cc-telefono-error" className="mt-1.5 text-xs text-red-400">
                        {formErrors.telefono}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <label className="cactus-checkbox-row" htmlFor="cc-consentimiento">
                      <input
                        id="cc-consentimiento"
                        type="checkbox"
                        className="cactus-checkbox"
                        checked={formData.consentimiento}
                        onChange={(event) =>
                          updateField("consentimiento", event.target.checked)
                        }
                        aria-invalid={Boolean(formErrors.consentimiento)}
                        aria-describedby={
                          formErrors.consentimiento
                            ? "cc-consentimiento-error"
                            : undefined
                        }
                      />
                      <span className="text-sm leading-6 text-white/50">
                        {cloudConfessionsCopy.form.consent}
                      </span>
                    </label>
                    {formErrors.consentimiento ? (
                      <p id="cc-consentimiento-error" className="mt-2 text-xs text-red-400">
                        {formErrors.consentimiento}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === "submitting"}
                    className="cactus-btn-submit mt-8 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formStatus === "submitting"
                      ? cloudConfessionsCopy.form.submitting
                      : cloudConfessionsCopy.form.submit}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/7 bg-cactus-bg-elevated py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-bold">{cloudConfessionsConfig.name}</p>
            <p className="mt-1 text-xs text-white/38">
              {cloudConfessionsCopy.footerDescription}
            </p>
          </div>
          <p className="text-xs text-white/30">
            {cloudConfessionsConfig.organizer} · Bogotá
          </p>
        </div>
      </footer>
    </div>
  );
}
