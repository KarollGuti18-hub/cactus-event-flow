"use client";

import { useEffect, useState } from "react";

interface TicketState {
  status: "loading" | "valid" | "checked_in" | "error";
  message: string;
  attendee?: {
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
  };
}

interface TicketClientProps {
  token: string;
}

export default function TicketClient({ token }: TicketClientProps) {
  const [state, setState] = useState<TicketState>({
    status: "loading",
    message: "Validando entrada...",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      try {
        const response = await fetch(`/api/ticket/${token}`);
        const data = (await response.json()) as {
          error?: string;
          alreadyCheckedIn?: boolean;
          attendee?: TicketState["attendee"];
        };

        if (cancelled) return;

        if (!response.ok) {
          setState({ status: "error", message: data.error ?? "Entrada no válida" });
          return;
        }

        setState({
          status: data.alreadyCheckedIn ? "checked_in" : "valid",
          message: data.alreadyCheckedIn
            ? "Esta entrada ya fue utilizada"
            : "Entrada válida — presenta este QR en recepción",
          attendee: data.attendee,
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Error al validar la entrada" });
        }
      }
    }

    void loadTicket();
    return () => { cancelled = true; };
  }, [token]);

  const isValid = state.status === "valid" || state.status === "checked_in";

  return (
    <main className="min-h-screen bg-cactus-bg px-6 py-16 text-white">
      <div className="mx-auto max-w-lg rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Entrada</p>

        <div
          className={`mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full ${
            state.status === "loading" ? "bg-white/10" : isValid ? "bg-cactus-green/20" : "bg-red-500/20"
          }`}
        >
          {state.status === "loading" ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cactus-green" />
          ) : isValid ? (
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
          {state.status === "loading" && "Verificando..."}
          {state.status === "valid" && "Entrada válida"}
          {state.status === "checked_in" && "Ya ingresó"}
          {state.status === "error" && "Entrada no válida"}
        </h1>

        <p className="mt-3 text-white/60">{state.message}</p>

        {state.attendee ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-lg font-semibold">
              {state.attendee.firstName} {state.attendee.lastName}
            </p>
            <p className="mt-3 text-sm text-white/75">{state.attendee.company}</p>
            <p className="text-sm text-white/55">{state.attendee.jobTitle}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
