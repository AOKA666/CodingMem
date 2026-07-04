create extension if not exists pgcrypto;

create table if not exists "codingMem_devices" (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  device_id text not null unique,
  device_name text,
  os text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists "codingMem_raw_messages" (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  device_id text not null,
  source text not null default 'codex',
  project_name text,
  project_path_hash text,
  session_id text,
  message_hash text not null unique,
  role text,
  content text not null,
  raw_json jsonb,
  occurred_at timestamptz not null,
  uploaded_at timestamptz default now()
);

create index if not exists "idx_codingMem_raw_messages_occurred_at" on "codingMem_raw_messages"(occurred_at);
create index if not exists "idx_codingMem_raw_messages_project_name" on "codingMem_raw_messages"(project_name);
create index if not exists "idx_codingMem_raw_messages_device_id" on "codingMem_raw_messages"(device_id);
create index if not exists "idx_codingMem_raw_messages_session_id" on "codingMem_raw_messages"(session_id);

create table if not exists "codingMem_daily_summaries" (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  date date not null,
  summary_markdown text not null,
  projects_json jsonb,
  todos_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);
