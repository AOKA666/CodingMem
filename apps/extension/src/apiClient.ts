import { UploadMessage } from "./types";
import { normalizeApiBaseUrl } from "./utils";

export async function syncMessages(params: {
  apiBaseUrl: string;
  token: string;
  device: { device_id: string; device_name: string; os: string };
  workspace: { project_name: string | null; project_path_hash: string | null };
  messages: UploadMessage[];
}) {
  const batches = chunk(params.messages, 100);
  let received = 0;
  let inserted = 0;
  let duplicates = 0;
  let failed = 0;

  for (const messages of batches.length > 0 ? batches : [[]]) {
    const result = await syncMessageBatch({ ...params, messages });
    received += result.received;
    inserted += result.inserted;
    duplicates += result.duplicates;
    failed += result.failed ?? 0;
  }

  return { ok: true, received, inserted, duplicates, failed };
}

async function syncMessageBatch(params: {
  apiBaseUrl: string;
  token: string;
  device: { device_id: string; device_name: string; os: string };
  workspace: { project_name: string | null; project_path_hash: string | null };
  messages: UploadMessage[];
}) {
  const response = await fetch(`${normalizeApiBaseUrl(params.apiBaseUrl)}/api/sync`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.token}`
    },
    body: JSON.stringify({
      device: params.device,
      workspace: params.workspace,
      messages: params.messages
    })
  });

  const body = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(body?.error || `同步失败，HTTP 状态码：${response.status}`);
  }

  return body as { ok: boolean; received: number; inserted: number; duplicates: number; failed?: number };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function generateTodaySummary(apiBaseUrl: string, token: string) {
  const date = new Date().toISOString().slice(0, 10);
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/api/summaries/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ date })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `生成日报失败，HTTP 状态码：${response.status}`);
  }

  return body.summary as string;
}

export async function getTodaySummary(apiBaseUrl: string, token: string) {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/api/summaries/today`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `获取日报失败，HTTP 状态码：${response.status}`);
  }

  return body.summary as string;
}
