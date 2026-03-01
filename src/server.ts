import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { crawlWebsite } from "./crawler.js";
import { scoreCrawl } from "./scoring.js";
import { getReport, saveLead, saveReport, updateReport } from "./storage.js";
import type { Lead, Report } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.resolve(__dirname, "../public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "axi-ai-readiness-checker" });
});

app.post("/api/scans", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing required field: url" });
  }

  try {
    const crawl = await crawlWebsite(url);
    const scored = scoreCrawl(crawl);

    const report: Report = {
      id: nanoid(12),
      createdAt: new Date().toISOString(),
      lockStatus: "locked",
      ...scored
    };

    saveReport(report);

    const previewFixes = report.topFixes.slice(0, 3);
    return res.status(201).json({
      reportId: report.id,
      status: "complete",
      report: {
        ...report,
        checks: previewFixes,
        topFixes: previewFixes,
        lockStatus: "locked"
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: "Scan failed",
      details: (error as Error).message
    });
  }
});

app.get("/api/reports/:id", (req, res) => {
  const report = getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  if (report.lockStatus === "locked") {
    const previewFixes = report.topFixes.slice(0, 3);
    return res.json({
      ...report,
      checks: previewFixes,
      topFixes: previewFixes,
      lockStatus: "locked"
    });
  }

  return res.json(report);
});

app.post("/api/reports/:id/lead", (req, res) => {
  const report = getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  const { email, consent } = req.body ?? {};

  const validEmail = typeof email === "string" && /^\S+@\S+\.\S+$/.test(email);
  if (!validEmail) {
    return res.status(400).json({ error: "Please provide a valid email address" });
  }

  const lead: Lead = {
    id: nanoid(10),
    reportId: report.id,
    email,
    consent: Boolean(consent),
    createdAt: new Date().toISOString()
  };

  saveLead(lead);
  const unlocked = updateReport(report.id, { lockStatus: "unlocked" });

  return res.status(201).json({
    unlocked: true,
    report: unlocked
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/index.html"));
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI readiness checker running on http://localhost:${port}`);
});
