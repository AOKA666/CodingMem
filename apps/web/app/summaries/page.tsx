import Link from "next/link";
import { todayIsoDate } from "@/lib/date";
import { stripThinkTags } from "@/lib/summarize";
import { getSupabaseAdmin } from "@/lib/supabase";
import { regenerateSummary, updateProjectName } from "./actions";
import { CopyMarkdownButton } from "./SummaryActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  date?: string;
};

type RawMessageRow = {
  role: string | null;
  content: string;
  occurred_at: string;
  project_name: string | null;
  device_id: string;
};

type TimelineDay = {
  date: string;
  text: string;
  messages: number;
};

type ProjectCard = {
  key: string;
  rawName: string | null;
  name: string;
  messages: number;
  userMessages: number;
  assistantMessages: number;
  devices: number;
  firstActiveAt: string | null;
  lastActiveAt: string | null;
  timeline: TimelineDay[];
};

export default async function SummariesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseAdmin();
  const selectedDate = searchParams.date || todayIsoDate();

  const [{ data: summaries }, { data: selected }, dashboard] = await Promise.all([
    supabase
      .from("codingMem_daily_summaries")
      .select("date, updated_at")
      .eq("user_id", "default")
      .order("date", { ascending: false }),
    supabase
      .from("codingMem_daily_summaries")
      .select("date, summary_markdown, updated_at")
      .eq("user_id", "default")
      .eq("date", selectedDate)
      .maybeSingle(),
    getDashboardData(selectedDate)
  ]);

  const summary = stripThinkTags(selected?.summary_markdown || "");

  return (
    <main className="memory-shell">
      <aside className="memory-sidebar">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <div>
            <strong>AI Coding Memory</strong>
            <span>智能开发记忆中枢</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="主导航">
          <span className="active">仪表盘</span>
          <span>项目</span>
          <span>时间线</span>
          <span>总结</span>
        </nav>

        <section className="side-panel">
          <p className="side-title">记忆版本</p>
          <div className="date-list">
            {(summaries ?? []).map((item) => (
              <Link className="date-link" href={`/summaries?date=${item.date}`} key={item.date}>
                <span>{item.date}</span>
                <em>{item.date === selectedDate ? "当前" : "查看"}</em>
              </Link>
            ))}
            {(summaries ?? []).length === 0 ? <p className="empty-note">还没有生成项目记忆</p> : null}
          </div>
        </section>
      </aside>

      <section className="memory-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">项目记忆</p>
            <h1>所有项目的 AI 编程活动</h1>
          </div>
          <div className="topbar-actions">
            <form action={regenerateSummary}>
              <input name="date" type="hidden" value={selectedDate} />
              <button className="button primary" type="submit">
                生成项目记忆
              </button>
            </form>
            <CopyMarkdownButton summary={summary} />
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="项目总数" value={dashboard.projects.length} hint="已识别的项目分区" tone="blue" />
          <MetricCard label="同步会话" value={dashboard.messages} hint="已沉淀的对话记录" tone="green" />
          <MetricCard label="活跃设备" value={dashboard.devices} hint="参与同步的设备数" tone="purple" />
          <MetricCard label="我的提问" value={dashboard.userMessages} hint="主动发起的问题数" tone="amber" />
        </div>

        <div className="content-grid">
          <section className="project-column">
            {dashboard.projects.length === 0 ? (
              <div className="project-card empty-state">
                <h2>还没有同步记录</h2>
                <p>先在 VS Code 执行“Codex 聊天同步：立即同步”，再回到这里查看项目记忆。</p>
              </div>
            ) : null}

            {dashboard.projects.map((project, index) => (
              <article className="project-card" key={project.key}>
                <div className="project-card-head">
                  <div className={`project-icon tone-${index % 4}`}>{project.name.slice(0, 2).toUpperCase()}</div>
                  <div className="project-title-block">
                    <form action={updateProjectName} className="project-name-form">
                      <input name="date" type="hidden" value={selectedDate} />
                      <input name="oldName" type="hidden" value={project.rawName ?? "__NULL__"} />
                      <input name="newName" defaultValue={project.name} aria-label="项目名" />
                      <button className="text-button" type="submit">
                        保存
                      </button>
                    </form>
                    <p>
                      {project.messages} 条记录 · {project.devices} 台设备 · {formatDate(project.firstActiveAt)} 开始 · 最近{" "}
                      {formatDate(project.lastActiveAt)}
                    </p>
                  </div>
                </div>

                <div className="project-memory-grid">
                  <div>
                    <div className="section-head-row">
                      <span className="block-label">项目时间线</span>
                      <Link className="detail-link" href={`/summaries/project?date=${selectedDate}&project=${encodeURIComponent(project.rawName ?? "__NULL__")}`}>
                        查看详情
                      </Link>
                    </div>
                    <div className="project-timeline">
                      {project.timeline.slice(-4).map((item) => (
                        <div className="timeline-item" key={item.date}>
                          <span className="timeline-dot" />
                          <time>{item.date.slice(5)}</time>
                          <p>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="project-mini-stats">
                    <span>我提问：{project.userMessages}</span>
                    <span>Codex 回复：{project.assistantMessages}</span>
                    <span>活跃天数：{project.timeline.length}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="summary-panel">
            <div className="summary-panel-head">
              <div>
                <p className="eyebrow">项目记忆总结</p>
                <h2>当前视图</h2>
              </div>
              <span className="calendar-badge">忆</span>
            </div>
            <div className="summary-reader">
              {summary ? renderSummary(summary) : <p className="summary-empty">还没有项目记忆。请先同步消息，然后点击“生成项目记忆”。</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: number;
  hint: string;
  tone: "blue" | "green" | "purple" | "amber";
}) {
  return (
    <section className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </section>
  );
}

function renderSummary(summary: string) {
  const sections = splitSummary(summary);
  return sections.map((section) => (
    <section className={section.title.startsWith("项目：") ? "summary-section project-summary" : "summary-section"} key={section.title}>
      <h3>{section.title}</h3>
      {section.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  ));
}

function splitSummary(summary: string) {
  const lines = summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: Array<{ title: string; lines: string[] }> = [];

  for (const line of lines) {
    const isTitle = line === "项目记忆总览" || line === "整体概览" || line.startsWith("项目：");
    if (isTitle || sections.length === 0) {
      sections.push({ title: isTitle ? line : "项目记忆总览", lines: isTitle ? [] : [line] });
      continue;
    }
    sections[sections.length - 1].lines.push(line);
  }

  return sections;
}

async function getDashboardData(date: string) {
  const supabase = getSupabaseAdmin();
  const { start, end } = getMemoryRange(date);
  const { data } = await supabase
    .from("codingMem_raw_messages")
    .select("role, content, occurred_at, project_name, device_id")
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: true });

  const rows = (data ?? []) as RawMessageRow[];
  const projectMap = new Map<
    string,
    ProjectCard & {
      deviceSet: Set<string>;
      dayMap: Map<string, RawMessageRow[]>;
    }
  >();

  rows.forEach((row) => {
    const rawName = row.project_name ?? null;
    const key = rawName ?? "__NULL__";
    const existing =
      projectMap.get(key) ??
      ({
        key,
        rawName,
        name: rawName || "未命名项目",
        messages: 0,
        userMessages: 0,
        assistantMessages: 0,
        devices: 0,
        firstActiveAt: row.occurred_at,
        lastActiveAt: null,
        timeline: [],
        deviceSet: new Set<string>(),
        dayMap: new Map<string, RawMessageRow[]>()
      } satisfies ProjectCard & { deviceSet: Set<string>; dayMap: Map<string, RawMessageRow[]> });

    existing.messages += 1;
    existing.firstActiveAt = existing.firstActiveAt ?? row.occurred_at;
    existing.lastActiveAt = row.occurred_at;
    existing.deviceSet.add(row.device_id);
    if (row.role === "user") existing.userMessages += 1;
    if (row.role === "assistant") existing.assistantMessages += 1;

    const day = row.occurred_at.slice(0, 10);
    const dayRows = existing.dayMap.get(day) ?? [];
    dayRows.push(row);
    existing.dayMap.set(day, dayRows);
    projectMap.set(key, existing);
  });

  const projects = Array.from(projectMap.values()).map(({ deviceSet, dayMap, ...project }) => ({
    ...project,
    devices: deviceSet.size,
    timeline: Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayRows]) => ({
        date: day,
        messages: dayRows.length,
        text: summarizeRows(dayRows)
      }))
  }));

  return {
    messages: rows.length,
    devices: new Set(rows.map((row) => row.device_id)).size,
    userMessages: rows.filter((row) => row.role === "user").length,
    projects
  };
}

function summarizeRows(rows: RawMessageRow[]) {
  const userRows = rows.filter((row) => row.role === "user");
  const assistantRows = rows.filter((row) => row.role === "assistant");
  const topic = pickTopic(userRows.length > 0 ? userRows : rows);
  if (topic) {
    return `围绕“${topic}”推进讨论，共 ${rows.length} 条记录，Codex 回复 ${assistantRows.length} 次。`;
  }
  return `进行了 ${rows.length} 条交流，其中我提问 ${userRows.length} 次，Codex 回复 ${assistantRows.length} 次。`;
}

function pickTopic(rows: RawMessageRow[]) {
  const text = rows
    .map((row) => stripThinkTags(row.content))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[{}[\]()`"'<>]/g, "")
    .trim();
  if (!text) return "";
  return text.length > 32 ? `${text.slice(0, 32)}...` : text;
}

function formatDate(value: string | null) {
  if (!value) return "不明确";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
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
