"use client";

import { useState } from "react";
import type { Check, Report } from "@/lib/types";

type PreviewReport = Report & {
  checks: Check[];
  topFixes: Check[];
};

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [report, setReport] = useState<PreviewReport | null>(null);

  const runScan = async () => {
    if (!url.trim()) {
      setStatus("Please enter a URL.");
      return;
    }

    setLoadingScan(true);
    setStatus("Scanning website...");

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Scan failed");

      setReportId(json.reportId);
      setReport(json.report);
      setStatus("Preview generated. Unlock full findings with email.");
    } catch (error) {
      setStatus(`Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingScan(false);
    }
  };

  const unlockReport = async () => {
    if (!reportId) {
      setStatus("Run a scan first.");
      return;
    }
    if (!email.trim()) {
      setStatus("Enter an email to unlock.");
      return;
    }

    setLoadingUnlock(true);
    setStatus("Unlocking report...");

    try {
      const unlockResponse = await fetch(`/api/reports/${reportId}/lead`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent })
      });

      const unlockJson = await unlockResponse.json();
      if (!unlockResponse.ok) throw new Error(unlockJson.error || "Unable to unlock report");

      const reportResponse = await fetch(`/api/reports/${reportId}`);
      const fullReport = await reportResponse.json();
      if (!reportResponse.ok) throw new Error(fullReport.error || "Unable to fetch full report");

      setReport(fullReport);
      setStatus("Full report unlocked.");
    } catch (error) {
      setStatus(`Unlock failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingUnlock(false);
    }
  };

  const fixClass = (outcome: string) => (outcome === "fail" ? "fail" : outcome === "warn" ? "warn" : "");

  return (
    <main className="shell">
      <h1>AI Readiness Checker</h1>
      <p className="lead">
        Drop in any website URL to generate an AI-readiness score based on crawlability, structure, trust
        signals, and content extractability.
      </p>

      <section className="card">
        <div className="inputRow">
          <input type="url" placeholder="example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button onClick={runScan} disabled={loadingScan}>
            {loadingScan ? "Scanning..." : "Run Scan"}
          </button>
        </div>
        <p className="status">{status}</p>
      </section>

      {report && (
        <section className="card">
          <div className="score">
            <div className="scorePill">{report.overallScore}</div>
            <div>
              <h2 style={{ margin: "0 0 6px" }}>{report.normalizedUrl}</h2>
              <p className="small">Generated {new Date(report.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <h3>Category Scores</h3>
          <div className="grid">
            {report.categoryScores.map((cat) => (
              <article className="cat" key={cat.categoryId}>
                <strong>{cat.label}</strong>
                <p style={{ fontSize: 26, margin: "10px 0 0" }}>{cat.score}</p>
                <p className="small" style={{ margin: "2px 0 0" }}>
                  Weight {cat.weight}%
                </p>
              </article>
            ))}
          </div>

          <h3>Top Fixes</h3>
          <div>
            {report.topFixes.map((check) => (
              <article className="fix" key={`${check.id}-${check.outcome}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{check.title}</strong>
                  <span className={`badge ${fixClass(check.outcome)}`}>{check.outcome.toUpperCase()}</span>
                </div>
                <p className="small">{check.description}</p>
                <p className="small">
                  <strong>Evidence:</strong> {check.evidence ?? "n/a"}
                </p>
                <p className="small">
                  <strong>Fix:</strong> {check.recommendation ?? "n/a"}
                </p>
              </article>
            ))}
          </div>

          {report.lockStatus === "locked" && (
            <div className="card" style={{ marginTop: 16, background: "#fcfff7" }}>
              <h3 style={{ marginTop: 0 }}>Unlock full report</h3>
              <p className="small">Enter your email to reveal all findings and recommendations.</p>
              <div className="inputRow">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button className="secondary" onClick={unlockReport} disabled={loadingUnlock}>
                  {loadingUnlock ? "Unlocking..." : "Unlock"}
                </button>
              </div>
              <label className="small" style={{ display: "block", marginTop: 8 }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I agree to
                receive occasional product updates.
              </label>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
