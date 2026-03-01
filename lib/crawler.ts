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
  const base = input.trim();
  const withProtocol = base.startsWith("http://") || base.startsWith("https://") ? base : `https://${base}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString();
}

async function fetchText(url: string): Promise<{ status: number; headers: Record<string, string>; text: string; bytes: number }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AxiAIReadinessBot/0.2",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  const text = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
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
  const links = new Set<string>();
  const priority = ["about", "pricing", "product", "blog", "docs", "contact", "faq", "privacy", "terms"];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (["mailto:", "tel:", "javascript:"].some((prefix) => href.startsWith(prefix))) return;

    try {
      const resolved = new URL(href, root);
      if (resolved.hostname !== root.hostname) return;
      resolved.hash = "";
      for (const key of [...resolved.searchParams.keys()]) {
        if (key.startsWith("utm_")) resolved.searchParams.delete(key);
      }
      links.add(resolved.toString());
    } catch {
      return;
    }
  });

  return [...links]
    .filter((item) => item !== root.toString())
    .sort((a, b) => {
      const aScore = priority.some((p) => a.toLowerCase().includes(p)) ? 1 : 0;
      const bScore = priority.some((p) => b.toLowerCase().includes(p)) ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, limit);
}

export async function crawlWebsite(urlInput: string): Promise<CrawlResult> {
  const normalizedUrl = normalizeUrl(urlInput);
  const warnings: string[] = [];

  const homepageFetch = await fetchText(normalizedUrl);
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

  const pages: PageSnapshot[] = [];
  for (const link of chooseKeyLinks(normalizedUrl, homepage.html)) {
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

  return { normalizedUrl, homepage, pages, robotsTxtExists, sitemapExists, warnings };
}
