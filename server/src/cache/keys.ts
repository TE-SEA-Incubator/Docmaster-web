import { createHash } from "crypto";
import { getCacheVersion } from "./cache.ts";

export const PUBLIC_SEARCH_VERSION = "public:search";
export const PUBLIC_DOC_TYPES_VERSION = "public:document-types";

export const MAX_PUBLIC_SEARCH_QUERY_LENGTH = 80;

export function normalizePublicSearchQuery(query?: string): string {
  const normalized = (query || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_PUBLIC_SEARCH_QUERY_LENGTH);

  return normalized;
}

export async function buildPublicSearchCacheKey(query?: string, type?: string): Promise<string> {
  const normalized = normalizePublicSearchQuery(query);
  const normalizedType = (type || "").trim().toUpperCase();
  const version = await getCacheVersion(PUBLIC_SEARCH_VERSION);

  const digest = normalized
    ? createHash("sha256").update(normalized).digest("hex").slice(0, 32)
    : "__all__";
  return `pub:search:${version}:${digest}:${normalizedType || "__any_type__"}`;
}

export async function buildPublicDocumentTypesCacheKey(): Promise<string> {
  const version = await getCacheVersion(PUBLIC_DOC_TYPES_VERSION);
  return `pub:document-types:${version}`;
}

export function normalizeStatsPeriod(period?: string): string {
  return ["day", "week", "month", "year"].includes(period || "")
    ? (period as string)
    : "month";
}
