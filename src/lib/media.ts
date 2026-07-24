/** Turn API-relative paths (/uploads/...) into loadable Image URIs. */
export function mediaUrl(baseUrl: string, url?: string | null): string | undefined {
  const u = (url || "").trim();
  if (!u) return undefined;
  if (/^(https?:|file:|data:|content:)/i.test(u)) return u;
  const base = baseUrl.replace(/\/$/, "");
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}
