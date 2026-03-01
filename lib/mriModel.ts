export type PillarKey =
  | "data_rule_clarity"
  | "trust_reliability"
  | "schema_interop"
  | "intent_decision"
  | "interaction_ops";

export type CategoryKey =
  | "data_consistency"
  | "rule_interpretability"
  | "structured_data_completeness"
  | "trust_signals"
  | "capability_accuracy"
  | "latency_reliability"
  | "schema_compatibility"
  | "interoperability"
  | "identifiers_linkage"
  | "semantic_clarity"
  | "matchmaking_compatibility"
  | "decision_transparency"
  | "authentication_simplicity"
  | "rate_limiting_resource_control"
  | "feedback_loops";

export type RiskBand = "Red" | "Yellow" | "Green" | "Blue";

export type HeaderState = {
  companyName?: string;
  targetUrl?: string;
  taskPrompt?: string;
  constraints: {
    stopBeforePayment: boolean;
    dontCreateAccount: boolean;
    timeLimitMinutes: number;
  };
};

export type CategoryScoreItem = {
  key: CategoryKey;
  pillarKey: PillarKey;
  pillarName: string;
  pillarWeight: number;
  categoryName: string;
  score0to5: number;
  rationale?: string;
  evidenceUrls?: string[];
};

export type AuditorStep = {
  stepIndex: number;
  url: string;
  action: string;
  observation: string;
};

export type Blocker = {
  type: "data" | "trust" | "schema" | "intent" | "ops";
  description: string;
  url: string;
  stepIndex: number;
  mappedCategoryKeys: CategoryKey[];
};

export type RunState = {
  status: "idle" | "running" | "done" | "error";
  startedAt?: string;
  finishedAt?: string;
  steps?: AuditorStep[];
  blockers?: Blocker[];
  progressMessage?: string;
  errorMessage?: string;
};

export type PillarSummary = {
  pillarKey: PillarKey;
  pillarName: string;
  pillarWeight: number;
  pillarAverage0to5: number;
  normalized0to1: number;
  weightedPoints: number;
};

export type ComputedState = {
  pillarSummaries: PillarSummary[];
  finalScore0to100: number;
  riskBand: RiskBand;
};

export type ImportExportState = {
  schemaVersion: 1;
  header: HeaderState;
  categories: CategoryScoreItem[];
  learningIntegrationNotes?: string;
  run: RunState;
  computed: ComputedState;
};

export type PillarDefinition = {
  key: PillarKey;
  name: string;
  weight: number;
};

export const PILLARS: PillarDefinition[] = [
  { key: "data_rule_clarity", name: "Data & Rule Clarity", weight: 25 },
  { key: "trust_reliability", name: "Machine Trust & Reliability", weight: 25 },
  { key: "schema_interop", name: "Schema & Interoperability", weight: 15 },
  { key: "intent_decision", name: "Intent & Decision Support", weight: 20 },
  { key: "interaction_ops", name: "Interaction & Operations", weight: 15 }
];

export const CATEGORIES_SEED: CategoryScoreItem[] = [
  {
    key: "data_consistency",
    pillarKey: "data_rule_clarity",
    pillarName: "Data & Rule Clarity",
    pillarWeight: 25,
    categoryName: "Data Consistency",
    score0to5: 0
  },
  {
    key: "rule_interpretability",
    pillarKey: "data_rule_clarity",
    pillarName: "Data & Rule Clarity",
    pillarWeight: 25,
    categoryName: "Rule Interpretability",
    score0to5: 0
  },
  {
    key: "structured_data_completeness",
    pillarKey: "data_rule_clarity",
    pillarName: "Data & Rule Clarity",
    pillarWeight: 25,
    categoryName: "Structured Data Completeness",
    score0to5: 0
  },
  {
    key: "trust_signals",
    pillarKey: "trust_reliability",
    pillarName: "Machine Trust & Reliability",
    pillarWeight: 25,
    categoryName: "Trust Signals",
    score0to5: 0
  },
  {
    key: "capability_accuracy",
    pillarKey: "trust_reliability",
    pillarName: "Machine Trust & Reliability",
    pillarWeight: 25,
    categoryName: "Capability Accuracy",
    score0to5: 0
  },
  {
    key: "latency_reliability",
    pillarKey: "trust_reliability",
    pillarName: "Machine Trust & Reliability",
    pillarWeight: 25,
    categoryName: "Latency & Reliability",
    score0to5: 0
  },
  {
    key: "schema_compatibility",
    pillarKey: "schema_interop",
    pillarName: "Schema & Interoperability",
    pillarWeight: 15,
    categoryName: "Schema Compatibility",
    score0to5: 0
  },
  {
    key: "interoperability",
    pillarKey: "schema_interop",
    pillarName: "Schema & Interoperability",
    pillarWeight: 15,
    categoryName: "Interoperability",
    score0to5: 0
  },
  {
    key: "identifiers_linkage",
    pillarKey: "schema_interop",
    pillarName: "Schema & Interoperability",
    pillarWeight: 15,
    categoryName: "Identifiers & Linkage",
    score0to5: 0,
    rationale: "Beta placeholder category included to keep 3-category pillar scoring consistency."
  },
  {
    key: "semantic_clarity",
    pillarKey: "intent_decision",
    pillarName: "Intent & Decision Support",
    pillarWeight: 20,
    categoryName: "Semantic Clarity",
    score0to5: 0
  },
  {
    key: "matchmaking_compatibility",
    pillarKey: "intent_decision",
    pillarName: "Intent & Decision Support",
    pillarWeight: 20,
    categoryName: "Matchmaking Compatibility",
    score0to5: 0
  },
  {
    key: "decision_transparency",
    pillarKey: "intent_decision",
    pillarName: "Intent & Decision Support",
    pillarWeight: 20,
    categoryName: "Decision Transparency",
    score0to5: 0
  },
  {
    key: "authentication_simplicity",
    pillarKey: "interaction_ops",
    pillarName: "Interaction & Operations",
    pillarWeight: 15,
    categoryName: "Authentication Simplicity",
    score0to5: 0
  },
  {
    key: "rate_limiting_resource_control",
    pillarKey: "interaction_ops",
    pillarName: "Interaction & Operations",
    pillarWeight: 15,
    categoryName: "Rate Limiting & Resource Control",
    score0to5: 0
  },
  {
    key: "feedback_loops",
    pillarKey: "interaction_ops",
    pillarName: "Interaction & Operations",
    pillarWeight: 15,
    categoryName: "Feedback Loops",
    score0to5: 0
  }
];

export function initialHeader(): HeaderState {
  return {
    companyName: "",
    targetUrl: "",
    taskPrompt: "",
    constraints: {
      stopBeforePayment: true,
      dontCreateAccount: true,
      timeLimitMinutes: 10
    }
  };
}

export function initialRunState(): RunState {
  return {
    status: "idle",
    steps: [],
    blockers: [],
    progressMessage: ""
  };
}

export function cloneSeedCategories(): CategoryScoreItem[] {
  return CATEGORIES_SEED.map((item) => ({
    ...item,
    evidenceUrls: item.evidenceUrls ? [...item.evidenceUrls] : []
  }));
}
