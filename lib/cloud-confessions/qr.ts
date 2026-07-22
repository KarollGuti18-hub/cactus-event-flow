import { getAppUrl } from "@/lib/app-url";
import { generateQrPng, generateQrToken } from "@/lib/qr";

const CLOUD_AND_COFFEE_BASE_PATH = "/cloud-and-coffee";

export { generateQrPng, generateQrToken };

export function getCloudConfessionsTicketUrl(token: string): string {
  return `${getAppUrl()}${CLOUD_AND_COFFEE_BASE_PATH}/ticket/${token}`;
}

export function getCloudConfessionsQrImageUrl(token: string): string {
  return `${getAppUrl()}/api/cloud-and-coffee/qr/${token}`;
}

export function extractCloudConfessionsToken(value: string): string {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(
    /\/(?:cloud-and-coffee|cloud-confessions)\/(?:ticket|check-in)\/([0-9a-f-]{36})/i,
  );

  return urlMatch?.[1] ?? trimmed;
}
