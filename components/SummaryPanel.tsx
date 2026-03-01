"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMRIStore } from "@/lib/store";

function bandClasses(band: string): string {
  if (band === "Red") return "bg-red-100 text-red-800";
  if (band === "Yellow") return "bg-yellow-100 text-yellow-800";
  if (band === "Green") return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
}

export default function SummaryPanel() {
  const computed = useMRIStore((state) => state.computed);
  const blockers = useMRIStore((state) => state.run.blockers ?? []);

  const topBlockers = useMemo(() => blockers.slice(0, 5), [blockers]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Summary</h2>

      <div className="mt-3 rounded-lg border border-slate-200 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Final MRI Score</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{computed.finalScore0to100.toFixed(1)}</p>
        <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${bandClasses(computed.riskBand)}`}>
          {computed.riskBand} {computed.riskBand === "Red" ? "(High Risk)" : computed.riskBand === "Yellow" ? "(Moderate Risk)" : computed.riskBand === "Green" ? "(Ready)" : "(Advanced)"}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">Pillar Scores</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {computed.pillarSummaries.map((pillar) => (
          <li key={pillar.pillarKey} className="rounded border border-slate-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">{pillar.pillarName}</span>
              <span className="text-slate-600">{pillar.weightedPoints.toFixed(2)} / {pillar.pillarWeight}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Average: {pillar.pillarAverage0to5.toFixed(2)} | Normalized: {(pillar.normalized0to1 * 100).toFixed(1)}%</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">Top Blockers</h3>
      {topBlockers.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">Run the mock audit to generate blockers.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {topBlockers.map((blocker, idx) => (
            <li key={`${blocker.type}-${idx}`} className="rounded border border-rose-100 bg-rose-50 p-2 text-rose-900">
              <p className="font-medium">{blocker.description}</p>
              <p className="mt-1 text-xs">Step {blocker.stepIndex} - {blocker.url}</p>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/report"
        className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        View Report
      </Link>
    </section>
  );
}
