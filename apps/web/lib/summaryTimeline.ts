export type SummaryTimelineEntry = {
  date: string;
  projectName: string;
  text: string;
};

const DETAIL_PREFIXES = ["功能变化：", "问题处理：", "当前状态："];

export function extractSummaryTimelineEntries(markdown: string, date: string): SummaryTimelineEntry[] {
  const entries: SummaryTimelineEntry[] = [];
  let currentProject = "";
  let preferredText = "";
  let fallbackText = "";

  const flush = () => {
    if (currentProject && (preferredText || fallbackText)) {
      entries.push({ date, projectName: currentProject, text: preferredText || fallbackText });
    }
    preferredText = "";
    fallbackText = "";
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim();
    if (!line) continue;

    if (line.startsWith("项目：")) {
      flush();
      currentProject = line.slice("项目：".length).trim();
      continue;
    }

    if (!currentProject) continue;
    const prefix = DETAIL_PREFIXES.find((item) => line.startsWith(item));
    if (!prefix) continue;
    const text = line.slice(prefix.length).trim();
    if (!text || /没有足够信息|暂无|待补充/.test(text)) continue;
    if (prefix === "功能变化：" && !preferredText) preferredText = text;
    if (!fallbackText) fallbackText = text;
  }

  flush();
  return entries;
}
