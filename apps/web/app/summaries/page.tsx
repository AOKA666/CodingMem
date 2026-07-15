import Link from "next/link";
import { normalizeDashboardRange, rangeToIsoTimestamps } from "@/lib/dashboardRange";
import { todayIsoDate } from "@/lib/date";
import { projectDisplayName, projectIdentityKey } from "@/lib/projectIdentity";
import { fetchRawMessagesInRange } from "@/lib/rawMessages";
import { sanitizeSummary } from "@/lib/summarize";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractSummaryTimelineEntries, type SummaryTimelineEntry } from "@/lib/summaryTimeline";
import { summarizeTimelineRows } from "@/lib/timelineSummary";
import { updateProjectName } from "./actions";
import { CopyMarkdownButton, GenerateSummaryForm } from "./SummaryActions";
import { DateRangeFilter } from "./DateRangeFilter";

export const dynamic = "force-dynamic";

type SearchParams = {
  start?: string;
  end?: string;
};

type SummaryRow = {
  date: string;
  summary_markdown: string;
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
  devices: number;
  firstActiveAt: string | null;
  lastActiveAt: string | null;
  timeline: TimelineDay[];
};

type HeatmapDay = {
  date: string;
  count: number;
  level: number;
};

export default async function SummariesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseAdmin();
  const today = todayIsoDate();
  const { startDate, endDate } = normalizeDashboardRange(searchParams, today);

  const [{ data: selected }, dashboard] = await Promise.all([
    supabase
      .from("codingMem_daily_summaries")
      .select("date, summary_markdown, updated_at")
      .eq("user_id", "default")
      .eq("date", today)
      .maybeSingle(),
    getDashboardData(startDate, endDate)
  ]);

  const summary = sanitizeSummary(selected?.summary_markdown || "");
  const overview = getOverviewPoints(summary);

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
          <span className="active">
            <span className="nav-icon">D</span>
            仪表盘
          </span>
          <span>
            <span className="nav-icon">P</span>
            项目
          </span>
          <span>
            <span className="nav-icon">T</span>
            时间线
          </span>
          <span>
            <span className="nav-icon">S</span>
            总结
          </span>
        </nav>

      </aside>

      <section className="memory-main">
        <header className="topbar dashboard-topbar">
          <div>
            <p className="eyebrow">项目总览</p>
            <h1>管理和回顾所有项目的 AI 编程活动</h1>
          </div>
          <div className="topbar-actions">
            <DateRangeFilter startDate={startDate} endDate={endDate} today={today} />
            <GenerateSummaryForm date={today} />
            <CopyMarkdownButton summary={summary} />
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard icon="P" label="项目总数" value={dashboard.projects.length} hint="已识别的项目分区" tone="blue" />
          <MetricCard icon="S" label="同步会话" value={dashboard.messages} hint="沉淀的对话记录" tone="green" />
          <MetricCard icon="D" label="活跃设备" value={dashboard.devices} hint="参与同步的设备数" tone="purple" />
          <MetricCard icon="A" label="覆盖天数" value={dashboard.activeDays} hint="有项目活动的日期数" tone="amber" />
        </div>

        <div className="content-grid dashboard-grid">
          <section className="project-column">
            {dashboard.projects.length === 0 ? (
              <div className="project-card empty-state">
                <h2>还没有同步记录</h2>
                <p>先在 VS Code 执行“Codex 聊天同步：立即同步”，再回到这里查看项目记忆。</p>
              </div>
            ) : null}

            {dashboard.projects.map((project, index) => {
              const formId = `project-name-${project.key}`;
              return (
                <article className="project-card project-overview-card" key={project.key}>
                  <div className="project-card-head">
                    <div className={`project-icon tone-${index % 4}`}>{getProjectInitial(project.name)}</div>
                    <div className="project-title-block">
                      <form action={updateProjectName} className="project-name-form" id={formId}>
                        <input name="date" type="hidden" value={endDate} />
                        <input name="oldName" type="hidden" value={project.rawName ?? "__NULL__"} />
                        <input name="newName" defaultValue={project.name} aria-label="项目名" />
                      </form>
                      <p>{project.messages} 条记录 · {project.devices} 台设备 · 最近 {formatDate(project.lastActiveAt)}</p>
                    </div>
                    <div className="project-actions">
                      <button className="text-button save-button" form={formId} type="submit">保存</button>
                      <Link className="detail-link compact-link" href={`/summaries/project?date=${endDate}&project=${encodeURIComponent(project.key)}`}>
                        详情 →
                      </Link>
                    </div>
                  </div>

                  <div className="project-two-column">
                    <section className="project-brief">
                      <div className="section-head-row">
                        <span className="block-label">
                          <span className="mini-icon">OK</span>
                          近期总结
                        </span>
                      </div>
                      <ul className="project-summary-list">
                        {getRecentSummaries(project).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>

                    <section className="project-timeline-column">
                      <div className="section-head-row">
                        <span className="block-label">
                          <span className="mini-icon">TL</span>
                          最近时间线
                        </span>
                      </div>
                      <div className="project-timeline">
                        {project.timeline.slice(-3).map((item) => (
                          <div className="timeline-item" key={item.date}>
                            <span className="timeline-dot" />
                            <time>{item.date.slice(5)}</time>
                            <p>{item.text}</p>
                          </div>
                        ))}
                        {project.timeline.length === 0 ? <p className="empty-note">暂无可展示的有效时间线。</p> : null}
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="summary-panel dashboard-aside">
            <section className="aside-card today-summary-card">
              <div className="aside-card-head">
                <div>
                  <p className="eyebrow">今日总结</p>
                  <h2>{formatFullDate(today)}</h2>
                </div>
                <span className="calendar-badge">D</span>
              </div>
              <div className="today-summary-points">
                {(overview.length > 0 ? overview : ["还没有生成项目记忆。同步后点击生成即可查看今日总结。"]).slice(0, 4).map((point) => (
                  <p key={point}>{point}</p>
                ))}
              </div>
            </section>

            <section className="aside-card heatmap-card">
              <div className="aside-card-head compact">
                <h3>活跃热力图</h3>
                <span>{formatRangeLabel(startDate, endDate)}</span>
              </div>
              <div className="heatmap-grid" aria-label={`${startDate} 至 ${endDate} 活跃热力图`}>
                {dashboard.heatmap.map((day) => (
                  <span className={`heat-cell level-${day.level}`} title={`${day.date}: ${day.count} 条记录`} key={day.date} />
                ))}
              </div>
              <div className="heatmap-legend">
                <span>少</span>
                <i className="level-1" />
                <i className="level-2" />
                <i className="level-3" />
                <i className="level-4" />
                <span>多</span>
              </div>
            </section>

            <section className="aside-card active-projects-card">
              <div className="aside-card-head compact">
                <h3>{endDate === today ? "今日活跃项目" : "范围结束日活跃项目"}</h3>
                <span>{dashboard.activeProjects.length} 个项目</span>
              </div>
              <div className="active-project-list">
                {dashboard.activeProjects.map((project, index) => (
                  <div className="active-project-row" key={project.key}>
                    <span className={`active-dot tone-dot-${index % 4}`} />
                    <strong>{project.name}</strong>
                    <div className="active-bar">
                      <i style={{ width: `${project.percent}%` }} />
                    </div>
                    <em>{project.messages}</em>
                  </div>
                ))}
                {dashboard.activeProjects.length === 0 ? <p className="empty-note">范围结束日暂无活跃项目。</p> : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, hint, tone }: { icon: string; label: string; value: number; hint: string; tone: "blue" | "green" | "purple" | "amber" }) {
  return (
    <section className={`metric-card metric-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </section>
  );
}

function getRecentSummaries(project: ProjectCard) {
  const unique = Array.from(new Set(project.timeline.slice(-8).map((item) => item.text).filter(Boolean))).slice(-3);
  return unique.length > 0 ? unique : ["暂无有效总结。"];
}

function getOverviewPoints(summary: string) {
  const overview = splitSummary(summary).find((section) => section.title === "项目记忆总览" || section.title === "整体概览");
  return (overview?.lines ?? [])
    .flatMap(splitSummaryPoints)
    .filter((item) => !isImplementationDetail(item))
    .slice(0, 4);
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

function splitSummaryPoints(value: string) {
  return value
    .split(/[。；;！？!?]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !isImplementationDetail(item))
    .slice(0, 4);
}

function isImplementationDetail(value: string) {
  return /app\/|src\/|lib\/|api\/|route\.ts|\.tsx|\.ts|function|const|type|interface|schema|SQL|jsonb|Supabase|Next|React|组件|接口|字段|表名|数据表|命令|PowerShell|node_modules/i.test(value);
}

async function getDashboardData(startDate: string, endDate: string) {
  const supabase = getSupabaseAdmin();
  const { start, end } = rangeToIsoTimestamps(startDate, endDate);
  const [rows, { data: summaryRows }] = await Promise.all([
    fetchRawMessagesInRange<RawMessageRow>(
      supabase,
      "role, content, occurred_at, project_name, device_id",
      start,
      end
    ),
    supabase
      .from("codingMem_daily_summaries")
      .select("date, summary_markdown")
      .eq("user_id", "default")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
  ]);
  const summaryEntries = ((summaryRows ?? []) as SummaryRow[]).flatMap((row) =>
    extractSummaryTimelineEntries(sanitizeSummary(row.summary_markdown || ""), row.date)
  );
  const projectMap = new Map<string, ProjectCard & { deviceSet: Set<string>; dayMap: Map<string, RawMessageRow[]> }>();

  rows.forEach((row) => {
    const rawName = row.project_name ?? null;
    const key = projectIdentityKey(rawName);
    const existing =
      projectMap.get(key) ??
      ({
        key,
        rawName,
        name: projectDisplayName(rawName),
        messages: 0,
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

    const day = row.occurred_at.slice(0, 10);
    const dayRows = existing.dayMap.get(day) ?? [];
    dayRows.push(row);
    existing.dayMap.set(day, dayRows);
    projectMap.set(key, existing);
  });

  const projects = Array.from(projectMap.values()).map(({ deviceSet, dayMap, ...project }) => {
    const timeline = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayRows]) => {
        const text = summarizeRows(dayRows, project.name);
        return text ? { date: day, messages: dayRows.length, text } : null;
      })
      .filter((item): item is TimelineDay => item !== null);

    return {
      ...project,
      devices: deviceSet.size,
      timeline: dedupeTimeline(timeline)
    };
  });

  const mergedProjects = new Map(projects.map((project) => [project.key, project]));
  summaryEntries.forEach((entry) => {
    const key = projectIdentityKey(entry.projectName);
    const existing = mergedProjects.get(key);
    const activityAt = `${entry.date}T23:59:59.999Z`;

    if (existing) {
      existing.timeline = dedupeTimeline(
        [...existing.timeline.filter((item) => item.date !== entry.date), { date: entry.date, messages: 0, text: entry.text }].sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );
      if (!existing.lastActiveAt || existing.lastActiveAt < activityAt) existing.lastActiveAt = activityAt;
      return;
    }

    mergedProjects.set(key, {
      key,
      rawName: entry.projectName,
      name: projectDisplayName(entry.projectName),
      messages: 0,
      devices: 0,
      firstActiveAt: activityAt,
      lastActiveAt: activityAt,
      timeline: [{ date: entry.date, messages: 0, text: entry.text }]
    });
  });

  const endDateRows = rows.filter((row) => row.occurred_at.slice(0, 10) === endDate);
  const endDateEntries = summaryEntries.filter((entry) => entry.date === endDate);
  const activeProjects = getActiveProjects(endDateRows, endDateEntries);
  const activeDateSet = new Set(rows.map((row) => row.occurred_at.slice(0, 10)));
  summaryEntries.forEach((entry) => activeDateSet.add(entry.date));

  return {
    messages: rows.length,
    devices: new Set(rows.map((row) => row.device_id)).size,
    activeDays: activeDateSet.size,
    heatmap: buildHeatmap(rows, summaryEntries, startDate, endDate),
    activeProjects,
    projects: Array.from(mergedProjects.values()).sort((a, b) =>
      (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "") || b.messages - a.messages
    )
  };
}

function getActiveProjects(todayRows: RawMessageRow[], summaryEntries: SummaryTimelineEntry[]) {
  const projectCounts = new Map<string, { key: string; name: string; messages: number }>();

  todayRows.forEach((row) => {
    const key = projectIdentityKey(row.project_name);
    const existing = projectCounts.get(key) ?? {
      key,
      name: projectDisplayName(row.project_name),
      messages: 0
    };
    existing.messages += 1;
    projectCounts.set(key, existing);
  });

  summaryEntries.forEach((entry) => {
    const key = projectIdentityKey(entry.projectName);
    const existing = projectCounts.get(key) ?? {
      key,
      name: projectDisplayName(entry.projectName),
      messages: 0
    };
    existing.messages += 1;
    projectCounts.set(key, existing);
  });

  const total = Math.max(todayRows.length + summaryEntries.length, 1);
  return Array.from(projectCounts.values())
    .map((project) => ({
      ...project,
      percent: Math.max(3, Math.min(100, Math.round((project.messages / total) * 100)))
    }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 5);
}

function buildHeatmap(rows: RawMessageRow[], summaryEntries: SummaryTimelineEntry[], startDate: string, endDate: string): HeatmapDay[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const day = row.occurred_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  summaryEntries.forEach((entry) => counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1));
  const max = Math.max(...Array.from(counts.values()), 1);
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return Array.from({ length: dayCount }).map((_, index) => {
    const itemDate = new Date(start);
    itemDate.setUTCDate(start.getUTCDate() + index);
    const key = itemDate.toISOString().slice(0, 10);
    const count = counts.get(key) ?? 0;
    return {
      date: key,
      count,
      level: count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4))
    };
  });
}

function summarizeRows(rows: RawMessageRow[], projectName: string) {
  return summarizeTimelineRows(rows, projectName);
}

function dedupeTimeline(timeline: TimelineDay[]) {
  const seen = new Set<string>();
  return [...timeline]
    .reverse()
    .filter((item) => {
      if (seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    })
    .reverse();
}

function getProjectInitial(name: string) {
  const letters = name.match(/[A-Za-z0-9]/g)?.join("").slice(0, 2);
  return letters ? letters.toUpperCase() : name.slice(0, 2);
}

function formatDate(value: string | null) {
  if (!value) return "不明确";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatRangeLabel(startDate: string, endDate: string) {
  return `${startDate.slice(5)} 至 ${endDate.slice(5)}`;
}
