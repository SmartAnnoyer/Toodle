-- Account deletion and the safety tools app stores require for chat.

alter table public.conversation_rules
  drop constraint if exists conversation_rules_created_by_fkey;

alter table public.conversation_rules
  add constraint conversation_rules_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.conversation_renewals
  drop constraint if exists conversation_renewals_requested_by_fkey;

alter table public.conversation_renewals
  add constraint conversation_renewals_requested_by_fkey
  foreign key (requested_by) references public.profiles (id) on delete cascade;

alter table public.conversations
  drop constraint if exists conversations_created_by_fkey;

alter table public.conversations
  add constraint conversations_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete cascade;

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_id)
);

create index if not exists reports_created_idx on public.reports (created_at desc);

alter table public.blocks enable row level security;
alter table public.reports enable row level security;

drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own on public.blocks
  for select using (blocker_id = auth.uid());

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());
