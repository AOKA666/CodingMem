import { NextRequest, NextResponse } from "next/server";
import { isIsoDate } from "@/lib/date";
import { stripThinkTags } from "@/lib/summarize";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const supabase = getSupabaseAdmin();

  if (date) {
    if (!isIsoDate(date)) {
      return NextResponse.json({ ok: false, error: "date 必须是 YYYY-MM-DD 格式" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("codingMem_daily_summaries")
      .select("date, summary_markdown, updated_at")
      .eq("user_id", "default")
      .eq("date", date)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, date, summary: stripThinkTags(data?.summary_markdown ?? "") });
  }

  const { data, error } = await supabase
    .from("codingMem_daily_summaries")
    .select("date, summary_markdown, updated_at")
    .eq("user_id", "default")
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    summaries: (data ?? []).map((item) => ({
      ...item,
      summary_markdown: stripThinkTags(item.summary_markdown ?? "")
    }))
  });
}
