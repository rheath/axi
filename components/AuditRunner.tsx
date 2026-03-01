"use client";

import { runMockAudit } from "@/lib/mockAuditor";
import { useMRIStore } from "@/lib/store";

export default function AuditRunner() {
  const header = useMRIStore((state) => state.header);
  const run = useMRIStore((state) => state.run);
  const setHeaderField = useMRIStore((state) => state.setHeaderField);
  const setConstraintField = useMRIStore((state) => state.setConstraintField);
  const setRun = useMRIStore((state) => state.setRun);
  const applyAuditorResult = useMRIStore((state) => state.applyAuditorResult);

  const isRunning = run.status === "running";

  async function onRunAudit() {
    setRun({
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      steps: [],
      blockers: [],
      progressMessage: "Preparing simulated auditor...",
      errorMessage: undefined
    });

    try {
      const result = await runMockAudit(header, (update) => {
        setRun({
          progressMessage: update.message,
          steps: update.step ? [...(useMRIStore.getState().run.steps ?? []), update.step] : useMRIStore.getState().run.steps
        });
      });
      applyAuditorResult(result);
    } catch (error) {
      setRun({
        status: "error",
        finishedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "Audit simulation failed"
      });
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Run an Audit</h2>
      <p className="mt-1 text-sm text-slate-600">Simulate an AI auditor to prefill MRI category scores and evidence.</p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Company Name (optional)</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={header.companyName ?? ""}
            onChange={(event) => setHeaderField("companyName", event.target.value)}
            placeholder="Example Corp"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Target URL</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={header.targetUrl ?? ""}
            onChange={(event) => setHeaderField("targetUrl", event.target.value)}
            placeholder="https://example.com"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Task Prompt</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
            value={header.taskPrompt ?? ""}
            onChange={(event) => setHeaderField("taskPrompt", event.target.value)}
            placeholder="Find a suitable plan and reach final recommendation."
          />
        </label>

        <div className="grid gap-2 rounded-md border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-800">Constraints</p>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={header.constraints.stopBeforePayment}
              onChange={(event) => setConstraintField("stopBeforePayment", event.target.checked)}
            />
            Stop before payment
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={header.constraints.dontCreateAccount}
              onChange={(event) => setConstraintField("dontCreateAccount", event.target.checked)}
            />
            Do not create account
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block">Time limit (minutes)</span>
            <input
              type="number"
              min={1}
              className="w-28 rounded-md border border-slate-300 px-2 py-1"
              value={header.constraints.timeLimitMinutes}
              onChange={(event) => setConstraintField("timeLimitMinutes", Number(event.target.value))}
            />
          </label>
        </div>

        <button
          onClick={onRunAudit}
          disabled={isRunning}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isRunning ? "Running Audit..." : "Run Audit"}
        </button>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">Status: {run.status}</p>
        {run.progressMessage ? <p className="mt-1 text-slate-600">{run.progressMessage}</p> : null}
        {run.errorMessage ? <p className="mt-1 text-red-600">{run.errorMessage}</p> : null}

        {(run.steps?.length ?? 0) > 0 ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-slate-600">
            {(run.steps ?? []).map((step) => (
              <li key={`${step.stepIndex}-${step.action}`}>
                {step.stepIndex}. {step.action} - {step.observation}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
