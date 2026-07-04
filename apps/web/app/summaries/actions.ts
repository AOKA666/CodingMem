"use server";

import { revalidatePath } from "next/cache";
import { generateSummaryForDate } from "@/lib/summarize";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function regenerateSummary(formData: FormData) {
  const date = formData.get("date");
  if (typeof date !== "string") {
    throw new Error("缺少日期");
  }

  await generateSummaryForDate(date);
  revalidatePath("/summaries");
}

export async function updateProjectName(formData: FormData) {
  const date = formData.get("date");
  const oldName = formData.get("oldName");
  const newName = formData.get("newName");

  if (typeof date !== "string" || typeof oldName !== "string" || typeof newName !== "string") {
    throw new Error("缺少项目名修改参数");
  }

  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error("项目名不能为空");
  }

  const supabase = getSupabaseAdmin();
  const { start, end } = getSevenDayRange(date);
  let query = supabase
    .from("codingMem_raw_messages")
    .update({ project_name: trimmedName })
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  query = oldName === "__NULL__" ? query.is("project_name", null) : query.eq("project_name", oldName);
  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const { data: projects } = await supabase
    .from("codingMem_raw_messages")
    .select("project_name")
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  await supabase
    .from("codingMem_daily_summaries")
    .update({
      projects_json: Array.from(new Set((projects ?? []).map((row) => row.project_name || "未命名项目"))),
      updated_at: new Date().toISOString()
    })
    .eq("user_id", "default")
    .eq("date", date);

  revalidatePath("/summaries");
}

function getSevenDayRange(date: string) {
  const endDateValue = new Date(`${date}T00:00:00.000Z`);
  const startDateValue = new Date(endDateValue);
  startDateValue.setUTCDate(startDateValue.getUTCDate() - 29);

  const endExclusive = new Date(endDateValue);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return {
    start: startDateValue.toISOString(),
    end: endExclusive.toISOString()
  };
}
