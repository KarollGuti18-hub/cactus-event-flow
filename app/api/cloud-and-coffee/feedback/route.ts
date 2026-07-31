import { NextResponse } from "next/server";

import {
  parseFeedbackRating,
} from "@/lib/cloud-confessions/feedback";
import {
  findCloudConfessionsAttendeeByToken,
  isCloudConfessionsGoogleSheetsConfigured,
  upsertCloudConfessionsFeedback,
} from "@/lib/cloud-confessions/google-sheets";

interface FeedbackPayload {
  token?: string;
  rating?: number | string;
  comment?: string;
  source?: string;
}

export async function POST(request: Request) {
  try {
    if (!isCloudConfessionsGoogleSheetsConfigured()) {
      return NextResponse.json(
        { error: "Google Sheets no configurado" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as FeedbackPayload;
    const token = body.token?.trim() ?? "";
    const rating = parseFeedbackRating(body.rating);
    const comment =
      typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 40)
        : "page";

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }
    if (!rating) {
      return NextResponse.json(
        { error: "Calificación inválida" },
        { status: 400 },
      );
    }

    const attendee = await findCloudConfessionsAttendeeByToken(token);
    if (!attendee) {
      return NextResponse.json(
        { error: "Enlace de feedback no válido" },
        { status: 404 },
      );
    }

    await upsertCloudConfessionsFeedback({
      email: attendee.email,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      qrToken: token,
      rating,
      comment,
      source,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cloud & Coffee feedback failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "No pudimos guardar tu feedback" },
      { status: 500 },
    );
  }
}
