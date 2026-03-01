import { load } from "cheerio";
import type { CategoryId, CategoryScore, Check, Report } from "./types.js";
import type { CrawlResult } from "./crawler.js";

const CATEGORY_META: Record<CategoryId, { label: string; weight: number }> = {
  crawlability: { label: "Crawlability & Indexing", weight: 20 },
  structured_data: { label: "Structured Data & Entity Clarity", weight: 20 },
  content: { label: "Content Extractability & Semantics", weight: 20 },
  trust: { label: "Trust & Policy Signals", weight: 15 },
  performance: { label: "Technical Performance & Accessibility", weight: 15 },
  freshness: { label: "Freshness & Discoverability", weight: 10 }
};

const OUTCOME_SCORE = {
  pass: 1,
  warn: 0.5,
  fail: 0,
  na: 0.7
} as const;

function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function makeCheck(input: Omit<Check, "id">): Check {
  return {
    id: `${input.categoryId}:${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...input
  };
}

function analyzePageBasics(url: string, html: string): Check[] {
  const $ = load(html);
  const title = $("title").text().trim();
  const description = $("meta[name='description']").attr("content")?.trim() || "";
  const h1 = $("h1").first().text().trim();
  const canonical = $("link[rel='canonical']").attr("href")?.trim();
  const ldJsonCount = $("script[type='application/ld+json']").length;
  const ogTitle = $("meta[property='og:title']").attr("content");
  const imgCount = $("img").length;
  const imgAltCount = $("img[alt]").length;
  const hasLastModified = Boolean($("time[datetime]").length) || /last updated|updated on/i.test($.text());

  return [
    makeCheck({
      categoryId: "content",
      title: "Descriptive title tag",
      description: "Checks whether page has a meaningful <title> for AI extractability.",
      impactWeight: 4,
      outcome: title.length >= 20 ? "pass" : title.length > 0 ? "warn" : "fail",
      evidence: title ? `Title length: ${title.length}` : "No <title> tag found",
      recommendation: "Add a descriptive title between 20-70 characters."
    }),
    makeCheck({
      categoryId: "content",
      title: "Meta description present",
      description: "Checks for meta description that helps summarization context.",
      impactWeight: 3,
      outcome: description.length >= 80 ? "pass" : description.length > 0 ? "warn" : "fail",
      evidence: description ? `Description length: ${description.length}` : "No meta description",
      recommendation: "Add a concise meta description with clear entity/context."
    }),
    makeCheck({
      categoryId: "content",
      title: "Primary H1 heading",
      description: "Checks whether there is a clear H1 section anchor.",
      impactWeight: 3,
      outcome: h1 ? "pass" : "fail",
      evidence: h1 ? `H1 found: ${h1.slice(0, 120)}` : "No H1 tag detected",
      recommendation: "Include one clear H1 heading per important page."
    }),
    makeCheck({
      categoryId: "crawlability",
      title: "Canonical URL signal",
      description: "Checks for canonical URL to reduce duplicate content ambiguity.",
      impactWeight: 3,
      outcome: canonical ? "pass" : "warn",
      evidence: canonical ? `Canonical: ${canonical}` : "No canonical tag",
      recommendation: "Add rel=canonical for key pages."
    }),
    makeCheck({
      categoryId: "structured_data",
      title: "Schema.org JSON-LD",
      description: "Checks for machine-readable structured data blocks.",
      impactWeight: 5,
      outcome: ldJsonCount >= 1 ? "pass" : "fail",
      evidence: `JSON-LD blocks: ${ldJsonCount}`,
      recommendation: "Add Organization, WebSite, and page-specific schema markup."
    }),
    makeCheck({
      categoryId: "structured_data",
      title: "Open Graph metadata",
      description: "Checks for Open Graph metadata presence.",
      impactWeight: 3,
      outcome: ogTitle ? "pass" : "warn",
      evidence: ogTitle ? `og:title present` : "Missing og:title",
      recommendation: "Add Open Graph tags for richer machine context."
    }),
    makeCheck({
      categoryId: "performance",
      title: "Image alt coverage",
      description: "Checks accessibility and machine-readable image context.",
      impactWeight: 3,
      outcome: imgCount === 0 ? "na" : imgAltCount / imgCount >= 0.8 ? "pass" : imgAltCount / imgCount >= 0.4 ? "warn" : "fail",
      evidence: `Images with alt: ${imgAltCount}/${imgCount}`,
      recommendation: "Add descriptive alt text to meaningful images."
    }),
    makeCheck({
      categoryId: "freshness",
      title: "Freshness timestamp hints",
      description: "Checks if page exposes update dates.",
      impactWeight: 2,
      outcome: hasLastModified ? "pass" : "warn",
      evidence: hasLastModified ? "Found datetime or updated signal" : "No explicit freshness signal",
      recommendation: "Expose publish/updated date where relevant."
    }),
    makeCheck({
      categoryId: "trust",
      title: "HTTPS protocol",
      description: "Checks transport security signal.",
      impactWeight: 4,
      outcome: url.startsWith("https://") ? "pass" : "fail",
      evidence: `URL protocol: ${url.startsWith("https://") ? "HTTPS" : "non-HTTPS"}`,
      recommendation: "Serve site over HTTPS."
    })
  ];
}

export function scoreCrawl(crawl: CrawlResult): Omit<Report, "id" | "createdAt" | "lockStatus"> {
  const checks: Check[] = [];
  const pages = [crawl.homepage, ...crawl.pages];

  for (const page of pages) {
    checks.push(...analyzePageBasics(page.url, page.html));
  }

  checks.push(
    makeCheck({
      categoryId: "crawlability",
      title: "robots.txt available",
      description: "Checks if robots.txt exists for crawler directives.",
      impactWeight: 4,
      outcome: crawl.robotsTxtExists ? "pass" : "warn",
      evidence: crawl.robotsTxtExists ? "robots.txt found" : "robots.txt not found",
      recommendation: "Provide robots.txt with clear AI crawler policy."
    }),
    makeCheck({
      categoryId: "crawlability",
      title: "sitemap.xml available",
      description: "Checks for sitemap discoverability signal.",
      impactWeight: 4,
      outcome: crawl.sitemapExists ? "pass" : "warn",
      evidence: crawl.sitemapExists ? "sitemap.xml found" : "sitemap.xml not found",
      recommendation: "Publish sitemap.xml and reference it from robots.txt."
    })
  );

  const combinedText = [crawl.homepage, ...crawl.pages].map((p) => p.html.toLowerCase()).join(" ");
  const hasPrivacy = /privacy policy/.test(combinedText);
  const hasTerms = /terms of service|terms & conditions|terms and conditions/.test(combinedText);
  const hasContact = /contact us|support@|mailto:/.test(combinedText);

  checks.push(
    makeCheck({
      categoryId: "trust",
      title: "Privacy policy discoverability",
      description: "Checks if privacy policy signal is discoverable.",
      impactWeight: 3,
      outcome: hasPrivacy ? "pass" : "warn",
      evidence: hasPrivacy ? "Privacy policy text detected" : "No privacy policy text detected",
      recommendation: "Link a visible privacy policy page."
    }),
    makeCheck({
      categoryId: "trust",
      title: "Terms discoverability",
      description: "Checks if legal terms are discoverable.",
      impactWeight: 2,
      outcome: hasTerms ? "pass" : "warn",
      evidence: hasTerms ? "Terms text detected" : "No terms text detected",
      recommendation: "Link terms and conditions from footer/nav."
    }),
    makeCheck({
      categoryId: "trust",
      title: "Contact signal",
      description: "Checks for clear contact/support discoverability.",
      impactWeight: 2,
      outcome: hasContact ? "pass" : "warn",
      evidence: hasContact ? "Contact/support text detected" : "No clear contact text detected",
      recommendation: "Expose contact page or support email."
    })
  );

  const avgBytes = pages.reduce((sum, p) => sum + p.bytes, 0) / Math.max(1, pages.length);
  checks.push(
    makeCheck({
      categoryId: "performance",
      title: "HTML payload size",
      description: "Heuristic check on raw HTML response size.",
      impactWeight: 4,
      outcome: avgBytes < 300_000 ? "pass" : avgBytes < 700_000 ? "warn" : "fail",
      evidence: `Average HTML bytes: ${Math.round(avgBytes)}`,
      recommendation: "Reduce page bloat and keep content structure lean."
    }),
    makeCheck({
      categoryId: "freshness",
      title: "Content cadence signal",
      description: "Checks if site appears to publish recently-updated content.",
      impactWeight: 3,
      outcome: /202[4-6]/.test(combinedText) ? "pass" : "warn",
      evidence: /202[4-6]/.test(combinedText) ? "Recent year markers found" : "Few recent temporal markers found",
      recommendation: "Publish and timestamp fresh content regularly."
    })
  );

  const categoryScores: CategoryScore[] = (Object.keys(CATEGORY_META) as CategoryId[]).map((categoryId) => {
    const meta = CATEGORY_META[categoryId];
    const inCategory = checks.filter((c) => c.categoryId === categoryId);

    let weighted = 0;
    let weights = 0;
    for (const check of inCategory) {
      weighted += OUTCOME_SCORE[check.outcome] * check.impactWeight;
      weights += check.impactWeight;
    }

    const score = weights === 0 ? 0 : pct((weighted / weights) * 100);
    return {
      categoryId,
      label: meta.label,
      weight: meta.weight,
      score
    };
  });

  const overallRaw = categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0) / 100;
  const overallScore = pct(overallRaw);

  const topFixes = checks
    .filter((c) => c.outcome !== "pass")
    .sort((a, b) => {
      const rank = (check: Check) => {
        const outcomePenalty = check.outcome === "fail" ? 2 : check.outcome === "warn" ? 1 : 0;
        return outcomePenalty * check.impactWeight;
      };
      return rank(b) - rank(a);
    })
    .slice(0, 8);

  return {
    url: crawl.homepage.url,
    normalizedUrl: crawl.normalizedUrl,
    overallScore,
    categoryScores,
    checks,
    topFixes
  };
}
