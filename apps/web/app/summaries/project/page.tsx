import Link from "next/link";
import { todayIsoDate } from "@/lib/date";
import { stripThinkTags } from "@/lib/summarize";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = {
  date?: string;
  project?: string;
};

type RawMessageRow = {
  role: string | null;
  content: string;
  occurred_at: string;
  project_name: string | null;
  device_id: string;
};

export default async function ProjectMemoryPage({ searchParams }: { searchParams: SearchParams }) {
  const selectedDate = searchParams.date || todayIsoDate();
  const projectKey = searchParams.project || "__NULL__";
  const projectName = projectKey === "__NULL__" ? null : decodeURIComponent(projectKey);
  const data = await getProjectTimeline(selectedDate, projectName);
  const displayName = projectName || "未命名项目";

  return (
    <main className="detail-shell">
      <header className="detail-header">
        <div>
          <Link className="detail-back" href={`/summaries?date=${selectedDate}`}>
            返回项目记忆
          </Link>
          <p className="eyebrow">项目详情</p>
          <h1>{displayName}</h1>
        </div>
        <div className="detail-stat-row">
          <span>{data.messages} 条记录</span>
          <span>{data.userMessages} 次提问</span>
          <span>{data.assistantMessages} 次回复</span>
        </div>
      </header>

      <section className="detail-panel">
        <div className="detail-panel-head">
          <h2>按小时记录的时间线</h2>
          <p>每个节点按同一小时内的对话归纳，便于回看项目推进过程。</p>
        </div>

        <div className="hour-timeline">
          {data.nodes.map((node) => (
            <article className="hour-node" key={node.key}>
              <div className="hour-node-time">
                <strong>{node.day}</strong>
                <span>{node.hour}</span>
              </div>
              <div className="hour-node-body">
                <h3>{node.title}</h3>
                <p>{node.text}</p>
                <small>
                  {node.messages} 条记录 · 我提问 {node.userMessages} 次 · Codex 回复 {node.assistantMessages} 次
                </small>
              </div>
            </article>
          ))}
          {data.nodes.length === 0 ? <p className="summary-empty">这个项目还没有可展示的记录。</p> : null}
        </div>
      </section>
    </main>
  );
}

async function getProjectTimeline(date: string, projectName: string | null) {
  const supabase = getSupabaseAdmin();
  const { start, end } = getMemoryRange(date);
  let query = supabase
    .from("codingMem_raw_messages")
    .select("role, content, occurred_at, project_name, device_id")
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: true });

  query = projectName === null ? query.is("project_name", null) : query.eq("project_name", projectName);
  const { data } = await query;
  const rows = (data ?? []) as RawMessageRow[];
  const hourMap = new Map<string, RawMessageRow[]>();

  rows.forEach((row) => {
    const dateValue = new Date(row.occurred_at);
    const key = `${dateValue.toISOString().slice(0, 13)}:00`;
    const bucket = hourMap.get(key) ?? [];
    bucket.push(row);
    hourMap.set(key, bucket);
  });

  const nodes = Array.from(hourMap.entries()).map(([key, hourRows]) => {
    const first = new Date(hourRows[0].occurred_at);
    const userMessages = hourRows.filter((row) => row.role === "user").length;
    const assistantMessages = hourRows.filter((row) => row.role === "assistant").length;
    return {
      key,
      day: first.toISOString().slice(5, 10),
      hour: `${first.getHours().toString().padStart(2, "0")}:00`,
      title: pickTopic(hourRows) || "项目交流",
      text: summarizeRows(hourRows),
      messages: hourRows.length,
      userMessages,
      assistantMessages
    };
  });

  return {
    messages: rows.length,
    userMessages: rows.filter((row) => row.role === "user").length,
    assistantMessages: rows.filter((row) => row.role === "assistant").length,
    nodes
  };
}

function summarizeRows(rows: RawMessageRow[]) {
  const userRows = rows.filter((row) => row.role === "user");
  const assistantRows = rows.filter((row) => row.role === "assistant");
  const topic = pickTopic(userRows.length > 0 ? userRows : rows);
  if (topic) {
    return `这一小时主要围绕“${topic}”推进讨论，包含 ${rows.length} 条记录，Codex 回复 ${assistantRows.length} 次。`;
  }
  return `这一小时有 ${rows.length} 条项目交流，我提问 ${userRows.length} 次，Codex 回复 ${assistantRows.length} 次。`;
}

function pickTopic(rows: RawMessageRow[]) {
  const text = rows
    .map((row) => stripThinkTags(row.content))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[{}[\]()`"'<>]/g, "")
    .trim();
  if (!text) return "";
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
}

function getMemoryRange(date: string) {
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
