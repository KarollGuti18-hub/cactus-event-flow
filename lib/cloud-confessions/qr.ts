import { getAppUrl } from "@/lib/app-url";
import { generateQrPng, generateQrToken } from "@/lib/qr";

const CLOUD_CONFESSIONS_BASE_PATH = "/cloud-confessions";

export { generateQrPng, generateQrToken };

export function getCloudConfessionsTicketUrl(token: string): string {
  return `${getAppUrl()}${CLOUD_CONFESSIONS_BASE_PATH}/ticket/${token}`;
}

export function getCloudConfessionsQrImageUrl(token: string): string {
  return `${getAppUrl()}/api/cloud-confessions/qr/${token}`;
}

export function extractCloudConfessionsToken(value: string): string {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(
    /\/cloud-confessions\/(?:ticket|check-in)\/([0-9a-f-]{36})/i,
  );

  return urlMatch?.[1] ?? trimmed;
}
