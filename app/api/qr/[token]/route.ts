import { NextResponse } from "next/server";

import { findAttendeeByToken, isGoogleSheetsConfigured } from "@/lib/google-sheets";
import { generateQrPng, getCheckInUrl } from "@/lib/qr";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token?.trim()) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    if (isGoogleSheetsConfigured()) {
      const attendee = await findAttendeeByToken(token);

      if (!attendee || attendee.status !== "aprobado") {
        return NextResponse.json({ error: "QR no válido" }, { status: 404 });
      }
    }

    const png = await generateQrPng(getCheckInUrl(token));

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "No pudimos generar el QR" }, { status: 500 });
  }
}
