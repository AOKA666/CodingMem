import { projectDisplayName, projectIdentityKey } from "./projectIdentity";
import { fetchRawMessagesInRange } from "./rawMessages";
import { getSupabaseAdmin } from "./supabase";

type RawMessage = {
  role: string | null;
  content: string;
  occurred_at: string;
  project_name: string | null;
  device_id: string;
  session_id: string | null;
};

const SYSTEM_PROMPT = `你是一个产品记忆整理助手。

请把这段时间内的 Codex 聊天记录整理成一份便于回看的项目记忆。只从“功能、体验、问题、结果”的角度总结，不写项目架构、代码文件、函数名、接口名、数据库表名、命令、路径或实现细节。

不要使用 Markdown 语法，不要输出列表符号、表格、代码块或目录树。使用自然中文和短句。不要复制原话，不要引用 Codex 的回复，只总结最终讨论和处理了什么。

输出结构固定为：

项目记忆总览
用 2 到 4 个短句概括整体做了哪些功能或体验上的调整。

项目：项目名
功能变化：用 1 到 3 个短句说明用户能感知到的功能变化。
问题处理：用 1 到 3 个短句说明解决了什么问题。
当前状态：用 1 到 2 个短句说明现在推进到哪里。
后续注意：用 1 到 2 个短句说明后续需要记住什么。

要求：
1. 必须使用中文。
2. 不要输出 <think>、</think> 或任何思考过程。
3. 不要写代码实现、项目架构、文件路径、命令、库名、表名、字段名。
4. 不要写“Codex 主要回复了什么”。
5. 不要逐条复述聊天记录。
6. 信息不足时写“记录中没有足够信息判断”。
7. 每个字段尽量不超过 60 字。`;

export async function generateSummaryForDate(date: string) {
  const supabase = getSupabaseAdmin();
  const { start, end } = getMemoryRange(date);
  const messages = await fetchRawMessagesInRange<RawMessage>(
    supabase,
    "role, content, occurred_at, project_name, device_id, session_id",
    start,
    end
  );
  if (messages.length === 0) {
    throw new Error("还没有同步到聊天记录");
  }

  const summary = stripThinkTags(await callLlm(messages));
  const projectMap = new Map<string, string>();
  messages.forEach((message) => {
    projectMap.set(projectIdentityKey(message.project_name), projectDisplayName(message.project_name));
  });
  const projects = Array.from(projectMap.values());

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
      const project = projectDisplayName(message.project_name);
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
  const projectMap = new Map<string, string>();
  messages.forEach((message) => {
    projectMap.set(projectIdentityKey(message.project_name), projectDisplayName(message.project_name));
  });
  const projects = Array.from(projectMap.values());
  return `项目记忆总览
已同步 ${messages.length} 条聊天记录。当前未配置模型密钥，因此只能生成基础占位内容。

${projects
  .map(
    (project) => `项目：${project}
功能变化：记录中没有足够信息判断。
问题处理：记录中没有足够信息判断。
当前状态：记录中没有足够信息判断。
后续注意：配置模型密钥后重新生成总结。`
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
