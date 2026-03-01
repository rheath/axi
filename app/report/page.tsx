"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMRIStore } from "@/lib/store";

function riskLabel(band: string): string {
  if (band === "Red") return "High Risk";
  if (band === "Yellow") return "Moderate Risk";
  if (band === "Green") return "Ready";
  return "Advanced";
}

export default function ReportPage() {
  const hydrated = useMRIStore((state) => state.hydrated);
  const hydrateFromStorage = useMRIStore((state) => state.hydrateFromStorage);
  const header = useMRIStore((state) => state.header);
  const categories = useMRIStore((state) => state.categories);
  const computed = useMRIStore((state) => state.computed);
  const run = useMRIStore((state) => state.run);
  const learningIntegrationNotes = useMRIStore((state) => state.learningIntegrationNotes);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-16">
        <p className="text-sm text-slate-600">Loading report...</p>
      </main>
    );
  }

  if (!header.targetUrl && !header.taskPrompt && categories.every((category) => category.score0to5 === 0)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No audit loaded yet</h1>
        <p className="mt-2 text-slate-600">Create or import an audit on the scoring page first.</p>
        <Link href="/score" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Go to Scoring Tool
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/score" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Back to Score Tool
        </Link>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 print:border-none print:shadow-none">
        <h1 className="text-3xl font-bold">AXI MRI Audit Report</h1>
        <p className="mt-1 text-sm text-slate-500">Generated {new Date().toLocaleString()}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Company</p>
            <p className="text-sm text-slate-900">{header.companyName || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Target URL</p>
            <p className="break-all text-sm text-slate-900">{header.targetUrl || "N/A"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Task Prompt</p>
            <p className="text-sm text-slate-900">{header.taskPrompt || "N/A"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Constraints</p>
            <p className="text-sm text-slate-900">
              Stop before payment: {header.constraints.stopBeforePayment ? "Yes" : "No"} | Do not create account: {header.constraints.dontCreateAccount ? "Yes" : "No"} | Time limit: {header.constraints.timeLimitMinutes} min
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Final MRI Score</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{computed.finalScore0to100.toFixed(1)}</p>
          <p className="mt-1 text-sm text-slate-700">Band: {computed.riskBand} ({riskLabel(computed.riskBand)})</p>
        </div>

        <h2 className="mt-8 text-xl font-semibold">Pillar Breakdown</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left">Pillar</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Weight</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Average (0-5)</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Normalized</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Weighted Points</th>
              </tr>
            </thead>
            <tbody>
              {computed.pillarSummaries.map((pillar) => (
                <tr key={pillar.pillarKey}>
                  <td className="border border-slate-200 px-3 py-2">{pillar.pillarName}</td>
                  <td className="border border-slate-200 px-3 py-2">{pillar.pillarWeight}%</td>
                  <td className="border border-slate-200 px-3 py-2">{pillar.pillarAverage0to5.toFixed(2)}</td>
                  <td className="border border-slate-200 px-3 py-2">{(pillar.normalized0to1 * 100).toFixed(1)}%</td>
                  <td className="border border-slate-200 px-3 py-2">{pillar.weightedPoints.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 text-xl font-semibold">Category Evidence</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left">Pillar</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Category</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Score</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Rationale</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.key}>
                  <td className="border border-slate-200 px-3 py-2">{category.pillarName}</td>
                  <td className="border border-slate-200 px-3 py-2">{category.categoryName}</td>
                  <td className="border border-slate-200 px-3 py-2">{category.score0to5}</td>
                  <td className="border border-slate-200 px-3 py-2">{category.rationale || "-"}</td>
                  <td className="border border-slate-200 px-3 py-2">
                    {(category.evidenceUrls ?? []).length === 0
                      ? "-"
                      : (category.evidenceUrls ?? []).map((url) => (
                          <a key={url} href={url} className="mr-2 inline-block text-blue-700 underline" target="_blank" rel="noreferrer">
                            {url}
                          </a>
                        ))}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-medium" colSpan={2}>
                  Learning Integration (informational)
                </td>
                <td className="border border-slate-200 px-3 py-2" colSpan={3}>
                  {learningIntegrationNotes || "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 text-xl font-semibold">Top Blockers</h2>
        {(run.blockers ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No blockers captured.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(run.blockers ?? []).map((blocker, idx) => (
              <li key={`${blocker.type}-${idx}`} className="rounded border border-rose-200 bg-rose-50 p-3">
                <p className="font-medium text-rose-900">{blocker.description}</p>
                <p className="mt-1 text-rose-800">Type: {blocker.type} | Step: {blocker.stepIndex} | URL: {blocker.url}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
