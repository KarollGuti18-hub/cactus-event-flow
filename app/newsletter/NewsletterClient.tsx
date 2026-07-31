"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

interface NewsletterClientProps {
  initialEmail?: string;
  initialName?: string;
}

type Status = "form" | "saving" | "done" | "error";

export default function NewsletterClient({
  initialEmail = "",
  initialName = "",
}: NewsletterClientProps) {
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialName);
  const [status, setStatus] = useState<Status>("form");
  const [errorMessage, setErrorMessage] = useState("");

  const prefilled = useMemo(
    () => Boolean(initialEmail.trim()),
    [initialEmail],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          source: "cloud-and-coffee-missed",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus("form");
        setErrorMessage(data.error ?? "No pudimos suscribirte.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("form");
      setErrorMessage("Error de red. Intenta de nuevo.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cactus-bg text-white">
      <header className="border-b border-white/8 px-5 py-5 sm:px-8">
        <Image
          src="/logo-c4c7ops-white.png"
          alt="C4C7OPS"
          width={160}
          height={42}
          priority
          className="h-8 w-auto object-contain"
        />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        {status === "done" ? (
          <div className="rounded-3xl border border-white/8 bg-cactus-bg-card p-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cactus-green">
              Listo
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Quedaste en la lista
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Te escribiremos con próximas invitaciones de C4c7Ops.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/8 bg-cactus-bg-card p-7 sm:p-8"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cactus-green">
              C4c7Ops
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">
              Suscríbete a próximas invitaciones
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Eventos, cafés y conversaciones de cloud. Sin spam: solo cuando
              haya algo que valga la pena.
            </p>

            <label className="mt-7 block">
              <span className="mb-2 block text-xs font-medium text-white/45">
                Nombre
              </span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cactus-green/50"
                autoComplete="given-name"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-medium text-white/45">
                Correo
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={prefilled}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cactus-green/50 read-only:opacity-80"
                autoComplete="email"
              />
            </label>

            {errorMessage ? (
              <p className="mt-4 text-sm text-red-300">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={status === "saving"}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-cactus-green px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cactus-green-light disabled:opacity-40"
            >
              {status === "saving" ? "Suscribiendo…" : "Quiero enterarme"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
