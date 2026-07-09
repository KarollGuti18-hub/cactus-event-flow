export function extractTokenFromInput(value: string): string {
  const trimmed = value.trim();

  const urlMatch = trimmed.match(/\/(?:ticket|check-in)\/([0-9a-f-]{36})/i);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  return trimmed;
}
