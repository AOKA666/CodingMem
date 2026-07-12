import { NextResponse } from "next/server";
import { todayIsoDate } from "@/lib/date";
import { sanitizeSummary } from "@/lib/summarize";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const date = todayIsoDate();
  const { data, error } = await supabase
    .from("codingMem_daily_summaries")
    .select("date, summary_markdown, updated_at")
    .eq("user_id", "default")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, date, summary: sanitizeSummary(data?.summary_markdown ?? "") });
}
