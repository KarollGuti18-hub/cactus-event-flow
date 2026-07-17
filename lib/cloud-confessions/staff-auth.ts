import { timingSafeEqual } from "crypto";

export function isValidCloudConfessionsStaffPin(pin: string | undefined): boolean {
  const expected = process.env.CLOUD_CONFESSIONS_STAFF_CHECKIN_PIN?.trim();
  const received = pin?.trim();

  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
