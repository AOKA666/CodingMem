import { NextResponse } from "next/server";
import { SUMMARY_SYSTEM_PROMPT } from "@/lib/summarize";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    summary_system_prompt: SUMMARY_SYSTEM_PROMPT,
    source: "apps/web/lib/summarize.ts"
  });
}
