import { NextRequest, NextResponse } from "next/server";
import { requireSyncToken } from "@/lib/auth";
import { isIsoDate } from "@/lib/date";
import { generateSummaryForDate } from "@/lib/summarize";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = requireSyncToken(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body || !isIsoDate(body.date)) {
    return NextResponse.json({ ok: false, error: "date 必须是 YYYY-MM-DD 格式" }, { status: 400 });
  }

  try {
    const summary = await generateSummaryForDate(body.date);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "生成日报失败" },
      { status: 500 }
    );
  }
}
