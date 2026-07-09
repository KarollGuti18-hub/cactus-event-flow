import { NextResponse } from "next/server";

import { isGoogleSheetsConfigured, listRowsNeedingProcessing } from "@/lib/google-sheets";

export async function GET() {
  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Faltan GOOGLE_APPS_SCRIPT_URL o SHEETS_WEBHOOK_SECRET en Vercel",
      },
      { status: 500 },
    );
  }

  try {
    const attendees = await listRowsNeedingProcessing();

    return NextResponse.json({
      ok: true,
      message: "Conexión con Google Sheets funcionando",
      pendingApprovals: attendees.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
