import * as fs from "fs/promises";
import * as os from "os";
import * as vscode from "vscode";
import { syncMessages } from "./apiClient";
import { parseSessionFile } from "./parser";
import { redactContent } from "./redactor";
import { scanSessionFiles } from "./scanner";
import { SyncResult, SyncState, UploadMessage } from "./types";
import { defaultSessionsPath, getDeviceId, getProjectName, getWorkspaceRoot, sha256 } from "./utils";

type Logger = (message: string) => void;

export async function runSync(context: vscode.ExtensionContext, log: Logger): Promise<SyncResult> {
  const config = vscode.workspace.getConfiguration("codexChatSync");
  const sessionsPath = config.get<string>("sessionsPath") || defaultSessionsPath();
  const apiBaseUrl = config.get<string>("apiBaseUrl") || "";
  const scanDays = config.get<number>("scanDays") || 7;
  const token = await context.secrets.get("codexChatSync.token");

  if (!apiBaseUrl) {
    throw new Error("还没有配置 API 地址，请先配置。");
  }
  if (!token) {
    throw new Error("还没有配置同步 Token，请先运行配置命令。");
  }

  const exists = await pathExists(sessionsPath);
  if (!exists) {
    throw new Error("找不到 Codex sessions 路径，请先配置。");
  }

  const state = context.globalState.get<SyncState>("syncState", {});
  const knownHashes = new Set(state.uploadedMessageHashes ?? []);
  const workspaceRoot = getWorkspaceRoot();
  const workspaceProjectName = getProjectName(workspaceRoot);
  const files = await scanSessionFiles(sessionsPath, scanDays);
  const uploadMessages: UploadMessage[] = [];
  let parsedMessages = 0;
  let failedMessages = 0;

  log(`正在扫描最近 ${scanDays} 天的 ${files.length} 个 session 文件。`);

  for (const file of files) {
    try {
      const parsed = await parseSessionFile(file, workspaceRoot, log);
      parsedMessages += parsed.length;

      for (const message of parsed) {
        const occurredAt = message.occurred_at ?? new Date().toISOString();
        const content = redactContent(message.content);
        const messageHash = sha256(
          [message.source, message.session_id ?? "", message.role, content, occurredAt].join("\n")
        );

        uploadMessages.push({
          source: "codex",
          session_id: message.session_id,
          message_hash: messageHash,
          role: message.role,
          content,
          occurred_at: occurredAt,
          project_name: message.project_name ?? workspaceProjectName,
          project_path_hash: message.project_path ? sha256(message.project_path) : workspaceRoot ? sha256(workspaceRoot) : null,
          file_path_hash: sha256(message.file_path),
          raw: {
            redacted: true,
            project_name: message.project_name,
            content_length: content.length
          }
        });
      }
    } catch (error) {
      failedMessages += 1;
      log(`解析文件失败 ${file}: ${String(error)}`);
    }
  }

  const deviceId = getDeviceId(context);
  const response = await syncMessages({
    apiBaseUrl,
    token,
    device: {
      device_id: deviceId,
      device_name: os.hostname(),
      os: process.platform
    },
    workspace: {
      project_name: workspaceProjectName,
      project_path_hash: workspaceRoot ? sha256(workspaceRoot) : null
    },
    messages: uploadMessages
  });

  uploadMessages.forEach((message) => knownHashes.add(message.message_hash));
  const trimmedHashes = Array.from(knownHashes).slice(-5000);
  const now = new Date().toISOString();
  const lastResult = `上传 ${response.inserted} 条新消息，跳过 ${response.duplicates} 条重复消息。`;

  await context.globalState.update("syncState", {
    lastSyncAt: now,
    lastSuccessSyncAt: now,
    uploadedMessageHashes: trimmedHashes,
    lastResult
  } satisfies SyncState);

  log(
    `同步完成。扫描文件：${files.length}，解析消息：${parsedMessages}，上传：${response.inserted}，重复：${response.duplicates}，失败：${failedMessages}。`
  );

  return {
    scannedFiles: files.length,
    parsedMessages,
    uploadedMessages: response.inserted,
    skippedDuplicates: response.duplicates,
    failedMessages
  };
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
