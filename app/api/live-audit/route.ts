import { NextRequest, NextResponse } from "next/server";
import { LiveAuditError, runLiveAudit } from "@/lib/liveAuditor";
import type { HeaderState } from "@/lib/mriModel";

export const runtime = "nodejs";

function parseHeader(payload: unknown): HeaderState {
  if (typeof payload !== "object" || payload === null) {
    throw new LiveAuditError(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const input = payload as Partial<{ header: HeaderState }>;
  if (!input.header) {
    throw new LiveAuditError(400, "INVALID_REQUEST", "Missing header payload.");
  }

  return {
    companyName: input.header.companyName ?? "",
    targetUrl: input.header.targetUrl ?? "",
    taskPrompt: input.header.taskPrompt ?? "",
    constraints: {
      stopBeforePayment: Boolean(input.header.constraints?.stopBeforePayment),
      dontCreateAccount: Boolean(input.header.constraints?.dontCreateAccount),
      timeLimitMinutes: Number(input.header.constraints?.timeLimitMinutes ?? 10)
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const header = parseHeader(body);
    const result = await runLiveAudit(header);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof LiveAuditError) {
      return NextResponse.json(
        {
          errorCode: error.code,
          message: error.message,
          details: error.details
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        errorCode: "LIVE_AUDIT_FAILED",
        message: "Live audit failed unexpectedly.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
