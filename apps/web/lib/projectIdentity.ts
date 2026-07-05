export const UNNAMED_PROJECT_KEY = "__NULL__";
export const UNNAMED_PROJECT_NAME = "未命名项目";

export function projectIdentityKey(projectName: string | null | undefined) {
  const normalized = normalizeProjectName(projectName);
  if (!normalized) return UNNAMED_PROJECT_KEY;
  return PROJECT_ALIASES[normalized] ?? normalized;
}

export function projectDisplayName(projectName: string | null | undefined) {
  const displayName = cleanProjectName(projectName);
  const key = projectIdentityKey(projectName);
  return PROJECT_DISPLAY_NAMES[key] ?? (displayName || UNNAMED_PROJECT_NAME);
}

const PROJECT_ALIASES: Record<string, string> = {
  autogen: "videogen"
};

const PROJECT_DISPLAY_NAMES: Record<string, string> = {
  videogen: "VideoGen"
};

function normalizeProjectName(projectName: string | null | undefined) {
  return cleanProjectName(projectName)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/memories$/, "mem")
    .replace(/memory$/, "mem");
}

function cleanProjectName(projectName: string | null | undefined) {
  if (!projectName) return "";

  const lastSegment = projectName
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop();

  return (lastSegment ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}
