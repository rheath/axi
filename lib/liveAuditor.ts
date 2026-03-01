import { runDeterministicLiveChecks, type LivePage } from "./liveChecks";
import { normalizeTargetUrl, selectKeyInternalLinks } from "./linkSelector";
import type { AuditExecutionResult, Blocker, CategoryKey, HeaderState } from "./mriModel";

const MAX_TOTAL_PAGES = 8;
const MAX_PAGE_BYTES = 750_000;
const REQUEST_TIMEOUT_MS = 6_000;
const TOTAL_TIMEOUT_MS = 25_000;
const USER_AGENT = "AXI-LiveAuditor/1.0 (+https://axi.idrawcircles.com/)";

type RobotsResult = {
  available: boolean;
  disallowPrefixes: string[];
};

export class LiveAuditError extends Error {
  status: number;
  code: string;
  details?: string;

  constructor(status: number, code: string, message: string, details?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function hasDeadlinePassed(deadlineMs: number): boolean {
  return Date.now() >= deadlineMs;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobots(body: string): string[] {
  const disallow: string[] = [];
  let activeForAll = false;

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const userAgentMatch = line.match(/^user-agent\s*:\s*(.+)$/i);
    if (userAgentMatch) {
      const ua = userAgentMatch[1].trim().toLowerCase();
      activeForAll = ua === "*";
      continue;
    }

    if (!activeForAll) continue;

    const disallowMatch = line.match(/^disallow\s*:\s*(.*)$/i);
    if (disallowMatch) {
      const value = disallowMatch[1].trim();
      if (value) disallow.push(value);
    }
  }

  return disallow;
}

function pathBlockedByRobots(pathname: string, disallowPrefixes: string[]): boolean {
  if (!disallowPrefixes.length) return false;
  return disallowPrefixes.some((prefix) => {
    if (prefix === "/") return true;
    return pathname.startsWith(prefix);
  });
}

async function fetchRobots(homeUrl: URL): Promise<RobotsResult> {
  const robotsUrl = new URL("/robots.txt", homeUrl).toString();

  try {
    const res = await fetchWithTimeout(robotsUrl, REQUEST_TIMEOUT_MS);
    if (!res.ok) {
      return { available: false, disallowPrefixes: [] };
    }
    const text = await res.text();
    return {
      available: true,
      disallowPrefixes: parseRobots(text)
    };
  } catch {
    return { available: false, disallowPrefixes: [] };
  }
}

async function fetchPage(url: string): Promise<LivePage> {
  const started = Date.now();
  const res = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new LiveAuditError(422, "NON_HTML", `Non-HTML content at ${url}`);
  }

  const text = await res.text();
  const bytes = Buffer.byteLength(text);
  if (bytes > MAX_PAGE_BYTES) {
    throw new LiveAuditError(422, "PAGE_TOO_LARGE", `Page exceeded ${MAX_PAGE_BYTES} bytes at ${url}`);
  }

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    url,
    status: res.status,
    html: text,
    responseTimeMs: Date.now() - started,
    headers
  };
}

function createBlockersFromUpdates(categoryUpdates: AuditExecutionResult["categoryUpdates"]): Blocker[] {
  const byType: Record<string, Blocker["type"]> = {
    data_consistency: "data",
    rule_interpretability: "data",
    structured_data_completeness: "data",
    trust_signals: "trust",
    capability_accuracy: "trust",
    latency_reliability: "trust",
    schema_compatibility: "schema",
    interoperability: "schema",
    identifiers_linkage: "schema",
    semantic_clarity: "intent",
    matchmaking_compatibility: "intent",
    decision_transparency: "intent",
    authentication_simplicity: "ops",
    rate_limiting_resource_control: "ops",
    feedback_loops: "ops"
  };

  return categoryUpdates
    .filter((update) => update.score0to5 <= 2)
    .sort((a, b) => a.score0to5 - b.score0to5)
    .slice(0, 5)
    .map((update, index) => ({
      type: byType[update.key] ?? "ops",
      description: `Low ${update.key.replace(/_/g, " ")} score (${update.score0to5}/5): ${update.rationale}`,
      url: update.evidenceUrls[0] ?? "",
      stepIndex: index + 1,
      mappedCategoryKeys: [update.key as CategoryKey]
    }));
}

