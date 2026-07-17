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
type SuccessKind = "new" | "pending" | "approved";

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
  const [successKind, setSuccessKind] = useState<SuccessKind>("new");
  const [ticketUrl, setTicketUrl] = useState("");
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
        alreadyRegistered?: boolean;
        status?: "pending_approval" | "approved";
        ticketUrl?: string;
      };

      if (!response.ok) {
        submitLockRef.current = false;
        setSubmitError(result.error ?? cloudConfessionsCopy.form.genericError);
        setFormStatus("error");
        return;
      }

      if (result.status === "approved") {
        setSuccessKind("approved");
        setTicketUrl(result.ticketUrl?.trim() ?? "");
      } else if (result.alreadyRegistered) {
        setSuccessKind("pending");
        setTicketUrl("");
      } else {
        setSuccessKind("new");
        setTicketUrl("");
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
    <div className="min-h-screen overflow-x-clip bg-cactus-bg pb-20 text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute -top-48 left-[38%] h-[38rem] w-[38rem] rounded-full bg-cactus-green/10 blur-[150px]" />
        <div className="absolute right-[-12rem] top-[45rem] h-[28rem] w-[28rem] rounded-full bg-cactus-green/6 blur-[130px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <a href="#inicio" aria-label="Ir al inicio" className="flex shrink-0 items-center">
            <Image
              src="/logo-c4c7ops-white.png"
              alt="C4C7OPS"
              width={168}
              height={44}
              priority
              className="h-8 w-auto object-contain sm:h-9"
            />
          </a>

          <div className="hidden items-center gap-7 text-xs font-medium text-white/50 md:flex">
            <span>{cloudConfessionsConfig.time}</span>
            <span className="h-1 w-1 rounded-full bg-cactus-green" />
            <span>{cloudConfessionsConfig.publicLocation}</span>
          </div>

          <a
            href="#registro"
            className="hidden rounded-full border border-cactus-green/35 bg-cactus-green px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_28px_rgba(127,155,40,0.2)] transition hover:bg-cactus-green-light sm:inline-flex"
          >
            {cloudConfessionsConfig.ctaLabel}
          </a>
        </div>
      </header>

      <main
        id="inicio"
        className="section-anchor relative mx-auto grid max-w-7xl gap-x-10 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:pb-32 xl:gap-x-16"
      >
        <section className="relative left-1/2 flex min-h-[calc(100svh-5rem)] w-screen -translate-x-1/2 flex-col justify-center overflow-hidden bg-[#020b07] py-12 lg:col-span-2 lg:row-start-1 lg:aspect-[3794/1536] lg:min-h-0 lg:py-8">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-y-0 right-0 w-full sm:w-[90%] lg:w-full">
              <Image
                src="/cloud-confessions-banner.jpg"
                alt=""
                fill
                priority
                quality={90}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 100vw"
                className="object-contain object-top"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b07] from-[0%] via-[#020b07] via-[52%] to-transparent to-[64%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-cactus-bg via-transparent to-black/15" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl lg:max-w-[calc(100%-27rem)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-cactus-green/30 bg-cactus-green/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cactus-green">
                <span className="h-1.5 w-1.5 rounded-full bg-cactus-green" />
                {cloudConfessionsCopy.invitationBadge}
              </div>

              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-white/42">
                {cloudConfessionsCopy.summitContext}
              </p>
              <h1 className="mt-5 text-[3.65rem] font-extrabold leading-[0.9] tracking-[-0.065em] sm:text-[5.3rem] lg:text-[5.25rem] xl:text-[6.25rem]">
                Cloud
                <span className="block text-gradient-green">Confessions</span>
                <span className="mt-4 block text-2xl font-semibold tracking-[-0.035em] text-white/72 sm:text-4xl">
                  Breakfast
                </span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl sm:leading-9">
                {cloudConfessionsCopy.heroLead}
              </p>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {eventFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="group rounded-2xl border border-white/9 bg-white/[0.035] p-4 backdrop-blur-sm transition hover:border-cactus-green/25 hover:bg-white/[0.055]"
                  >
                    <span className="text-cactus-green">
                      <DetailIcon type={fact.icon} />
                    </span>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/32">
                      {fact.label}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-5 text-white/75">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <a
                  href="#registro"
                  className="inline-flex items-center gap-3 rounded-full bg-cactus-green px-5 py-3 text-sm font-bold text-white shadow-[0_8px_30px_rgba(127,155,40,0.24)] transition hover:bg-cactus-green-light"
                >
                  {cloudConfessionsConfig.ctaLabel}
                  <span aria-hidden="true">→</span>
                </a>
                <p className="text-xs uppercase tracking-[0.16em] text-white/32">
                  {cloudConfessionsConfig.limitedSpots
                    ? "Cupos limitados · Solicitud sujeta a aprobación"
                    : "Cupos disponibles"}
                </p>
              </div>
            </div>

            <div className="mt-16 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 lg:hidden">
              <span className="h-px w-12 bg-cactus-green/50" />
              Sigue explorando
            </div>
          </div>
        </section>

        <aside
          id="registro"
          className="section-anchor relative z-20 mb-20 self-start lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:mb-0 lg:max-h-[calc(100svh-5rem)] lg:overflow-y-auto"
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-cactus-green/25 bg-black/70 shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_0_1px_rgba(127,155,40,0.08)] backdrop-blur-3xl">
            <div className="border-b border-white/10 bg-gradient-to-br from-cactus-green/18 via-black/20 to-transparent px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cactus-green">
                    {cloudConfessionsCopy.registrationEyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">
                    {cloudConfessionsCopy.registrationTitle}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full border border-cactus-green/25 bg-cactus-green/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cactus-green">
                  Privado
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/48">
                {cloudConfessionsCopy.registrationDescription}
              </p>
            </div>

            <div className="p-6">
              {formStatus === "success" ? (
                <div
                  className="flex min-h-[30rem] flex-col items-center justify-center text-center"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cactus-green/25 bg-cactus-green/12 text-cactus-green">
                    <svg
                      aria-hidden="true"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-7 text-2xl font-bold">
                    {successKind === "approved"
                      ? "Cupo ya confirmado"
                      : successKind === "pending"
                        ? "Solicitud ya recibida"
                        : "Solicitud recibida"}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-white/58">
                    {successKind === "approved"
                      ? cloudConfessionsConfig.alreadyApprovedMessage
                      : successKind === "pending"
                        ? cloudConfessionsConfig.alreadyPendingMessage
                        : cloudConfessionsConfig.confirmationMessage}
                  </p>
                  {successKind === "approved" && ticketUrl ? (
                    <a
                      href={ticketUrl}
                      className="mt-7 inline-flex items-center justify-center rounded-full bg-cactus-green px-5 py-3 text-sm font-semibold text-black transition hover:bg-cactus-green-hover"
                    >
                      Abrir mi entrada
                    </a>
                  ) : null}
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={formStatus === "submitting"}
                >
                  {formStatus === "error" ? (
                    <div
                      className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300"
                      role="alert"
                    >
                      {submitError || cloudConfessionsCopy.form.genericError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="cc-nombre" className="mb-1.5 block text-xs font-semibold text-white/62">
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
                        <p id="cc-nombre-error" className="mt-1 text-[11px] text-red-400">
                          {formErrors.nombre}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="cc-apellidos" className="mb-1.5 block text-xs font-semibold text-white/62">
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
                        <p id="cc-apellidos-error" className="mt-1 text-[11px] text-red-400">
                          {formErrors.apellidos}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label htmlFor="cc-email" className="mb-1.5 block text-xs font-semibold text-white/62">
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
                      <p id="cc-email-error" className="mt-1 text-[11px] text-red-400">
                        {formErrors.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="cc-empresa" className="mb-1.5 block text-xs font-semibold text-white/62">
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
                        <p id="cc-empresa-error" className="mt-1 text-[11px] text-red-400">
                          {formErrors.empresa}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="cc-cargo" className="mb-1.5 block text-xs font-semibold text-white/62">
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
                        <p id="cc-cargo-error" className="mt-1 text-[11px] text-red-400">
                          {formErrors.cargo}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label htmlFor="cc-telefono" className="mb-1.5 block text-xs font-semibold text-white/62">
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
                      <p id="cc-telefono-error" className="mt-1 text-[11px] text-red-400">
                        {formErrors.telefono}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4">
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
                      <span className="text-[11px] leading-5 text-white/44">
                        {cloudConfessionsCopy.form.consent}
                      </span>
                    </label>
                    {formErrors.consentimiento ? (
                      <p id="cc-consentimiento-error" className="mt-1 text-[11px] text-red-400">
                        {formErrors.consentimiento}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === "submitting"}
                    className="cactus-btn-submit mt-5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formStatus === "submitting"
                      ? cloudConfessionsCopy.form.submitting
                      : cloudConfessionsCopy.form.submit}
                  </button>

                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-cactus-green"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0119.5 12.75v7.5H4.5v-7.5a2.25 2.25 0 012.25-2.25z" />
                    </svg>
                    Datos protegidos · Sin spam
                  </div>
                </form>
              )}
            </div>
          </div>
        </aside>

        <section className="border-t border-white/8 py-20 sm:py-24 lg:col-start-1 lg:row-start-2">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cactus-green">
            {cloudConfessionsCopy.aboutEyebrow}
          </p>
          <h2 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">
            {cloudConfessionsCopy.aboutTitle}
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-[1.2fr_0.8fr]">
            <p className="text-lg leading-8 text-white/56">
              {cloudConfessionsCopy.aboutDescription}
            </p>
            <div className="rounded-2xl border border-cactus-green/18 bg-cactus-green/7 p-5">
              <p className="text-sm font-bold text-white/78">
                {cloudConfessionsCopy.formatNoteTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/48">
                {cloudConfessionsCopy.formatNote}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {cloudConfessionsCopy.audienceTags.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-xs font-semibold text-white/52"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-white/8 py-20 sm:py-24 lg:col-start-1 lg:row-start-3">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cactus-green">
            {cloudConfessionsCopy.benefitsEyebrow}
          </p>
          <h2 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">
            {cloudConfessionsCopy.benefitsTitle}
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {cloudConfessionsCopy.benefits.map((benefit, index) => (
              <article
                key={benefit.title}
                className="group min-h-52 rounded-3xl border border-white/8 bg-gradient-to-br from-white/[0.045] to-transparent p-7 transition duration-300 hover:-translate-y-1 hover:border-cactus-green/25"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cactus-green">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="h-8 w-8 rounded-full border border-white/10 transition group-hover:border-cactus-green/30 group-hover:bg-cactus-green/8" />
                </div>
                <h3 className="mt-8 text-xl font-bold tracking-[-0.02em]">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/8 py-20 sm:py-24 lg:col-start-1 lg:row-start-4">
          <div className="overflow-hidden rounded-[2rem] border border-white/9 bg-[#141417]">
            <div className="border-b border-white/8 px-7 py-7 sm:px-9">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cactus-green">
                {cloudConfessionsCopy.topicsEyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                {cloudConfessionsCopy.topicsTitle}
              </h2>
            </div>
            <div className="divide-y divide-white/8">
              {cloudConfessionsCopy.conversationTopics.map((topic, index) => (
                <div
                  key={topic}
                  className="flex items-center gap-5 px-7 py-5 transition hover:bg-white/[0.025] sm:px-9"
                >
                  <span className="text-xs font-bold text-cactus-green">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold text-white/68 sm:text-base">
                    {topic}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/8 bg-black/50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 p-3 backdrop-blur-2xl lg:hidden">
        <a
          href="#registro"
          className="flex w-full items-center justify-between rounded-full bg-cactus-green px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(127,155,40,0.3)]"
        >
          <span>{cloudConfessionsConfig.ctaLabel}</span>
          <span className="text-xs font-semibold text-white/72">Cupos limitados →</span>
        </a>
      </div>
    </div>
  );
}
