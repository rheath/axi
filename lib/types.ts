export type Outcome = "pass" | "warn" | "fail" | "na";

export type CategoryId =
  | "crawlability"
  | "structured_data"
  | "content"
  | "trust"
  | "performance"
  | "freshness";

export type Check = {
  id: string;
  categoryId: CategoryId;
  title: string;
  description: string;
  impactWeight: number;
  outcome: Outcome;
  evidence?: string;
  recommendation?: string;
};

export type CategoryScore = {
  categoryId: CategoryId;
  label: string;
  weight: number;
  score: number;
};

export type Report = {
  id: string;
  createdAt: string;
  url: string;
  normalizedUrl: string;
  overallScore: number;
  categoryScores: CategoryScore[];
  checks: Check[];
  topFixes: Check[];
  lockStatus: "locked" | "unlocked";
};

export type Lead = {
  id: string;
  reportId: string;
  email: string;
  consent: boolean;
  createdAt: string;
};
