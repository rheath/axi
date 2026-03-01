import { load } from "cheerio";
import type { AuditorCategoryUpdate, CategoryKey, HeaderState } from "./mriModel";

export type LivePage = {
  url: string;
  status: number;
  html: string;
  responseTimeMs: number;
  headers: Record<string, string>;
};

export type LiveCheckInput = {
  targetUrl: string;
  pages: LivePage[];
  robotsTxtAvailable: boolean;
  sitemapAvailable: boolean;
  constraints: HeaderState["constraints"];
  taskPrompt?: string;
};

type ParsedPage = LivePage & {
  text: string;
  title: string;
  h1: string;
  metaDescription: string;
  canonical?: string;
  jsonLdCount: number;
};

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(5, Math.round(score)));
}

function scoreByRatio(ratio: number): number {
  if (ratio >= 0.95) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio >= 0.2) return 1;
  return 0;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function evidenceForTerms(parsed: ParsedPage[], terms: string[], fallbackUrl: string): string[] {
  const urls = parsed
    .filter((page) => terms.some((term) => page.text.includes(term)))
    .map((page) => page.url);
  return unique(urls).slice(0, 4).length ? unique(urls).slice(0, 4) : [fallbackUrl];
}

function createUpdate(
  key: CategoryKey,
  score0to5: number,
  rationale: string,
  evidenceUrls: string[]
): AuditorCategoryUpdate {
  return {
    key,
    score0to5: clampScore(score0to5),
    rationale,
    evidenceUrls: unique(evidenceUrls).slice(0, 6)
  };
}

