import { NextResponse } from "next/server";

import { isValidStaffPin } from "@/lib/staff-auth";

interface VerifyPinPayload {
  pin?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyPinPayload;

  if (!process.env.STAFF_CHECKIN_PIN?.trim()) {
    return NextResponse.json(
      { error: "STAFF_CHECKIN_PIN no configurado en Vercel" },
      { status: 500 },
    );
  }

  if (!isValidStaffPin(body.pin)) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
