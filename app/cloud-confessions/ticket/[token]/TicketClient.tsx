"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

import { cloudConfessionsConfig } from "@/lib/cloud-confessions/config";

interface AttendeeInfo {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  checkedInAt: string;
}

type PageStatus = "loading" | "complete" | "checked_in" | "error";

interface TicketClientProps {
  token: string;
}

export default function CloudConfessionsTicketClient({
  token,
}: TicketClientProps) {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [attendee, setAttendee] = useState<AttendeeInfo | null>(null);
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [staffPin, setStaffPin] = useState("");
  const [staffError, setStaffError] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      try {
        const response = await fetch(
          `/api/cloud-confessions/ticket/${encodeURIComponent(token)}`,
        );
        const data = (await response.json()) as {
          error?: string;
          alreadyCheckedIn?: boolean;
          attendee?: AttendeeInfo;
        };

        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setErrorMessage(data.error ?? "Entrada no válida");
          return;
        }

        setAttendee(data.attendee ?? null);
        setStatus(data.alreadyCheckedIn ? "checked_in" : "complete");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Error al cargar tu entrada");
        }
      }
    }

    void loadTicket();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleStaffCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffError("");
    setIsCheckingIn(true);

    try {
      const response = await fetch("/api/cloud-confessions/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, staffPin }),
      });
      const data = (await response.json()) as {
        error?: string;
        attendee?: AttendeeInfo;
      };

      if (!response.ok) {
        setStaffError(data.error ?? "No pudimos registrar la asistencia");
        return;
      }

      setAttendee(data.attendee ?? attendee);
      setStatus("checked_in");
      setShowStaffPanel(false);
      setStaffPin("");
    } catch {
      setStaffError("Error de conexión");
    } finally {
      setIsCheckingIn(false);
    }
  }

  const isPositive = status === "complete" || status === "checked_in";

  return (
    <main className="min-h-screen bg-cactus-bg px-6 py-12 text-white">
      <div className="mx-auto max-w-lg rounded-3xl border border-cactus-green/20 bg-cactus-bg-card p-7 text-center sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">
          {cloudConfessionsConfig.name}
        </p>

        <div
          className={`mx-auto mt-7 flex h-20 w-20 items-center justify-center rounded-full ${
            status === "loading"
              ? "bg-white/10"
              : isPositive
                ? "bg-cactus-green/20"
                : "bg-red-500/20"
          }`}
        >
          {status === "loading" ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cactus-green" />
          ) : isPositive ? (
            <svg
              aria-hidden="true"
              className="h-10 w-10 text-cactus-green"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="h-10 w-10 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h1 className="mt-6 text-2xl font-bold">
          {status === "loading" && "Verificando entrada..."}
          {status === "complete" && "Tu cupo está confirmado"}
          {status === "checked_in" && "Asistencia registrada"}
          {status === "error" && "Entrada no válida"}
        </h1>

        <p className="mt-3 text-white/60">
          {status === "loading" && "Un momento..."}
          {status === "complete" &&
            "Presenta este código QR al equipo en la entrada."}
          {status === "checked_in" &&
            `Bienvenido a ${cloudConfessionsConfig.name}.`}
          {status === "error" && errorMessage}
        </p>

        {status === "complete" ? (
          <div className="mx-auto mt-7 w-fit rounded-2xl bg-white p-3">
            <Image
              src={`/api/cloud-confessions/qr/${encodeURIComponent(token)}`}
              alt={`Código QR de entrada para ${cloudConfessionsConfig.name}`}
              width={240}
              height={240}
              priority
              unoptimized
            />
          </div>
        ) : null}

        {attendee ? (
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-lg font-semibold">
              {attendee.firstName} {attendee.lastName}
            </p>
            <p className="mt-1 text-sm text-white/60">{attendee.email}</p>
            <p className="mt-3 text-sm text-white/75">{attendee.company}</p>
            <p className="text-sm text-white/55">{attendee.jobTitle}</p>
            {attendee.checkedInAt ? (
              <p className="mt-4 text-xs uppercase tracking-wide text-cactus-green">
                Ingreso:{" "}
                {new Date(attendee.checkedInAt).toLocaleString("es-CO")}
              </p>
            ) : null}
          </div>
        ) : null}

        {status === "complete" ? (
          <div className="mt-7 border-t border-white/10 pt-6">
            {!showStaffPanel ? (
              <button
                type="button"
                onClick={() => setShowStaffPanel(true)}
                className="text-sm text-white/40 underline transition hover:text-white/70"
              >
                ¿Eres staff? Registrar asistencia
              </button>
            ) : (
              <form onSubmit={handleStaffCheckIn} className="text-left">
                <label htmlFor="cloud-confessions-staff-pin" className="mb-3 block text-sm font-medium text-white/70">
                  PIN del equipo
                </label>
                <input
                  id="cloud-confessions-staff-pin"
                  type="password"
                  inputMode="numeric"
                  className="cactus-input mb-3"
                  value={staffPin}
                  onChange={(event) => setStaffPin(event.target.value)}
                  placeholder="PIN de Cloud Confession"
                  autoComplete="off"
                />
                {staffError ? (
                  <p role="alert" className="mb-3 text-sm text-red-400">
                    {staffError}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStaffPanel(false);
                      setStaffPin("");
                      setStaffError("");
                    }}
                    className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingIn || !staffPin.trim()}
                    className="flex-1 rounded-xl bg-cactus-green py-3 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {isCheckingIn ? "Registrando..." : "Confirmar ingreso"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
