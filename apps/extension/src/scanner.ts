import * as fs from "fs/promises";
import * as path from "path";

export async function scanSessionFiles(root: string, scanDays: number) {
  const cutoff = Date.now() - scanDays * 24 * 60 * 60 * 1000;
  const files: string[] = [];
  await walk(root, cutoff, files);
  return files;
}

async function walk(directory: string, cutoff: number, files: string[]) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, cutoff, files);
      continue;
    }

    if (!entry.isFile() || (!entry.name.endsWith(".jsonl") && !entry.name.endsWith(".json"))) {
      continue;
    }

    const stat = await fs.stat(fullPath);
    if (stat.mtime.getTime() >= cutoff) {
      files.push(fullPath);
    }
  }
}
