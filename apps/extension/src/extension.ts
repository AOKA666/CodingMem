import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { generateTodaySummary, getTodaySummary } from "./apiClient";
import { openDashboard } from "./dashboard";
import { runSync } from "./sync";
import { getWorkspaceRoot, normalizeApiBaseUrl } from "./utils";

let syncTimer: NodeJS.Timeout | undefined;
let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Codex 聊天同步");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("codexChatSync.syncNow", () => executeSync(context)),
    vscode.commands.registerCommand("codexChatSync.openDashboard", () => openDashboard(context)),
    vscode.commands.registerCommand("codexChatSync.generateTodaySummary", () => executeGenerateTodaySummary(context)),
    vscode.commands.registerCommand("codexChatSync.saveSummaryToWorkspace", () => saveSummaryToWorkspace(context)),
    vscode.commands.registerCommand("codexChatSync.configure", () => configure(context)),
    vscode.commands.registerCommand("codexChatSync.showLogs", () => output.show())
  );

  const config = vscode.workspace.getConfiguration("codexChatSync");
  if (config.get<boolean>("autoSyncEnabled") ?? true) {
    void executeSync(context, true);
    const intervalMinutes = config.get<number>("syncIntervalMinutes") || 30;
    syncTimer = setInterval(() => void executeSync(context, true), intervalMinutes * 60 * 1000);
  }

    log("Codex 聊天同步已启动。");
}

export function deactivate() {
  if (syncTimer) {
    clearInterval(syncTimer);
  }
}

async function executeSync(context: vscode.ExtensionContext, silent = false) {
  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Codex 聊天同步",
        cancellable: false
      },
      () => runSync(context, log)
    );

    const message = `扫描文件：${result.scannedFiles}
解析消息：${result.parsedMessages}
上传消息：${result.uploadedMessages}
跳过重复：${result.skippedDuplicates}
失败消息：${result.failedMessages}`;

    if (!silent) {
      void vscode.window.showInformationMessage(message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`同步失败：${message}`);
    if (!silent) {
      void vscode.window.showErrorMessage(message);
    }
  }
}

async function executeGenerateTodaySummary(context: vscode.ExtensionContext) {
  try {
    const { apiBaseUrl, token } = await getApiConfig(context);
    const summary = await generateTodaySummary(apiBaseUrl, token);
    log(`已生成今日日报，长度：${summary.length}`);
    void vscode.window.showInformationMessage("今日日报已生成。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`生成日报失败：${message}`);
    void vscode.window.showErrorMessage(message);
  }
}

async function saveSummaryToWorkspace(context: vscode.ExtensionContext) {
  try {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error("当前没有打开项目，请先打开一个项目文件夹。");
    }

    const { apiBaseUrl, token } = await getApiConfig(context);
    const summary = await getTodaySummary(apiBaseUrl, token);
    if (!summary) {
      throw new Error("今日日报为空，请先生成日报。");
    }

    const memoryDir = path.join(workspaceRoot, ".ai-memory");
    await fs.mkdir(memoryDir, { recursive: true });
    await fs.writeFile(path.join(memoryDir, "daily-summary.md"), summary, "utf8");
    log("已保存日报到项目 .ai-memory/daily-summary.md");
    void vscode.window.showInformationMessage("已保存日报到 .ai-memory/daily-summary.md");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`保存日报失败：${message}`);
    void vscode.window.showErrorMessage(message);
  }
}

async function configure(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("codexChatSync");
  const sessionsPath = await vscode.window.showInputBox({
    title: "Codex sessions 路径",
    value: config.get<string>("sessionsPath") || "",
    prompt: "留空则使用 ~/.codex/sessions"
  });
  if (sessionsPath !== undefined) {
    await config.update("sessionsPath", sessionsPath, vscode.ConfigurationTarget.Global);
  }

  const apiBaseUrl = await vscode.window.showInputBox({
    title: "API 地址",
    value: config.get<string>("apiBaseUrl") || "",
    prompt: "例如：http://localhost:3000"
  });
  if (apiBaseUrl !== undefined) {
    await config.update("apiBaseUrl", normalizeApiBaseUrl(apiBaseUrl), vscode.ConfigurationTarget.Global);
  }

  const token = await vscode.window.showInputBox({
    title: "同步 API Token",
    password: true,
    prompt: "会保存到 VS Code SecretStorage"
  });
  if (token) {
    await context.secrets.store("codexChatSync.token", token);
  }

  void vscode.window.showInformationMessage("Codex 聊天同步配置已保存。");
}

async function getApiConfig(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("codexChatSync");
  const apiBaseUrl = config.get<string>("apiBaseUrl") || "";
  const token = await context.secrets.get("codexChatSync.token");
  if (!apiBaseUrl) {
    throw new Error("还没有配置 API 地址，请先运行“Codex 聊天同步：配置”。");
  }
  if (!token) {
    throw new Error("还没有配置同步 Token，请先运行“Codex 聊天同步：配置”。");
  }
  return { apiBaseUrl, token };
}

function log(message: string) {
  output.appendLine(`[${new Date().toISOString()}] ${message}`);
}
