export function toApiIsoString(localDate: string): string {
  if (!localDate) return "";
  try {
    const date = new Date(localDate);
    // toISOString() -> YYYY-MM-DDTHH:mm:ss.sssZ. Remove milissegundos.
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  } catch {
    return "";
  }
} 