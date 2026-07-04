import * as vscode from "vscode";
import { SyncState } from "./types";
import { defaultSessionsPath } from "./utils";

export function openDashboard(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "codexChatSyncDashboard",
    "Codex 聊天同步",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = renderDashboard(context);

  panel.webview.onDidReceiveMessage(async (message) => {
    const commandMap: Record<string, string> = {
      syncNow: "codexChatSync.syncNow",
      generateTodaySummary: "codexChatSync.generateTodaySummary",
      saveSummaryToWorkspace: "codexChatSync.saveSummaryToWorkspace",
      openLogs: "codexChatSync.showLogs"
    };
    const command = commandMap[message?.command];
    if (command) {
      await vscode.commands.executeCommand(command);
      panel.webview.html = renderDashboard(context);
    }
  });
}

function renderDashboard(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("codexChatSync");
  const state = context.globalState.get<SyncState>("syncState", {});
  const sessionsPath = config.get<string>("sessionsPath") || defaultSessionsPath();
  const autoSyncEnabled = config.get<boolean>("autoSyncEnabled") ?? true;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); }
    h1 { font-size: 22px; }
    .status { display: grid; gap: 8px; margin: 16px 0; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button { padding: 8px 10px; border-radius: 4px; border: 1px solid var(--vscode-button-border); color: var(--vscode-button-foreground); background: var(--vscode-button-background); cursor: pointer; }
    code { word-break: break-all; }
  </style>
</head>
<body>
  <h1>Codex Chat Sync</h1>
  <section class="status">
    <div><strong>自动同步：</strong>${autoSyncEnabled ? "已开启" : "已关闭"}</div>
    <div><strong>最近同步：</strong>${state.lastSuccessSyncAt || "从未同步"}</div>
    <div><strong>最近结果：</strong>${state.lastResult || "暂无同步记录"}</div>
    <div><strong>Sessions 路径：</strong><code>${escapeHtml(sessionsPath)}</code></div>
  </section>
  <section class="actions">
    <button data-command="syncNow">立即同步</button>
    <button data-command="generateTodaySummary">生成今日日报</button>
    <button data-command="saveSummaryToWorkspace">保存日报到项目</button>
    <button data-command="openLogs">查看日志</button>
  </section>
  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("click", () => vscode.postMessage({ command: button.dataset.command }));
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
