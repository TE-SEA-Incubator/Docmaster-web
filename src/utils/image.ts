export function getPhotoUrl(p: string | undefined | null): string {
  if (!p) return "";
  if (p.startsWith("http") || p.startsWith("data:")) return p;
  return "/" + p.replace(/^\//, "");
}
