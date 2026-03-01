import { load } from "cheerio";

export type PageSnapshot = {
  url: string;
  status: number;
  html: string;
  headers: Record<string, string>;
  bytes: number;
};

export type CrawlResult = {
  normalizedUrl: string;
  homepage: PageSnapshot;
  pages: PageSnapshot[];
  robotsTxtExists: boolean;
  sitemapExists: boolean;
  warnings: string[];
};

function normalizeUrl(input: string): string {
  const value = input.trim();
  const ensured = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  const url = new URL(ensured);
  url.hash = "";
  return url.toString();
}

async function fetchText(url: string): Promise<{ status: number; headers: Record<string, string>; text: string; bytes: number }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AxiAIReadinessBot/0.1 (+https://example.com/bot)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  const text = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  return {
    status: response.status,
    headers,
    text,
    bytes: Buffer.byteLength(text)
  };
}

function chooseKeyLinks(homeUrl: string, html: string, limit = 10): string[] {
  const $ = load(html);
  const root = new URL(homeUrl);
  const hrefs = new Set<string>();
  const priorityFragments = ["about", "pricing", "product", "blog", "docs", "contact", "faq", "privacy", "terms"];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, root).toString();
      const parsed = new URL(resolved);
      if (parsed.hostname !== root.hostname) return;
      if (["mailto:", "tel:", "javascript:"].some((bad) => href.startsWith(bad))) return;
      parsed.hash = "";
      parsed.searchParams.forEach((_, key) => {
        if (key.startsWith("utm_")) {
          parsed.searchParams.delete(key);
        }
      });
      hrefs.add(parsed.toString());
    } catch {
      return;
    }
  });

  const sorted = Array.from(hrefs).sort((a, b) => {
    const aScore = priorityFragments.some((f) => a.toLowerCase().includes(f)) ? 1 : 0;
    const bScore = priorityFragments.some((f) => b.toLowerCase().includes(f)) ? 1 : 0;
    return bScore - aScore;
  });

  return sorted.filter((u) => u !== root.toString()).slice(0, limit);
}

export async function crawlWebsite(urlInput: string): Promise<CrawlResult> {
  const normalizedUrl = normalizeUrl(urlInput);
  const warnings: string[] = [];

  let homepageFetch: Awaited<ReturnType<typeof fetchText>>;
  try {
    homepageFetch = await fetchText(normalizedUrl);
  } catch (error) {
    throw new Error(`Unable to fetch homepage: ${(error as Error).message}`);
  }

  const homepage: PageSnapshot = {
    url: normalizedUrl,
    status: homepageFetch.status,
    html: homepageFetch.text,
    headers: homepageFetch.headers,
    bytes: homepageFetch.bytes
  };

  const robotsUrl = new URL("/robots.txt", normalizedUrl).toString();
  const sitemapUrl = new URL("/sitemap.xml", normalizedUrl).toString();

  const [robotsTxtExists, sitemapExists] = await Promise.all([
    fetch(robotsUrl).then((r) => r.ok).catch(() => false),
    fetch(sitemapUrl).then((r) => r.ok).catch(() => false)
  ]);

  const keyLinks = chooseKeyLinks(normalizedUrl, homepage.html);
  const pages: PageSnapshot[] = [];

  for (const link of keyLinks) {
    try {
      const fetched = await fetchText(link);
      pages.push({
        url: link,
        status: fetched.status,
        html: fetched.text,
        headers: fetched.headers,
        bytes: fetched.bytes
      });
    } catch {
      warnings.push(`Unable to fetch linked page: ${link}`);
    }
  }

  if (pages.length === 0) {
    warnings.push("Only homepage analyzed. Could not retrieve internal links.");
  }

  return {
    normalizedUrl,
    homepage,
    pages,
    robotsTxtExists,
    sitemapExists,
    warnings
  };
}
