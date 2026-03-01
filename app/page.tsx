import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AXI Public Beta</p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">MRI Scoring Model</h1>
      <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
        Evaluate machine readiness with a spreadsheet-style scorecard, simulated AI auditor, and exportable report.
      </p>
      <Link
        href="/score"
        className="mt-8 inline-flex rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        Open Scoring Tool
      </Link>
    </main>
  );
}
