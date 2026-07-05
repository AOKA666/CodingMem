import Link from "next/link";
import { todayIsoDate } from "@/lib/date";
import { projectDisplayName, projectIdentityKey, UNNAMED_PROJECT_KEY } from "@/lib/projectIdentity";
import { fetchRawMessagesInRange } from "@/lib/rawMessages";
import { getSupabaseAdmin } from "@/lib/supabase";
import { summarizeTimelineRows, summarizeTimelineTitle } from "@/lib/timelineSummary";

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
  const projectKey = searchParams.project ? decodeURIComponent(searchParams.project) : UNNAMED_PROJECT_KEY;
  const data = await getProjectTimeline(selectedDate, projectKey);

  return (
    <main className="detail-shell">
      <header className="detail-header">
        <div>
          <Link className="detail-back" href={`/summaries?date=${selectedDate}`}>
            返回项目记忆
          </Link>
          <p className="eyebrow">项目详情</p>
          <h1>{data.displayName}</h1>
        </div>
        <div className="detail-stat-row">
          <span>{data.messages} 条记录</span>
          <span>{data.devices} 台设备</span>
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
                  {node.messages} 条记录 · {node.devices} 台设备
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

async function getProjectTimeline(date: string, projectKey: string) {
  const supabase = getSupabaseAdmin();
  const { start, end } = getMemoryRange(date);
  const allRows = await fetchRawMessagesInRange<RawMessageRow>(
    supabase,
    "role, content, occurred_at, project_name, device_id",
    start,
    end
  );
  const rows = allRows.filter((row) => projectIdentityKey(row.project_name) === projectKey);
  const hourMap = new Map<string, RawMessageRow[]>();

  rows.forEach((row) => {
    const dateValue = new Date(row.occurred_at);
    const key = `${dateValue.toISOString().slice(0, 13)}:00`;
    const bucket = hourMap.get(key) ?? [];
    bucket.push(row);
    hourMap.set(key, bucket);
  });

  const nodes = Array.from(hourMap.entries()).flatMap(([key, hourRows]) => {
    const first = new Date(hourRows[0].occurred_at);
    const title = summarizeTimelineTitle(hourRows);
    const text = summarizeRows(hourRows);
    if (!title || !text) return [];

    return [{
      key,
      day: first.toISOString().slice(5, 10),
      hour: `${first.getHours().toString().padStart(2, "0")}:00`,
      title,
      text,
      messages: hourRows.length,
      devices: new Set(hourRows.map((row) => row.device_id)).size
    }];
  });

  return {
    displayName: projectDisplayName(rows[0]?.project_name ?? (projectKey === UNNAMED_PROJECT_KEY ? null : projectKey)),
    messages: rows.length,
    devices: new Set(rows.map((row) => row.device_id)).size,
    nodes
  };
}

function summarizeRows(rows: RawMessageRow[]) {
  return summarizeTimelineRows(rows);
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
