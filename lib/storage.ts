import fs from "node:fs";
import path from "node:path";
import type { Lead, Report } from "./types";

const DATA_DIR = path.resolve(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

function ensureFile(filePath: string) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }
}

function readJson<T>(filePath: string): T[] {
  ensureFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T[];
}

function writeJson<T>(filePath: string, value: T[]) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function saveReport(report: Report) {
  const reports = readJson<Report>(REPORTS_FILE);
  reports.unshift(report);
  writeJson(REPORTS_FILE, reports.slice(0, 2000));
}

export function getReport(reportId: string): Report | null {
  return readJson<Report>(REPORTS_FILE).find((r) => r.id === reportId) ?? null;
}

export function updateReport(reportId: string, update: Partial<Report>): Report | null {
  const reports = readJson<Report>(REPORTS_FILE);
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;
  reports[index] = { ...reports[index], ...update };
  writeJson(REPORTS_FILE, reports);
  return reports[index];
}

export function saveLead(lead: Lead) {
  const leads = readJson<Lead>(LEADS_FILE);
  leads.unshift(lead);
  writeJson(LEADS_FILE, leads.slice(0, 10000));
}
