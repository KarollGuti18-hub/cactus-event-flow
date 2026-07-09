"use client";

import { useEffect, useState } from "react";

interface CheckInState {
  status: "loading" | "success" | "already" | "error";
  message: string;
  attendee?: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    jobTitle: string;
    checkedInAt: string;
  };
}

interface CheckInPageProps {
  token: string;
}

export default function CheckInClient({ token }: CheckInPageProps) {
  const [state, setState] = useState<CheckInState>({
    status: "loading",
    message: "Validando acceso...",
  });

  useEffect(() => {
    let cancelled = false;

    async function checkIn() {
      try {
        const response = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as {
          error?: string;
          alreadyCheckedIn?: boolean;
          attendee?: CheckInState["attendee"];
        };

        if (cancelled) return;

        if (!response.ok) {
          setState({ status: "error", message: data.error ?? "No pudimos validar el acceso" });
          return;
        }

        setState({
          status: data.alreadyCheckedIn ? "already" : "success",
          message: data.alreadyCheckedIn
            ? "Esta persona ya había ingresado al evento"
            : "Asistencia registrada correctamente",
          attendee: data.attendee,
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Error de conexión al registrar asistencia" });
        }
      }
    }

    void checkIn();
    return () => { cancelled = true; };
  }, [token]);

  const isPositive = state.status === "success" || state.status === "already";

  return (
    <main className="min-h-screen bg-cactus-bg px-6 py-16 text-white">
      <div className="mx-auto max-w-lg rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Check-in</p>

        <div
          className={`mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full ${
            state.status === "loading" ? "bg-white/10" : isPositive ? "bg-cactus-green/20" : "bg-red-500/20"
          }`}
        >
          {state.status === "loading" ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cactus-green" />
          ) : isPositive ? (
            <svg className="h-10 w-10 text-cactus-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h1 className="mt-6 text-2xl font-bold">
          {state.status === "loading" && "Procesando..."}
          {state.status === "success" && "¡Bienvenido al evento!"}
          {state.status === "already" && "Ya registrado"}
          {state.status === "error" && "Acceso no válido"}
        </h1>

        <p className="mt-3 text-white/60">{state.message}</p>

        {state.attendee ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-lg font-semibold">
              {state.attendee.firstName} {state.attendee.lastName}
            </p>
            <p className="mt-1 text-sm text-white/60">{state.attendee.email}</p>
            <p className="mt-3 text-sm text-white/75">{state.attendee.company}</p>
            <p className="text-sm text-white/55">{state.attendee.jobTitle}</p>
            {state.attendee.checkedInAt ? (
              <p className="mt-4 text-xs uppercase tracking-wide text-cactus-green">
                Ingreso: {new Date(state.attendee.checkedInAt).toLocaleString("es-CO")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
