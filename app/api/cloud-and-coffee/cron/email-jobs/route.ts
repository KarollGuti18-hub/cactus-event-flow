import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { processDueCloudCoffeeEmailJobs } from "@/lib/cloud-confessions/email-flow";

function isAuthorized(request: Request): boolean {
  const expected =
    process.env.CLOUD_CONFESSIONS_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const header = request.headers.get("authorization")?.trim() ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret")?.trim() ?? "";
  const received = bearer || query;
  if (!received) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await processDueCloudCoffeeEmailJobs();
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Cloud & Coffee email cron failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No se pudo procesar la cola" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
