import { NextRequest, NextResponse } from "next/server";
import { requireSyncToken } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SyncMessage = {
  source?: string;
  session_id?: string | null;
  message_hash?: string;
  role?: string;
  content?: string;
  occurred_at?: string;
  project_name?: string | null;
  project_path_hash?: string | null;
  file_path_hash?: string;
  raw?: unknown;
};

export async function POST(request: NextRequest) {
  const authError = requireSyncToken(request);
  if (authError) return authError;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ ok: false, error: "messages 必须是数组" }, { status: 400 });
  }

  const device = body.device ?? {};
  if (!device.device_id) {
    return NextResponse.json({ ok: false, error: "缺少 device.device_id" }, { status: 400 });
  }

  const validMessages: SyncMessage[] = [];
  const failed: string[] = [];

  for (const message of body.messages as SyncMessage[]) {
    if (!message.message_hash) {
      failed.push("缺少 message_hash");
      continue;
    }
    if (!message.content || typeof message.content !== "string") {
      failed.push(`${message.message_hash}: 缺少 content`);
      continue;
    }
    if (!message.occurred_at || Number.isNaN(Date.parse(message.occurred_at))) {
      failed.push(`${message.message_hash}: occurred_at 无效`);
      continue;
    }
    validMessages.push(message);
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: deviceError } = await supabase.from("codingMem_devices").upsert(
    {
      user_id: "default",
      device_id: device.device_id,
      device_name: device.device_name ?? null,
      os: device.os ?? null,
      updated_at: now
    },
    { onConflict: "device_id" }
  );

  if (deviceError) {
    return NextResponse.json({ ok: false, error: deviceError.message }, { status: 500 });
  }

  const rowMap = new Map<string, Record<string, unknown>>();
  validMessages.forEach((message) => {
    const content = sanitizePostgresString(message.content ?? "");
    rowMap.set(message.message_hash as string, {
      user_id: "default",
      device_id: sanitizePostgresString(device.device_id),
      source: sanitizePostgresString(message.source || "codex"),
      project_name: sanitizeNullableString(message.project_name ?? body.workspace?.project_name),
      project_path_hash: sanitizeNullableString(message.project_path_hash ?? body.workspace?.project_path_hash),
      session_id: sanitizeNullableString(message.session_id),
      message_hash: message.message_hash,
      role: sanitizePostgresString(message.role ?? "unknown"),
      content,
      raw_json: sanitizeJsonValue(message.raw ?? {}),
      occurred_at: new Date(message.occurred_at as string).toISOString()
    });
  });
  const rows = Array.from(rowMap.values());
  const batchDuplicates = validMessages.length - rows.length;

  let inserted = 0;
  if (rows.length > 0) {
    const hashes = rows.map((row) => row.message_hash);
    const { data: existingRows, error: existingError } = await supabase
      .from("codingMem_raw_messages")
      .select("message_hash")
      .in("message_hash", hashes);

    if (existingError) {
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    const existingHashes = new Set((existingRows ?? []).map((row) => row.message_hash));

    const { data, error } = await supabase
      .from("codingMem_raw_messages")
      .upsert(rows, { onConflict: "message_hash" })
      .select("message_hash");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    inserted = hashes.filter((hash) => !existingHashes.has(hash)).length;
  }

  return NextResponse.json({
    ok: true,
    received: body.messages.length,
    inserted,
    duplicates: validMessages.length - inserted,
    batch_duplicates: batchDuplicates,
    failed: failed.length,
    errors: failed.slice(0, 10)
  });
}

function sanitizeNullableString(value: unknown) {
  return typeof value === "string" ? sanitizePostgresString(value) : null;
}

function sanitizePostgresString(value: string) {
  return replaceUnpairedSurrogates(value).replace(/\u0000/g, "");
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizePostgresString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        sanitizePostgresString(key),
        sanitizeJsonValue(item)
      ])
    );
  }
  return value;
}

function replaceUnpairedSurrogates(value: string) {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index += 1;
      } else {
        result += "\ufffd";
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      result += "\ufffd";
      continue;
    }

    result += value[index];
  }

  return result;
}
