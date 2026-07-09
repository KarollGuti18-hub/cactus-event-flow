export function isValidStaffPin(pin: string | undefined): boolean {
  const expected = process.env.STAFF_CHECKIN_PIN?.trim();

  if (!expected) {
    return false;
  }

  return pin?.trim() === expected;
}
