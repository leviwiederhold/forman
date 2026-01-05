export type ApiError = { error: string };

export function getErrorMessage(json: unknown, fallback: string) {
  if (typeof json === "object" && json !== null && "error" in json) {
    const v = (json as { error?: unknown }).error;
    return typeof v === "string" ? v : fallback;
  }
  return fallback;
}

export function getStringField(json: unknown, key: string): string {
  if (typeof json === "object" && json !== null && key in json) {
    const v = (json as Record<string, unknown>)[key];
    return typeof v === "string" ? v : "";
  }
  return "";
}
