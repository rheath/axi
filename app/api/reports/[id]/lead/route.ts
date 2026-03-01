import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { getReport, saveLead, updateReport } from "@/lib/storage";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email;
  const consent = body?.consent;

  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
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

  return NextResponse.json({ unlocked: true, report: unlocked }, { status: 201 });
}
