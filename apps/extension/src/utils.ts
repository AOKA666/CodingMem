import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function defaultSessionsPath() {
  return path.join(os.homedir(), ".codex", "sessions");
}

export function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export function getProjectName(projectPath: string | null) {
  return projectPath ? path.basename(projectPath) : null;
}

export function normalizeApiBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function getDeviceId(context: vscode.ExtensionContext) {
  const existing = context.globalState.get<string>("deviceId");
  if (existing) return existing;

  const id = sha256(`${os.hostname()}-${os.userInfo().username}-${Date.now()}`).slice(0, 32);
  void context.globalState.update("deviceId", id);
  return id;
}
