import { load } from "cheerio";

const PRIORITY_FRAGMENTS = ["pricing", "docs", "api", "about", "contact", "security", "status", "help"];

export function normalizeTargetUrl(input: string): URL {
  const base = input.trim();
  const candidate = base.startsWith("http://") || base.startsWith("https://") ? base : `https://${base}`;
  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  url.hash = "";
  return url;
}

function scoreLink(url: URL): number {
  const text = `${url.pathname} ${url.href}`.toLowerCase();
  let score = 0;
  for (const fragment of PRIORITY_FRAGMENTS) {
    if (text.includes(fragment)) score += 5;
  }
  if (url.pathname.split("/").filter(Boolean).length <= 2) score += 2;
  return score;
}

export function selectKeyInternalLinks(homeUrl: URL, html: string, limit: number): string[] {
  const $ = load(html);
  const dedup = new Map<string, number>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

    try {
      const resolved = new URL(href, homeUrl);
      if (resolved.hostname !== homeUrl.hostname) return;
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
      resolved.hash = "";
      for (const key of [...resolved.searchParams.keys()]) {
        if (key.startsWith("utm_")) {
          resolved.searchParams.delete(key);
        }
      }
      const normalized = resolved.toString();
      if (normalized === homeUrl.toString()) return;

      const currentScore = dedup.get(normalized) ?? -1;
      const nextScore = scoreLink(resolved);
      if (nextScore > currentScore) {
        dedup.set(normalized, nextScore);
      }
    } catch {
      return;
    }
  });

  return [...dedup.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([url]) => url);
}