export function runDeterministicLiveChecks(input: LiveCheckInput): AuditorCategoryUpdate[] {
  const parsed: ParsedPage[] = input.pages.map((page) => {
    const $ = load(page.html);
    const text = $.text().toLowerCase();
    return {
      ...page,
      text,
      title: $("title").text().trim(),
      h1: $("h1").first().text().trim(),
      metaDescription: $("meta[name='description']").attr("content")?.trim() ?? "",
      canonical: $("link[rel='canonical']").attr("href")?.trim(),
      jsonLdCount: $("script[type='application/ld+json']").length
    };
  });

  const baseEvidence = [input.targetUrl];
  const n = Math.max(1, parsed.length);
  const joinedText = parsed.map((page) => page.text).join("\n");

  const canonicalRatio = parsed.filter((page) => Boolean(page.canonical)).length / n;
  const titles = parsed.map((page) => page.title).filter(Boolean);
  const uniqueTitleRatio = titles.length ? unique(titles).length / titles.length : 0;
  const dataConsistencyScore = scoreByRatio((canonicalRatio + uniqueTitleRatio) / 2);

  const ruleTerms = ["policy", "rule", "eligibility", "criteria", "terms", "guideline"];
  const ruleTermHits = ruleTerms.filter((term) => joinedText.includes(term)).length;
  const ruleInterpretabilityScore = clampScore(Math.min(5, Math.round((ruleTermHits / ruleTerms.length) * 5)));

  const totalJsonLd = parsed.reduce((sum, page) => sum + page.jsonLdCount, 0);
  const schemaTypeHits = (joinedText.match(/"@type"/g) ?? []).length;
  const structuredCompletenessScore = clampScore(Math.min(5, Math.round((totalJsonLd + schemaTypeHits) / 3)));

  const trustTerms = ["privacy", "terms", "security", "contact", "trust"];
  const trustHits = trustTerms.filter((term) => joinedText.includes(term)).length;
  const trustBase = scoreByRatio(trustHits / trustTerms.length);
  const trustSignalsScore = clampScore(trustBase + (input.targetUrl.startsWith("https://") ? 1 : 0));

  const promptTokens = unique(tokenize(input.taskPrompt ?? ""));
  const promptOverlap = promptTokens.length
    ? promptTokens.filter((token) => joinedText.includes(token)).length / promptTokens.length
    : 0.5;
  const capabilityAccuracyScore = scoreByRatio(promptOverlap);

  const avgResponse = parsed.reduce((sum, page) => sum + page.responseTimeMs, 0) / n;
  const successRatio = parsed.filter((page) => page.status >= 200 && page.status < 400).length / n;
  const latencyBonus = avgResponse < 700 ? 1 : avgResponse < 1500 ? 0 : -1;
  const latencyReliabilityScore = clampScore(scoreByRatio(successRatio) + latencyBonus);

  const metadataPresenceRatio =
    parsed.filter((page) => page.metaDescription.length > 30 && page.title.length > 10).length / n;
  const schemaCompatibilityScore = clampScore(
    scoreByRatio(metadataPresenceRatio) + (input.robotsTxtAvailable ? 1 : 0) + (input.sitemapAvailable ? 1 : 0)
  );

  const interopTerms = ["api", "integration", "webhook", "json", "csv", "export"];
  const interopHits = interopTerms.filter((term) => joinedText.includes(term)).length;
  const interoperabilityScore = scoreByRatio(interopHits / interopTerms.length);

  const idTerms = ["id", "identifier", "sku", "uuid", "canonical"];
  const idHits = idTerms.filter((term) => joinedText.includes(term)).length;
  const identifiersLinkageScore = scoreByRatio(idHits / idTerms.length);

  const semanticRatio =
    parsed.filter((page) => page.title.length > 15 && page.h1.length > 4 && page.metaDescription.length > 50).length / n;
  const semanticClarityScore = scoreByRatio(semanticRatio);

  const matchTerms = ["match", "recommend", "compatib", "fit", "criteria"];
  const matchHits = matchTerms.filter((term) => joinedText.includes(term)).length;
  const matchmakingScore = scoreByRatio(matchHits / matchTerms.length);

  const decisionTerms = ["why", "because", "explain", "rationale", "confidence", "how we decide"];
  const decisionHits = decisionTerms.filter((term) => joinedText.includes(term)).length;
  const decisionTransparencyScore = scoreByRatio(decisionHits / decisionTerms.length);

  const authTerms = ["sign up", "create account", "login", "log in", "register"];
  const authGateCount = authTerms.filter((term) => joinedText.includes(term)).length;
  const authPenalty = input.constraints.dontCreateAccount ? Math.min(3, authGateCount) : Math.min(1, authGateCount);
  const authenticationSimplicityScore = clampScore(5 - authPenalty);

  const rateTerms = ["rate limit", "quota", "throttle", "resource control"];
  const rateHits = rateTerms.filter((term) => joinedText.includes(term)).length;
  const rateLimitingScore = scoreByRatio(rateHits / rateTerms.length);

  const feedbackTerms = ["feedback", "support", "contact", "report issue", "help center", "changelog"];
  const feedbackHits = feedbackTerms.filter((term) => joinedText.includes(term)).length;
  const feedbackLoopsScore = scoreByRatio(feedbackHits / feedbackTerms.length);

  return [
    createUpdate(
      "data_consistency",
      dataConsistencyScore,
      `Canonical coverage ${Math.round(canonicalRatio * 100)}% and unique title ratio ${Math.round(uniqueTitleRatio * 100)}% indicate ${dataConsistencyScore >= 3 ? "moderate" : "weak"} consistency across crawled pages.`,
      evidenceForTerms(parsed, ["canonical", "title"], input.targetUrl)
    ),
    createUpdate(
      "rule_interpretability",
      ruleInterpretabilityScore,
      `Detected ${ruleTermHits}/${ruleTerms.length} key policy/rule terms; explicit machine-interpretable rule language is ${ruleInterpretabilityScore >= 3 ? "present" : "limited"}.`,
      evidenceForTerms(parsed, ruleTerms, input.targetUrl)
    ),
    createUpdate(
      "structured_data_completeness",
      structuredCompletenessScore,
      `Found ${totalJsonLd} JSON-LD blocks and ${schemaTypeHits} schema type references across crawled pages.`,
      evidenceForTerms(parsed, ["@type", "application/ld+json"], input.targetUrl)
    ),
    createUpdate(
      "trust_signals",
      trustSignalsScore,
      `Trust surface includes ${trustHits} of ${trustTerms.length} core trust signals (${input.targetUrl.startsWith("https://") ? "HTTPS" : "non-HTTPS"} target).`,
      evidenceForTerms(parsed, trustTerms, input.targetUrl)
    ),
    createUpdate(
      "capability_accuracy",
      capabilityAccuracyScore,
      `Prompt-token overlap with site content is ${Math.round(promptOverlap * 100)}%, indicating ${capabilityAccuracyScore >= 3 ? "reasonable" : "limited"} capability alignment.`,
      promptTokens.length ? evidenceForTerms(parsed, promptTokens.slice(0, 8), input.targetUrl) : baseEvidence
    ),
    createUpdate(
      "latency_reliability",
      latencyReliabilityScore,
      `Fetch success ratio ${Math.round(successRatio * 100)}% with average response ${Math.round(avgResponse)}ms suggests ${latencyReliabilityScore >= 3 ? "stable" : "fragile"} reliability.`,
      parsed.map((page) => page.url).slice(0, 4)
    ),
    createUpdate(
      "schema_compatibility",
      schemaCompatibilityScore,
      `Metadata coverage ${Math.round(metadataPresenceRatio * 100)}% with robots=${input.robotsTxtAvailable ? "yes" : "no"}, sitemap=${input.sitemapAvailable ? "yes" : "no"}.`,
      evidenceForTerms(parsed, ["schema", "metadata", "json-ld"], input.targetUrl)
    ),
    createUpdate(
      "interoperability",
      interoperabilityScore,
      `Interoperability term coverage is ${interopHits}/${interopTerms.length}, indicating ${interoperabilityScore >= 3 ? "some" : "limited"} explicit integration posture.`,
      evidenceForTerms(parsed, interopTerms, input.targetUrl)
    ),
    createUpdate(
      "identifiers_linkage",
      identifiersLinkageScore,
      `Identifier/linkage signal coverage is ${idHits}/${idTerms.length}; stable cross-page identifiers are ${identifiersLinkageScore >= 3 ? "partially established" : "weak"}.`,
      evidenceForTerms(parsed, idTerms, input.targetUrl)
    ),
    createUpdate(
      "semantic_clarity",
      semanticClarityScore,
      `Pages meeting title/H1/meta quality threshold: ${Math.round(semanticRatio * 100)}%.`,
      parsed.map((page) => page.url).slice(0, 4)
    ),
    createUpdate(
      "matchmaking_compatibility",
      matchmakingScore,
      `Detected ${matchHits}/${matchTerms.length} matchmaking-related signals in content.`,
      evidenceForTerms(parsed, matchTerms, input.targetUrl)
    ),
    createUpdate(
      "decision_transparency",
      decisionTransparencyScore,
      `Decision transparency markers detected: ${decisionHits}/${decisionTerms.length}.`,
      evidenceForTerms(parsed, decisionTerms, input.targetUrl)
    ),
    createUpdate(
      "authentication_simplicity",
      authenticationSimplicityScore,
      `Authentication friction markers: ${authGateCount}; constraint don't-create-account is ${input.constraints.dontCreateAccount ? "enabled" : "disabled"}.`,
      evidenceForTerms(parsed, authTerms, input.targetUrl)
    ),
    createUpdate(
      "rate_limiting_resource_control",
      rateLimitingScore,
      `Rate/resource control language coverage: ${rateHits}/${rateTerms.length}.`,
      evidenceForTerms(parsed, rateTerms, input.targetUrl)
    ),
    createUpdate(
      "feedback_loops",
      feedbackLoopsScore,
      `Feedback loop signals found: ${feedbackHits}/${feedbackTerms.length}.`,
      evidenceForTerms(parsed, feedbackTerms, input.targetUrl)
    )
  ];
}
