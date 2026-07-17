import { NextResponse } from "next/server";

import {
  findCloudConfessionsAttendeeByToken,
  isCloudConfessionsGoogleSheetsConfigured,
} from "@/lib/cloud-confessions/google-sheets";
import {
  generateQrPng,
  getCloudConfessionsTicketUrl,
} from "@/lib/cloud-confessions/qr";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isCloudConfessionsGoogleSheetsConfigured()) {
      return NextResponse.json(
        { error: "Google Sheets de Cloud Confessions no configurado" },
        { status: 500 },
      );
    }

    const { token } = await context.params;
    if (!token?.trim()) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const attendee = await findCloudConfessionsAttendeeByToken(token);
    if (!attendee || attendee.status !== "aprobado") {
      return NextResponse.json({ error: "QR no válido" }, { status: 404 });
    }

    const png = await generateQrPng(getCloudConfessionsTicketUrl(token));

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos generar el QR" },
      { status: 500 },
    );
  }
}
