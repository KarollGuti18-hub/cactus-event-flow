import { NextResponse } from "next/server";

import { processPendingApprovals } from "@/lib/approval";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const results = await processPendingApprovals();

    return NextResponse.json(
      {
        success: true,
        processed: results.length,
        results,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en cron de aprobaciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
