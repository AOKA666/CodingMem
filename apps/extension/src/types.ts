export type ParsedMessage = {
  source: "codex";
  role: "user" | "assistant" | "system" | "tool" | "unknown";
  content: string;
  occurred_at: string | null;
  session_id: string | null;
  project_path: string | null;
  project_name: string | null;
  file_path: string;
  raw: unknown;
};

export type UploadMessage = {
  source: "codex";
  session_id: string | null;
  message_hash: string;
  role: ParsedMessage["role"];
  content: string;
  occurred_at: string;
  project_name: string | null;
  project_path_hash: string | null;
  file_path_hash: string;
  raw: unknown;
};

export type SyncResult = {
  scannedFiles: number;
  parsedMessages: number;
  uploadedMessages: number;
  skippedDuplicates: number;
  failedMessages: number;
};

export type SyncState = {
  lastSyncAt?: string;
  lastSuccessSyncAt?: string;
  uploadedMessageHashes?: string[];
  lastResult?: string;
};
