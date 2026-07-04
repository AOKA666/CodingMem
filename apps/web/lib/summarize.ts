import { getSupabaseAdmin } from "./supabase";

type RawMessage = {
  role: string | null;
  content: string;
  occurred_at: string;
  project_name: string | null;
  device_id: string;
  session_id: string | null;
};

const SYSTEM_PROMPT = `你是一个 AI 编程记忆整理助手。

请把这段时间内的 Codex 聊天记录整理成一份“可直接阅读的项目记忆总结”。

不要使用 Markdown 语法，不要输出标题井号、星号列表、表格、代码块或项目结构树。
请使用自然中文、短段落和清晰的小标题。内容要有总结感，不要原文搬运。

输出结构请使用这种纯文本风格：

项目记忆总览
用 3 到 5 句话概括整体做了什么、主要推进到哪里、有哪些明显变化。

项目：项目名
聊了什么：概括用户和 Codex 主要讨论的问题，不要复制原话。
Codex 主要回复了什么：概括 Codex 提供的方案、判断、解释或实现建议。
进度到哪里：说明这个项目从开始到现在推进到了什么阶段。
继续时记住：列出 1 到 3 个后续继续开发时最需要记住的点。

要求：
1. 必须使用中文。
2. 不要输出 <think>、</think> 或任何思考过程标签。
3. 不要逐条复述聊天记录。
4. 不要编造聊天记录中没有的信息。
5. 如果信息不足，写“聊天记录中没有足够信息判断”。
6. 不要写文件目录树，不要做很细的模块拆解。
7. 每个项目尽量控制在 120 到 220 字。`;

export async function generateSummaryForDate(date: string) {
  const supabase = getSupabaseAdmin();
  const { start, end } = getMemoryRange(date);

  const { data, error } = await supabase
    .from("codingMem_raw_messages")
    .select("role, content, occurred_at, project_name, device_id, session_id")
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const messages = (data ?? []) as RawMessage[];
  if (messages.length === 0) {
    throw new Error("还没有同步到聊天记录");
  }

  const summary = stripThinkTags(await callLlm(messages));
  const projects = Array.from(new Set(messages.map((m) => m.project_name || "未命名项目")));

  const { error: upsertError } = await supabase.from("codingMem_daily_summaries").upsert(
    {
      user_id: "default",
      date,
      summary_markdown: summary,
      projects_json: projects,
      todos_json: [],
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,date" }
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return summary;
}

export function stripThinkTags(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();
}

async function callLlm(messages: RawMessage[]) {
  const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackSummary(messages);
  }

  const baseUrl = process.env.MINIMAX_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.minimaxi.com/v1";
  const model = process.env.MINIMAX_MODEL || process.env.OPENAI_MODEL || "MiniMax-M3";
  const chatText = messages
    .map((message) => {
      const project = message.project_name || "未命名项目";
      return `[${message.occurred_at}] [${project}] [${message.role || "unknown"}] ${message.content}`;
    })
    .join("\n\n");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `聊天记录：\n${chatText}` }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`总结生成失败：${detail}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("MiniMax 返回了空总结");
  }

  return content;
}

function fallbackSummary(messages: RawMessage[]) {
  const projects = Array.from(new Set(messages.map((m) => m.project_name || "未命名项目")));
  return `项目记忆总览
已同步 ${messages.length} 条 Codex 聊天记录。当前未配置 MINIMAX_API_KEY，因此这里只能生成基础占位内容，无法判断具体进度。

${projects
  .map(
    (project) => `项目：${project}
聊了什么：聊天记录中没有足够信息判断。
Codex 主要回复了什么：聊天记录中没有足够信息判断。
进度到哪里：聊天记录中没有足够信息判断。
继续时记住：配置 MINIMAX_API_KEY 后重新生成总结。`
  )
  .join("\n\n")}`;
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
