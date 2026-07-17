"use client";

import { useEffect, useRef, useState } from "react";

import { cloudConfessionsConfig } from "@/lib/cloud-confessions/config";
import { extractCloudConfessionsToken } from "@/lib/cloud-confessions/qr";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function CloudConfessionsStaffCheckInClient() {
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const scannerContainerId = "cloud-confessions-qr-reader";

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
            const token = extractCloudConfessionsToken(decodedText);
            if (!UUID_PATTERN.test(token)) {
              setScanError(
                "Este QR no pertenece a Cloud Confession o no es válido.",
              );
              return;
            }

            await scanner.clear().catch(() => undefined);
            scannerRef.current = null;
            window.location.href = `/cloud-confessions/ticket/${token}`;
          },
          () => undefined,
        );
      } catch {
        setScanError(
          "No pudimos abrir la cámara. Revisa el permiso de cámara e intenta de nuevo.",
        );
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
        <p className="text-sm font-semibold uppercase tracking-widest text-cactus-green">
          Staff · {cloudConfessionsConfig.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold">Escanear entrada</h1>
        <p className="mt-2 text-sm text-white/60">
          Escanea únicamente QRs de Cloud Confession. Después confirma el
          ingreso con el PIN independiente del evento.
        </p>

        <div className="mt-6 rounded-3xl border border-cactus-green/20 bg-cactus-bg-card p-6">
          <div id={scannerContainerId} />
          {scanError ? (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {scanError}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
