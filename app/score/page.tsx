"use client";

import { useEffect } from "react";
import AuditRunner from "@/components/AuditRunner";
import ImportExport from "@/components/ImportExport";
import ScoreTable from "@/components/ScoreTable";
import SummaryPanel from "@/components/SummaryPanel";
import { useMRIStore } from "@/lib/store";

export default function ScorePage() {
  const hydrated = useMRIStore((state) => state.hydrated);
  const hydrateFromStorage = useMRIStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-16">
        <p className="text-sm text-slate-600">Loading audit state...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">AXI MRI Scoring Tool</h1>
        <p className="mt-1 text-sm text-slate-600">No-auth beta workspace with local autosave.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <AuditRunner />
          <ImportExport />
        </div>

        <ScoreTable />

        <SummaryPanel />
      </div>
    </main>
  );
}
