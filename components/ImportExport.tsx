"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { useMRIStore } from "@/lib/store";

export default function ImportExport() {
  const [message, setMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportState = useMRIStore((state) => state.exportState);
  const importState = useMRIStore((state) => state.importState);
  const resetAll = useMRIStore((state) => state.resetAll);

  function downloadJson() {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `axi-mri-audit-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setMessage("Exported JSON file.");
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = importState(payload);
      if (!result.ok) {
        setMessage(`Import failed: ${result.error}`);
        return;
      }
      setMessage("Import successful.");
    } catch {
      setMessage("Import failed: invalid JSON file.");
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">State Tools</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" onClick={downloadJson}>
          Export JSON
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" onClick={triggerImport}>
          Import JSON
        </button>
        <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700" onClick={resetAll}>
          Reset
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={onFileChange} />
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </section>
  );
}
