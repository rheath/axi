"use client";

import { useEffect, useState } from "react";
import { useMRIStore } from "@/lib/store";

const RUN_PHASES = [
  { phase: "preparing", message: "Preparing live audit..." },
  { phase: "fetching", message: "Fetching crawl pages..." },
  { phase: "extracting", message: "Extracting machine-readable signals..." },
  { phase: "scoring", message: "Scoring MRI categories..." },
  { phase: "finalizing", message: "Finalizing live results..." }
] as const;

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AuditRunner() {
  const header = useMRIStore((state) => state.header);
  const run = useMRIStore((state) => state.run);
  const setHeaderField = useMRIStore((state) => state.setHeaderField);
  const setConstraintField = useMRIStore((state) => state.setConstraintField);
  const setRun = useMRIStore((state) => state.setRun);
  const setRunPhase = useMRIStore((state) => state.setRunPhase);
  const applyAuditorResult = useMRIStore((state) => state.applyAuditorResult);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isRunning = run.status === "running";

  useEffect(() => {
    if (!isRunning || !run.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startedAtMs = new Date(run.startedAt).getTime();
    const update = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      setElapsedSeconds(seconds);
    };

    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [isRunning, run.startedAt]);

  async function onRunAudit() {
    setRun({
      mode: "live",
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      steps: [],
      blockers: [],
      liveMeta: undefined,
      errorMessage: undefined
    });
    setRunPhase("preparing", "Preparing live audit...");

    let phaseIndex = 0;
    const phaseTimer = setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, RUN_PHASES.length - 1);
      const phase = RUN_PHASES[phaseIndex];
      setRunPhase(phase.phase, phase.message);
    }, 1400);

    try {
      const response = await fetch("/api/live-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ header })
      });

      const rawText = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(rawText);
      } catch {
        throw new Error("Live audit endpoint returned a non-JSON response.");
      }

      if (!response.ok) {
        const data = payload as { message?: string; details?: string };
        throw new Error(data.message || data.details || "Live audit failed.");
      }

      applyAuditorResult(payload as Parameters<typeof applyAuditorResult>[0]);
    } catch (error) {
      setRun({
        mode: "live",
        status: "error",
        finishedAt: new Date().toISOString(),
        progressPhase: "finalizing",
        progressMessage: "Live audit failed",
        errorMessage: error instanceof Error ? error.message : "Live audit failed"
      });
    } finally {
      clearInterval(phaseTimer);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Run an Audit</h2>
      <p className="mt-1 text-sm text-slate-600">Run a live crawl + deterministic MRI analysis with evidence-backed scoring.</p>

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
          {isRunning ? "Running Live Audit..." : "Run Live Audit"}
        </button>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">Status: {run.status}</p>
        {run.progressPhase ? <p className="mt-1 text-slate-700">Phase: {run.progressPhase}</p> : null}
        {isRunning ? <p className="mt-1 text-slate-600">Elapsed: {formatElapsed(elapsedSeconds)}</p> : null}
        {run.progressMessage ? <p className="mt-1 text-slate-600">{run.progressMessage}</p> : null}
        {run.errorMessage ? <p className="mt-1 text-red-600">{run.errorMessage}</p> : null}

        {(run.liveMeta?.warnings?.length ?? 0) > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700">
            {(run.liveMeta?.warnings ?? []).map((warning, idx) => (
              <li key={`${warning}-${idx}`}>{warning}</li>
            ))}
          </ul>
        ) : null}

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
