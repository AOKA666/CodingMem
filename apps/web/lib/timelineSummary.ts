type TimelineMessage = {
  role: string | null;
  content: string;
};

const METADATA_PATTERNS = [
  /environment_context/i,
  /knowledge cutoff/i,
  /current date/i,
  /powershell|cmd\.exe|node\.js/i,
  /<cwd>|<\/?environment_context>/i,
  /\bworkspace_roots\b|\bfilesystem\b|\btimezone\b|\bsandbox_mode\b/i,
  /^[A-Z]:\\/,
  /\\Users\\|\/Users\//i,
  /node_modules|package-lock|tsconfig|\.env/i,
  /^(import|export|const|let|function|type|interface)\b/
];

const LOW_VALUE_PATTERNS = [
  /构建通过|验证通过|本地服务|返回 200|停止.*端口/,
  /我先|我会|我来|接下来|现在我|顺手|继续|已经|马上/,
  /修正了记录查询只读取前一部分数据的问题/,
  /给生成项目记忆的操作补上加载状态和进度反馈/,
  /^排查分镜出图流程问题。?$/
];

const PROJECT_FEATURE_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /videogen|autogen|短视频|视频/i, label: "视频生成流程" },
  { pattern: /客服|客户|crm/i, label: "客服记录管理" },
  { pattern: /codingmem|coding memory|项目记忆|记忆/i, label: "项目记忆展示" },
  { pattern: /landing|落地页|lighthouse/i, label: "落地页分析体验" },
  { pattern: /opportunity|机会/i, label: "机会发现流程" },
  { pattern: /color|颜色/i, label: "颜色分析流程" }
];

const TEXT_FEATURE_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /分镜|脚本|镜头|出图|图片生成|去水印|volcen|火山/i, label: "分镜出图流程" },
  { pattern: /项目记忆|记忆总结|今日总结|总结|日报|右侧|热力图|活跃项目|时间线|日期筛选/i, label: "项目记忆展示" },
  { pattern: /多台|多设备|设备|电脑|同步.*一起|合并.*记录|当前设备/i, label: "多设备记录合并" },
  { pattern: /同步|unsupported unicode|unicode|escape|保存失败|立即同步/i, label: "同步保存稳定性" },
  { pattern: /项目列表|项目总览|项目卡|CodingMem|CodingMemory|AutoGen|VideoGen/i, label: "项目列表归类" },
  { pattern: /按钮|加载|进度|互动|反馈|图标|对齐|界面|UI|样式/i, label: "界面交互体验" },
  { pattern: /记录描述|文案|描述|截断|不通顺|直接引用|普通人|看懂/i, label: "记录描述质量" },
  { pattern: /客服|客户|CRM|权限|导出|Excel/i, label: "客服记录管理" },
  { pattern: /Landing Page|落地页|分析|Lighthouse|页面分析/i, label: "落地页分析体验" },
  { pattern: /短视频|视频|草稿|素材|文案/i, label: "视频生成流程" }
];

export function summarizeTimelineRows(rows: TimelineMessage[], projectName = "") {
  const summary = buildPlainSummary(rows, projectName);
  return isUsefulSummary(summary) ? summary : "";
}

export function summarizeTimelineTitle(rows: TimelineMessage[], projectName = "") {
  return summarizeTimelineRows(rows, projectName);
}

export function isUsefulTimelineSummary(summary: string) {
  return isUsefulSummary(summary);
}

function buildPlainSummary(rows: TimelineMessage[], projectName: string) {
  const userText = collectUserSentences(rows).join(" ");
  const feature = detectFeature(projectName, userText);
  if (!feature) return "";

  if (/报错|错误|失败|不能|没有|看不到|不显示|不对|不通顺|缺少|漏|异常|卡住|只有/.test(userText)) {
    return trimSummary(`排查${feature}问题。`);
  }
  if (/增加|加上|补上|支持|显示|生成|同步|统一|改成|修改|调整|优化|修复|整理|合并|美化|对齐/.test(userText)) {
    return trimSummary(`优化${feature}。`);
  }
  if (/确认|检查|查看|分析|参考|讨论|梳理/.test(userText)) {
    return trimSummary(`梳理${feature}。`);
  }

  return "";
}

function detectFeature(projectName: string, text: string) {
  const projectFeature = findFeature(projectName, PROJECT_FEATURE_RULES);
  const textFeature = findFeature(text, TEXT_FEATURE_RULES);

  if (textFeature && textFeature !== "分镜出图流程") return textFeature;
  return projectFeature || textFeature || "";
}

function findFeature(text: string, rules: Array<{ pattern: RegExp; label: string }>) {
  const normalized = text.replace(/\s+/g, " ");
  return rules.find((rule) => rule.pattern.test(normalized))?.label ?? "";
}

function collectUserSentences(rows: TimelineMessage[]) {
  return rows
    .filter((row) => row.role === "user")
    .flatMap((row) => splitIntoSentences(cleanMessage(row.content)))
    .map(removeProcessNoise)
    .map(toReadableText)
    .filter((sentence) => sentence.length >= 4 && !looksLikeMetaOrCode(sentence) && !isLowValueText(sentence));
}

function cleanMessage(content: string) {
  return stripThinkTags(content)
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !looksLikeMetaOrCode(line))
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}[\]()`"'<>]/g, " ")
    .replace(/\b(?:powershell|cmd|bash|node)\b/gi, " ")
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, " ")
    .replace(/[A-Z]:\\[^\s，。；、]+/gi, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string) {
  return text
    .split(/[。！？!?；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeMetaOrCode(text: string) {
  if (METADATA_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (/^[\w.-]+\s*[:=]\s*[\w./\\:-]+$/.test(text)) return true;
  if (/^[{}[\],":\s]+$/.test(text)) return true;
  if (text.length > 160 && /[{}[\];=<>]/.test(text)) return true;
  return false;
}

function removeProcessNoise(text: string) {
  return text
    .replace(/^我先[^，。；]*[，。；]\s*/, "")
    .replace(/^我会[^，。；]*[，。；]\s*/, "")
    .replace(/^我来[^，。；]*[，。；]\s*/, "")
    .replace(/^接下来[^，。；]*[，。；]\s*/, "")
    .replace(/^现在[^，。；]*[，。；]\s*/, "")
    .replace(/^顺手[^，。；]*[，。；]\s*/, "")
    .trim();
}

function toReadableText(text: string) {
  return text
    .replace(/[“”]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^好像/, "")
    .replace(/^现在/, "")
    .replace(/^请/, "")
    .replace(/^帮我/, "")
    .replace(/^给我/, "")
    .trim();
}

function trimSummary(text: string) {
  return text.length > 30 ? `${text.slice(0, 29)}。` : text;
}

function isUsefulSummary(summary: string) {
  return Boolean(summary) && !isLowValueText(summary);
}

function isLowValueText(text: string) {
  const normalized = text.trim();
  if (!normalized) return true;
  if (LOW_VALUE_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (/^(排查|调整|梳理|处理)(问题|这段时间|项目进展)。?$/.test(normalized)) return true;
  return false;
}

function stripThinkTags(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();
}
