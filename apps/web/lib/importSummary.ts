type ExistingSummary = {
  summary_markdown?: string | null;
} | null;

type ImportedSummaryInput = {
  date: string;
  summary: string;
  source?: string;
  projects?: string[];
};

export type ImportedSummaryRow = {
  user_id: "default";
  date: string;
  summary_markdown: string;
  projects_json: string[];
  todos_json: [];
  updated_at: string;
  source: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REASONING_LINE = /^(?:wait[,.:\s]|actually\b|the system prompt\b|this is a conflict\b|according to priority rules\b|root_system_policy\b)/i;

export function buildImportedSummaryRow(input: ImportedSummaryInput): ImportedSummaryRow {
  if (!ISO_DATE.test(input.date)) {
    throw new Error("date 必须是 YYYY-MM-DD 格式");
  }

  const summary = sanitizeImportedSummary(input.summary);
  if (!summary) {
    throw new Error("summary 不能为空");
  }

  return {
    user_id: "default",
    date: input.date,
    summary_markdown: summary,
    projects_json: normalizeProjects(input.projects),
    todos_json: [],
    updated_at: new Date().toISOString(),
    source: normalizeSource(input.source)
  };
}

export function shouldCreateImportedSummary(existing: ExistingSummary) {
  return !existing?.summary_markdown;
}

export function shouldReplaceImportedSummary(value: unknown) {
  return value === true;
}

export function toSummaryInsertRow(row: ImportedSummaryRow) {
  return {
    user_id: row.user_id,
    date: row.date,
    summary_markdown: row.summary_markdown,
    projects_json: row.projects_json,
    todos_json: row.todos_json,
    updated_at: row.updated_at
  };
}

function sanitizeImportedSummary(content: string) {
  const withoutThinking = String(content ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();
  const summaryStart = withoutThinking.indexOf("项目记忆总览");
  const structured = summaryStart >= 0 ? withoutThinking.slice(summaryStart) : withoutThinking;

  return structured
    .split("\n")
    .filter((line) => !REASONING_LINE.test(line.trim()))
    .join("\n")
    .trim();
}

function normalizeProjects(projects: unknown) {
  if (!Array.isArray(projects)) return ["工作助手"];
  const normalized = Array.from(
    new Set(projects.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))
  );
  return normalized.length > 0 ? normalized : ["工作助手"];
}

function normalizeSource(source: unknown) {
  return typeof source === "string" && source.trim() ? source.trim() : "hermes-work-assistant";
}
