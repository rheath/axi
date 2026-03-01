import { CATEGORIES_SEED, type CategoryScoreItem, type ComputedState, type PillarKey, type RiskBand } from "./mriModel";

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(5, Math.max(0, Math.round(score)));
}

export function getRiskBand(finalScore0to100: number): RiskBand {
  if (finalScore0to100 <= 39) return "Red";
  if (finalScore0to100 <= 69) return "Yellow";
  if (finalScore0to100 <= 84) return "Green";
  return "Blue";
}

export function computeMRI(categories: CategoryScoreItem[]): ComputedState {
  const pillarOrder: PillarKey[] = [
    "data_rule_clarity",
    "trust_reliability",
    "schema_interop",
    "intent_decision",
    "interaction_ops"
  ];

  const pillarSummaries = pillarOrder.map((pillarKey) => {
    const inPillar = categories.filter((category) => category.pillarKey === pillarKey);
    const safeScores = inPillar.map((category) => clampScore(category.score0to5));
    const total = safeScores.reduce((sum, score) => sum + score, 0);
    const average = safeScores.length ? total / safeScores.length : 0;
    const normalized = average / 5;
    const pillarWeight = inPillar[0]?.pillarWeight ?? 0;

    return {
      pillarKey,
      pillarName: inPillar[0]?.pillarName ?? "Unknown",
      pillarWeight,
      pillarAverage0to5: average,
      normalized0to1: normalized,
      weightedPoints: normalized * pillarWeight
    };
  });

  const finalScore0to100 = pillarSummaries.reduce((sum, pillar) => sum + pillar.weightedPoints, 0);

  return {
    pillarSummaries,
    finalScore0to100,
    riskBand: getRiskBand(finalScore0to100)
  };
}

export function withValidatedScores(categories: CategoryScoreItem[]): CategoryScoreItem[] {
  const seedByKey = new Map(CATEGORIES_SEED.map((item) => [item.key, item]));
  const merged = CATEGORIES_SEED.map((seed) => {
    const imported = categories.find((item) => item.key === seed.key);
    return {
      ...seed,
      ...(imported ?? {}),
      score0to5: clampScore(imported?.score0to5 ?? seed.score0to5),
      evidenceUrls: (imported?.evidenceUrls ?? []).filter(Boolean)
    };
  });

  // Preserve deterministic shape: exactly 15 scored categories in fixed order.
  return merged.filter((item) => seedByKey.has(item.key));
}

export function devCheckMRI() {
  if (process.env.NODE_ENV === "production") return;

  const allZero = computeMRI(CATEGORIES_SEED.map((item) => ({ ...item, score0to5: 0 })));
  const allFive = computeMRI(CATEGORIES_SEED.map((item) => ({ ...item, score0to5: 5 })));

  if (allZero.finalScore0to100 !== 0 || allZero.riskBand !== "Red") {
    // eslint-disable-next-line no-console
    console.warn("MRI dev check failed: expected 0/Red", allZero);
  }

  if (Math.abs(allFive.finalScore0to100 - 100) > 0.00001 || allFive.riskBand !== "Blue") {
    // eslint-disable-next-line no-console
    console.warn("MRI dev check failed: expected 100/Blue", allFive);
  }
}
