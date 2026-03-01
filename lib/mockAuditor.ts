import type { CategoryKey, HeaderState, AuditorStep, Blocker } from "./mriModel";

export type AuditorCategoryUpdate = {
  key: CategoryKey;
  score0to5: number;
  rationale: string;
  evidenceUrls: string[];
};

export type AuditorResult = {
  steps: AuditorStep[];
  blockers: Blocker[];
  categoryUpdates: AuditorCategoryUpdate[];
};

export type ProgressUpdate = {
  message: string;
  step?: AuditorStep;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMockAudit(
  header: HeaderState,
  onProgress?: (update: ProgressUpdate) => void
): Promise<AuditorResult> {
  const url = header.targetUrl?.trim() || "https://example.com";
  const prompt = header.taskPrompt?.trim() || "Complete onboarding and obtain a recommendation";

  const steps: AuditorStep[] = [
    { stepIndex: 1, url, action: "Open homepage", observation: "Hero copy is clear, but no machine-readable product schema found." },
    { stepIndex: 2, url: `${url}/pricing`, action: "Inspect plans", observation: "Pricing table is visible but feature identifiers are inconsistent." },
    { stepIndex: 3, url: `${url}/api`, action: "Check API docs", observation: "Schema references exist but no stable interoperability profile is declared." },
    { stepIndex: 4, url: `${url}/signup`, action: "Attempt signup", observation: "Constraint 'don't create account' conflicts with gated workflow." },
    { stepIndex: 5, url: `${url}/checkout`, action: "Stop before payment", observation: "Audit stopped before payment as constrained." },
    { stepIndex: 6, url: `${url}/support`, action: "Assess support loops", observation: "Feedback form exists, no explicit model-learning feedback channel." },
    { stepIndex: 7, url: `${url}/status`, action: "Read reliability/status", observation: "Public status page present with uptime metrics." },
    { stepIndex: 8, url, action: "Task recap", observation: `Simulated task: ${prompt}` }
  ];

  for (const step of steps) {
    onProgress?.({ message: `Running step ${step.stepIndex}/${steps.length}: ${step.action}`, step });
    await wait(350);
  }

  const blockers: Blocker[] = [
    {
      type: "schema",
      description: "Missing robust linked identifiers across product/docs/pricing pages.",
      url: `${url}/api`,
      stepIndex: 3,
      mappedCategoryKeys: ["identifiers_linkage", "interoperability"]
    },
    {
      type: "intent",
      description: "Decision rationale not explicit at key recommendation surfaces.",
      url,
      stepIndex: 8,
      mappedCategoryKeys: ["decision_transparency", "semantic_clarity"]
    },
    {
      type: "ops",
      description: "Account gate impedes constrained, no-account evaluation flow.",
      url: `${url}/signup`,
      stepIndex: 4,
      mappedCategoryKeys: ["authentication_simplicity"]
    }
  ];

  const categoryUpdates: AuditorCategoryUpdate[] = [
    {
      key: "data_consistency",
      score0to5: 3,
      rationale: "Core data appears consistent but field naming drifts between marketing and docs.",
      evidenceUrls: [url, `${url}/pricing`, `${url}/api`]
    },
    {
      key: "rule_interpretability",
      score0to5: 2,
      rationale: "Rules are implied, not explicitly documented for automated interpretation.",
      evidenceUrls: [`${url}/docs`]
    },
    {
      key: "structured_data_completeness",
      score0to5: 2,
      rationale: "Partial metadata found; structured coverage not comprehensive.",
      evidenceUrls: [url]
    },
    {
      key: "trust_signals",
      score0to5: 4,
      rationale: "Trust artifacts and uptime indicators are visible.",
      evidenceUrls: [`${url}/status`, `${url}/security`]
    },
    {
      key: "capability_accuracy",
      score0to5: 3,
      rationale: "Capabilities generally align with prompt, with moderate ambiguity in edge cases.",
      evidenceUrls: [url]
    },
    {
      key: "latency_reliability",
      score0to5: 4,
      rationale: "Reliable loading and status transparency suggest stable operations.",
      evidenceUrls: [`${url}/status`]
    },
    {
      key: "schema_compatibility",
      score0to5: 3,
      rationale: "Basic compatibility present but lacking complete profile declarations.",
      evidenceUrls: [`${url}/api`]
    },
    {
      key: "interoperability",
      score0to5: 2,
      rationale: "Cross-system mappings are not consistently published.",
      evidenceUrls: [`${url}/api`]
    },
    {
      key: "identifiers_linkage",
      score0to5: 2,
      rationale: "Identifier linkage between entities is incomplete in current beta surface.",
      evidenceUrls: [`${url}/api`, `${url}/pricing`]
    },
    {
      key: "semantic_clarity",
      score0to5: 3,
      rationale: "Intent language is mostly clear but lacks strict semantic contracts.",
      evidenceUrls: [url]
    },
    {
      key: "matchmaking_compatibility",
      score0to5: 3,
      rationale: "Matching logic appears workable but not fully explainable.",
      evidenceUrls: [`${url}/docs`]
    },
    {
      key: "decision_transparency",
      score0to5: 2,
      rationale: "Decision pathways are not consistently exposed to users.",
      evidenceUrls: [url]
    },
    {
      key: "authentication_simplicity",
      score0to5: 1,
      rationale: "No-account flows are constrained by sign-up requirements.",
      evidenceUrls: [`${url}/signup`]
    },
    {
      key: "rate_limiting_resource_control",
      score0to5: 3,
      rationale: "Some controls appear present; policy detail is limited.",
      evidenceUrls: [`${url}/api`]
    },
    {
      key: "feedback_loops",
      score0to5: 2,
      rationale: "Feedback exists but loops into model improvement are opaque.",
      evidenceUrls: [`${url}/support`]
    }
  ];

  return { steps, blockers, categoryUpdates };
}
