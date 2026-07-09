import { randomUUID } from "crypto";
import QRCode from "qrcode";

import { getAppUrl } from "@/lib/app-url";

export function generateQrToken(): string {
  return randomUUID();
}

export function getCheckInUrl(token: string): string {
  return `${getAppUrl()}/check-in/${token}`;
}

export function getQrImageUrl(token: string): string {
  return `${getAppUrl()}/api/qr/${token}`;
}

export async function generateQrPng(checkInUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(checkInUrl, {
    type: "png",
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#1a1a1a",
      light: "#ffffff",
    },
  });
}
