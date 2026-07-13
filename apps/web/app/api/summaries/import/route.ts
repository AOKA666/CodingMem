import { NextRequest, NextResponse } from "next/server";
import { requireSyncToken } from "@/lib/auth";
import { buildImportedSummaryRow, shouldCreateImportedSummary, toSummaryInsertRow } from "@/lib/importSummary";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = requireSyncToken(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON" }, { status: 400 });
  }

  let row;
  try {
    row = buildImportedSummaryRow({
      date: body.date,
      summary: body.summary,
      source: body.source,
      projects: body.projects
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "导入总结失败" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("codingMem_daily_summaries")
    .select("summary_markdown")
    .eq("user_id", "default")
    .eq("date", row.date)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  if (!shouldCreateImportedSummary(existing)) {
    return NextResponse.json({
      ok: true,
      inserted: false,
      skipped: true,
      date: row.date,
      source: row.source,
      message: "该日期已经有总结，未覆盖已有内容"
    });
  }

  const { error: insertError } = await supabase.from("codingMem_daily_summaries").insert(toSummaryInsertRow(row));
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: true,
    skipped: false,
    date: row.date,
    source: row.source,
    summary: row.summary_markdown
  });
}
