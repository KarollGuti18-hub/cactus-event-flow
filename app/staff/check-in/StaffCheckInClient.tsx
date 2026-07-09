"use client";

import { useEffect, useRef, useState } from "react";

import { extractTokenFromInput } from "@/lib/token-utils";

function navigateToTicket(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/^https?:\/\//i);

  if (urlMatch) {
    window.location.href = trimmed;
    return;
  }

  const token = extractTokenFromInput(trimmed);
  window.location.href = `/ticket/${token}`;
}

export default function StaffCheckInClient() {
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const scannerContainerId = "staff-qr-reader";

  useEffect(() => {
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
            navigateToTicket(decodedText);
          },
          () => undefined,
        );
      } catch {
        setScanError("No pudimos abrir la cámara. Escanea el QR con la cámara del celular.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void scannerRef.current?.clear().catch(() => undefined);
    };
  }, []);

  return (
    <main className="min-h-screen bg-cactus-bg px-6 py-10 text-white">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">Staff</p>
        <h1 className="mt-1 text-2xl font-bold">Escanear QR</h1>
        <p className="mt-2 text-sm text-white/60">
          Escanea el código del asistente para abrir su registro y confirmar el ingreso con PIN.
        </p>

        <div className="mt-6 rounded-3xl border border-[#7F9B28]/20 bg-cactus-bg-card p-6">
          <div id={scannerContainerId} />
          {scanError ? <p className="mt-4 text-sm text-red-400">{scanError}</p> : null}
        </div>
      </div>
    </main>
  );
}
