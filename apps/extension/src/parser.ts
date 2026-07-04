import * as fs from "fs/promises";
import * as path from "path";
import { ParsedMessage } from "./types";
import { getProjectName } from "./utils";

type Logger = (message: string) => void;

export async function parseSessionFile(filePath: string, workspaceRoot: string | null, log: Logger) {
  const stat = await fs.stat(filePath);
  const content = await fs.readFile(filePath, "utf8");
  const records = filePath.endsWith(".jsonl") ? parseJsonl(content, filePath, log) : parseJson(content, filePath, log);
  const messages: ParsedMessage[] = [];
  const context: ParseContext = {
    projectPath: workspaceRoot,
    sessionId: path.basename(filePath, path.extname(filePath))
  };

  records.forEach((record: unknown, index: number) => {
    updateContext(record, context);
    const message = toParsedMessage(record, filePath, workspaceRoot, stat.mtime, index, context);
    if (message) {
      messages.push(message);
    }
  });

  return messages;
}

type ParseContext = {
  projectPath: string | null;
  sessionId: string | null;
};

function parseJsonl(content: string, filePath: string, log: Logger) {
  const records: unknown[] = [];
  content.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      records.push(JSON.parse(trimmed));
    } catch (error) {
      log(`Skipped invalid JSONL line ${index + 1} in ${filePath}: ${String(error)}`);
    }
  });
  return records;
}

function parseJson(content: string, filePath: string, log: Logger) {
  try {
    const value = JSON.parse(content);
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.messages)) return value.messages;
    if (Array.isArray(value?.items)) return value.items;
    return [value];
  } catch (error) {
    log(`Skipped invalid JSON file ${filePath}: ${String(error)}`);
    return [];
  }
}

function toParsedMessage(
  raw: any,
  filePath: string,
  workspaceRoot: string | null,
  fileMtime: Date,
  index: number,
  context: ParseContext
): ParsedMessage | null {
  const payload = raw?.payload;
  const content = normalizeContent(
    firstDefined(
      raw?.content,
      raw?.text,
      raw?.message?.content,
      raw?.message?.text,
      raw?.delta,
      payload?.content,
      payload?.message,
      payload?.text,
      payload?.output,
      payload?.summary
    )
  );
  if (!content) return null;

  const projectPath =
    firstString(
      raw?.cwd,
      raw?.workspace,
      raw?.workspacePath,
      raw?.project_path,
      raw?.projectPath,
      payload?.cwd,
      payload?.workspace,
      payload?.workspacePath,
      payload?.project_path,
      payload?.projectPath
    ) ?? context.projectPath ?? workspaceRoot;
  const occurredRaw = firstDefined(
    raw?.timestamp,
    raw?.created_at,
    raw?.createdAt,
    raw?.time,
    raw?.message?.timestamp,
    payload?.timestamp,
    payload?.created_at,
    payload?.createdAt,
    payload?.time,
    payload?.started_at
  );
  const occurredAt = normalizeDate(occurredRaw) ?? new Date(fileMtime.getTime() + index).toISOString();
  const role = inferRole(raw, payload);

  return {
    source: "codex",
    role,
    content,
    occurred_at: occurredAt,
    session_id:
      firstString(
        raw?.session_id,
        raw?.sessionId,
        raw?.conversation_id,
        raw?.conversationId,
        raw?.id,
        payload?.session_id,
        payload?.sessionId,
        payload?.turn_id,
        payload?.id
      ) ??
      context.sessionId ??
      path.basename(filePath, path.extname(filePath)),
    project_path: projectPath,
    project_name: getProjectName(projectPath),
    file_path: filePath,
    raw
  };
}

function updateContext(record: unknown, context: ParseContext) {
  const raw = record as any;
  const payload = raw?.payload;
  const projectPath = firstString(
    raw?.cwd,
    raw?.workspace,
    raw?.workspacePath,
    raw?.project_path,
    raw?.projectPath,
    payload?.cwd,
    payload?.workspace,
    payload?.workspacePath,
    payload?.project_path,
    payload?.projectPath
  );
  const sessionId = firstString(
    raw?.session_id,
    raw?.sessionId,
    raw?.conversation_id,
    raw?.conversationId,
    payload?.session_id,
    payload?.sessionId
  );

  if (projectPath) {
    context.projectPath = projectPath;
  }
  if (sessionId) {
    context.sessionId = sessionId;
  }
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstString(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof value === "string" ? value : null;
}

function normalizeRole(value: string | null): ParsedMessage["role"] {
  if (value === "user" || value === "assistant" || value === "system" || value === "tool") return value;
  if (value === "developer") return "system";
  return "unknown";
}

function inferRole(raw: any, payload: any): ParsedMessage["role"] {
  const role = normalizeRole(firstString(raw?.role, raw?.message?.role, raw?.author?.role, payload?.role, payload?.author?.role));
  if (role !== "unknown") return role;

  const payloadType = firstString(payload?.type, raw?.type);
  if (payloadType === "function_call_output") return "tool";
  if (raw?.type === "event_msg" && typeof payload?.message === "string") return "user";
  return "unknown";
}

function normalizeContent(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const text = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        if (typeof item?.content === "string") return item.content;
        if (typeof item?.summary === "string") return item.summary;
        return "";
      })
      .filter(Boolean)
      .join("\n");
    return text.trim() || null;
  }
  return null;
}

function normalizeDate(value: unknown) {
  if (typeof value === "number") {
    const date = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}
