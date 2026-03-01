import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";
import { scoreCrawl } from "@/lib/scoring";
import { saveReport } from "@/lib/storage";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = body?.url;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
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

    return NextResponse.json(
      {
        reportId: report.id,
        status: "complete",
        report: {
          ...report,
          checks: previewFixes,
          topFixes: previewFixes,
          lockStatus: "locked"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Scan failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
