"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { extractTokenFromInput } from "@/lib/token-utils";

interface AttendeePreview {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  checkedInAt: string;
}

type StaffPhase = "pin" | "scanner" | "confirm" | "done";

export default function StaffCheckInClient() {
  const [phase, setPhase] = useState<StaffPhase>("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [scanError, setScanError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [staffPin, setStaffPin] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [preview, setPreview] = useState<AttendeePreview | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const scannerContainerId = "staff-qr-reader";

  useEffect(() => {
    if (phase !== "scanner") {
      void scannerRef.current?.clear().catch(() => undefined);
      scannerRef.current = null;
      return;
    }

    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5QrcodeScanner(
          scannerContainerId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false,
        );

        scannerRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            await scanner.clear().catch(() => undefined);
            scannerRef.current = null;
            void loadPreview(extractTokenFromInput(decodedText));
          },
          () => undefined,
        );
      } catch {
        setScanError("No pudimos abrir la cámara. Usa el campo de texto para pegar el código.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void scannerRef.current?.clear().catch(() => undefined);
    };
  }, [phase]);

  async function handlePinSubmit(e: FormEvent) {
    e.preventDefault();
    setPinError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/staff/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setPinError(data.error ?? "PIN incorrecto");
        return;
      }

      setStaffPin(pin);
      setPhase("scanner");
    } catch {
      setPinError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPreview(token: string) {
    if (!token) {
      setScanError("Código no válido");
      return;
    }

    setScanError("");
    setActionError("");
    setIsLoading(true);
    setActiveToken(token);

    try {
      const response = await fetch(`/api/ticket/${token}`);
      const data = (await response.json()) as {
        error?: string;
        alreadyCheckedIn?: boolean;
        attendee?: AttendeePreview;
      };

      if (!response.ok) {
        setScanError(data.error ?? "Entrada no válida");
        setPhase("scanner");
        return;
      }

      setPreview(data.attendee ?? null);
      setAlreadyCheckedIn(Boolean(data.alreadyCheckedIn));
      setPhase("confirm");
    } catch {
      setScanError("Error al leer la entrada");
      setPhase("scanner");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManualLookup(e: FormEvent) {
    e.preventDefault();
    await loadPreview(extractTokenFromInput(tokenInput));
  }

  async function confirmCheckIn() {
    setActionError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeToken, staffPin }),
      });

      const data = (await response.json()) as {
        error?: string;
        alreadyCheckedIn?: boolean;
        attendee?: AttendeePreview;
      };

      if (!response.ok) {
        setActionError(data.error ?? "No pudimos registrar el ingreso");
        return;
      }

      setPreview(data.attendee ?? preview);
      setDoneMessage(
        data.alreadyCheckedIn
          ? "Esta persona ya había ingresado"
          : "¡Ingreso registrado correctamente!",
      );
      setPhase("done");
    } catch {
      setActionError("Error de conexión al registrar ingreso");
    } finally {
      setIsLoading(false);
    }
  }

  function resetScanner() {
    setPreview(null);
    setActiveToken("");
    setTokenInput("");
    setScanError("");
    setActionError("");
    setDoneMessage("");
    setAlreadyCheckedIn(false);
    setPhase("scanner");
  }

  function logout() {
    setStaffPin("");
    setPin("");
    resetScanner();
    setPhase("pin");
  }

  return (
    <main className="min-h-screen bg-cactus-bg px-6 py-10 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Staff</p>
            <h1 className="text-2xl font-bold">Check-in del evento</h1>
          </div>
          {phase !== "pin" ? (
            <button
              type="button"
              onClick={logout}
              className="text-sm text-white/50 underline hover:text-white/80"
            >
              Salir
            </button>
          ) : null}
        </div>

        {phase === "pin" ? (
          <form onSubmit={handlePinSubmit} className="rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-8">
            <label htmlFor="staff-pin" className="mb-2 block text-sm font-medium text-white/70">
              PIN del equipo
            </label>
            <input
              id="staff-pin"
              type="password"
              inputMode="numeric"
              className="cactus-input mb-4"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingresa el PIN"
              autoComplete="off"
            />
            {pinError ? <p className="mb-4 text-sm text-red-400">{pinError}</p> : null}
            <button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="w-full rounded-xl bg-cactus-green py-3 font-semibold text-black disabled:opacity-50"
            >
              {isLoading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        ) : null}

        {phase === "scanner" ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-6">
              <p className="mb-4 text-sm text-white/60">Escanea el QR del asistente con la cámara</p>
              <div id={scannerContainerId} />
              {scanError ? <p className="mt-4 text-sm text-red-400">{scanError}</p> : null}
            </div>

            <form onSubmit={handleManualLookup} className="rounded-3xl border border-white/10 bg-cactus-bg-card p-6">
              <p className="mb-3 text-sm text-white/60">O pega el código / URL del QR</p>
              <input
                type="text"
                className="cactus-input mb-3"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Token o URL del ticket"
              />
              <button
                type="submit"
                disabled={isLoading || !tokenInput.trim()}
                className="w-full rounded-xl border border-white/20 py-3 font-medium disabled:opacity-50"
              >
                Buscar entrada
              </button>
            </form>
          </div>
        ) : null}

        {phase === "confirm" && preview ? (
          <div className="rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-8">
            <p className="text-sm uppercase tracking-widest text-cactus-green">
              {alreadyCheckedIn ? "Ya registrado" : "Confirmar ingreso"}
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xl font-bold">
                {preview.firstName} {preview.lastName}
              </p>
              <p className="mt-1 text-sm text-white/60">{preview.email}</p>
              <p className="mt-3 text-sm text-white/75">{preview.company}</p>
              <p className="text-sm text-white/55">{preview.jobTitle}</p>
            </div>
            {actionError ? <p className="mt-4 text-sm text-red-400">{actionError}</p> : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={resetScanner}
                className="flex-1 rounded-xl border border-white/20 py-3 font-medium"
              >
                Cancelar
              </button>
              {!alreadyCheckedIn ? (
                <button
                  type="button"
                  onClick={() => void confirmCheckIn()}
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-cactus-green py-3 font-semibold text-black disabled:opacity-50"
                >
                  {isLoading ? "Registrando..." : "Confirmar ingreso"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {phase === "done" && preview ? (
          <div className="rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cactus-green/20">
              <svg className="h-8 w-8 text-cactus-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold">{doneMessage}</h2>
            <p className="mt-2 text-white/60">
              {preview.firstName} {preview.lastName}
            </p>
            <button
              type="button"
              onClick={resetScanner}
              className="mt-8 w-full rounded-xl bg-cactus-green py-3 font-semibold text-black"
            >
              Escanear siguiente
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