export async function runLiveAudit(header: HeaderState): Promise<AuditExecutionResult> {
  const targetRaw = header.targetUrl?.trim();
  if (!targetRaw) {
    throw new LiveAuditError(400, "INVALID_URL", "Target URL is required.");
  }

  let targetUrl: URL;
  try {
    targetUrl = normalizeTargetUrl(targetRaw);
  } catch (error) {
    throw new LiveAuditError(400, "INVALID_URL", "Please enter a valid http(s) URL.", (error as Error).message);
  }

  const startedMs = Date.now();
  const deadlineMs = startedMs + TOTAL_TIMEOUT_MS;
  const steps: AuditExecutionResult["steps"] = [];
  const warnings: string[] = [];

  if (hasDeadlinePassed(deadlineMs)) {
    throw new LiveAuditError(504, "TIMEOUT", "Live audit timed out before start.");
  }

  const robots = await fetchRobots(targetUrl);
  const sitemapAvailable = await fetchWithTimeout(new URL("/sitemap.xml", targetUrl).toString(), REQUEST_TIMEOUT_MS)
    .then((response) => response.ok)
    .catch(() => false);

  if (robots.disallowPrefixes.includes("/")) {
    throw new LiveAuditError(403, "ROBOTS_BLOCKED", "Robots policy blocks crawl for this host.");
  }

  steps.push({
    stepIndex: steps.length + 1,
    url: targetUrl.toString(),
    action: "Initialize live crawl",
    observation: `robots.txt: ${robots.available ? "available" : "not found"}, sitemap.xml: ${sitemapAvailable ? "available" : "not found"}`
  });

  let homepage: LivePage;
  try {
    homepage = await fetchPage(targetUrl.toString());
  } catch (error) {
    if (error instanceof LiveAuditError) {
      throw error;
    }
    throw new LiveAuditError(502, "FETCH_FAILED", "Unable to fetch homepage.", (error as Error).message);
  }

  steps.push({
    stepIndex: steps.length + 1,
    url: homepage.url,
    action: "Fetch homepage",
    observation: `HTTP ${homepage.status}, ${homepage.responseTimeMs}ms`
  });

  const keyLinks = selectKeyInternalLinks(targetUrl, homepage.html, MAX_TOTAL_PAGES - 1);
  const pages: LivePage[] = [homepage];
  let pagesAttempted = 1;

  for (const link of keyLinks) {
    if (pages.length >= MAX_TOTAL_PAGES) break;
    if (hasDeadlinePassed(deadlineMs)) {
      throw new LiveAuditError(504, "TIMEOUT", "Live audit timed out during crawl.");
    }

    pagesAttempted += 1;

    const parsed = new URL(link);
    if (pathBlockedByRobots(parsed.pathname, robots.disallowPrefixes)) {
      warnings.push(`Skipped by robots policy: ${link}`);
      steps.push({
        stepIndex: steps.length + 1,
        url: link,
        action: "Skip blocked link",
        observation: "Disallowed by robots.txt"
      });
      continue;
    }

    try {
      const page = await fetchPage(link);
      pages.push(page);
      steps.push({
        stepIndex: steps.length + 1,
        url: link,
        action: "Fetch linked page",
        observation: `HTTP ${page.status}, ${page.responseTimeMs}ms`
      });
    } catch (error) {
      const message = error instanceof LiveAuditError ? error.message : (error as Error).message;
      warnings.push(`Failed to fetch ${link}: ${message}`);
      steps.push({
        stepIndex: steps.length + 1,
        url: link,
        action: "Fetch linked page",
        observation: `Failed: ${message}`
      });
    }
  }

  if (!pages.length) {
    throw new LiveAuditError(502, "NO_PAGES", "No crawlable pages were fetched.");
  }

  steps.push({
    stepIndex: steps.length + 1,
    url: targetUrl.toString(),
    action: "Extract and score MRI signals",
    observation: `Analyzing ${pages.length} fetched page(s)`
  });

  const categoryUpdates = runDeterministicLiveChecks({
    targetUrl: targetUrl.toString(),
    pages,
    robotsTxtAvailable: robots.available,
    sitemapAvailable,
    constraints: header.constraints,
    taskPrompt: header.taskPrompt
  });

  const blockers = createBlockersFromUpdates(categoryUpdates);

  const durationMs = Date.now() - startedMs;
  if (durationMs > TOTAL_TIMEOUT_MS) {
    throw new LiveAuditError(504, "TIMEOUT", "Live audit timed out during scoring.");
  }

  steps.push({
    stepIndex: steps.length + 1,
    url: targetUrl.toString(),
    action: "Finalize audit",
    observation: `Completed in ${durationMs}ms with ${warnings.length} warning(s)`
  });

  return {
    steps,
    blockers,
    categoryUpdates,
    crawlMeta: {
      pagesAttempted,
      pagesFetched: pages.length,
      robotsTxtAvailable: robots.available,
      sitemapAvailable,
      durationMs,
      warnings
    }
  };
}
