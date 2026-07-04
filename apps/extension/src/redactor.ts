const SECRET_PATTERNS = [
  /OPENAI_API_KEY\s*=\s*[^\s]+/gi,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s]+/gi,
  /SUPABASE_ANON_KEY\s*=\s*[^\s]+/gi,
  /JWT\s*=\s*[^\s]+/gi,
  /password\s*[:=]\s*[^\s]+/gi,
  /secret\s*[:=]\s*[^\s]+/gi,
  /token\s*[:=]\s*[^\s]+/gi,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /sk-[A-Za-z0-9_-]{12,}/g
];

export function redactContent(content: string) {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, "[REDACTED_SECRET]"), content);
}
