"use client";

import { Fragment, useMemo } from "react";
import { PILLARS, type CategoryScoreItem } from "@/lib/mriModel";
import { useMRIStore } from "@/lib/store";

function ScoreInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div>
      <div className="hidden gap-1 sm:flex">
        {[0, 1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              value === score ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <select
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm sm:hidden"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {[0, 1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
    </div>
  );
}

function EvidenceEditor({ category }: { category: CategoryScoreItem }) {
  const setCategoryEvidenceText = useMRIStore((state) => state.setCategoryEvidenceText);

  return (
    <textarea
      className="min-h-16 w-full rounded border border-slate-300 px-2 py-1 text-xs"
      placeholder="One URL per line or comma-separated"
      value={(category.evidenceUrls ?? []).join("\n")}
      onChange={(event) => setCategoryEvidenceText(category.key, event.target.value)}
    />
  );
}

export default function ScoreTable() {
  const categories = useMRIStore((state) => state.categories);
  const setCategoryScore = useMRIStore((state) => state.setCategoryScore);
  const setCategoryRationale = useMRIStore((state) => state.setCategoryRationale);
  const learningIntegrationNotes = useMRIStore((state) => state.learningIntegrationNotes);
  const setLearningIntegrationNotes = useMRIStore((state) => state.setLearningIntegrationNotes);

  const grouped = useMemo(() => {
    return PILLARS.map((pillar) => ({
      pillar,
      rows: categories.filter((category) => category.pillarKey === pillar.key)
    }));
  }, [categories]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">MRI Scoring Table</h2>
        <p className="text-sm text-slate-600">Spreadsheet-style scoring. Scores are integer values from 0 to 5.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Pillar</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Category</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Score (0-5)</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Rationale</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Evidence (links)</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ pillar, rows }) => (
              <Fragment key={pillar.key}>
                <tr key={`${pillar.key}-header`} className="bg-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-900" colSpan={5}>
                    {pillar.name} ({pillar.weight}%)
                  </td>
                </tr>
                {rows.map((category) => (
                  <tr key={category.key} className="align-top">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{category.pillarName}</td>
                    <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-900">{category.categoryName}</td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <ScoreInput value={category.score0to5} onChange={(next) => setCategoryScore(category.key, next)} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-slate-600">Edit rationale</summary>
                        <textarea
                          className="mt-2 min-h-20 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={category.rationale ?? ""}
                          onChange={(event) => setCategoryRationale(category.key, event.target.value)}
                        />
                      </details>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <EvidenceEditor category={category} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="bg-amber-50">
              <td className="border-b border-amber-100 px-3 py-2 font-medium text-amber-900">Interaction & Operations</td>
              <td className="border-b border-amber-100 px-3 py-2 font-medium text-amber-900" colSpan={4}>
                Learning Integration (informational only, not scored)
                <textarea
                  className="mt-2 min-h-16 w-full rounded border border-amber-300 bg-white px-2 py-1 text-xs text-slate-700"
                  placeholder="Capture notes about learning integration signals."
                  value={learningIntegrationNotes}
                  onChange={(event) => setLearningIntegrationNotes(event.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
