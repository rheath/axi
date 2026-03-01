import { NextResponse } from "next/server";
import { getReport } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.lockStatus === "locked") {
    const previewFixes = report.topFixes.slice(0, 3);
    return NextResponse.json({
      ...report,
      checks: previewFixes,
      topFixes: previewFixes,
      lockStatus: "locked"
    });
  }

  return NextResponse.json(report);
}
