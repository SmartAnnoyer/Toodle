-- Toodle MVP schema
-- Run in the Supabase SQL editor, or with the Supabase CLI: supabase db push

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null,
  avatar_emoji text not null default '✨',
  mood_emoji text not null default '🫠',
  mood_text text not null default 'surviving',
  show_online boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint display_name_len check (char_length(display_name) between 1 and 32),
  constraint mood_text_len check (char_length(mood_text) between 1 and 48),
  constraint avatar_len check (char_length(avatar_emoji) between 1 and 8),
  constraint mood_emoji_len check (char_length(mood_emoji) between 1 and 8)
);

create unique index profiles_username_unique on public.profiles (username);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_request check (from_user_id <> to_user_id),
  constraint friend_requests_pair unique (from_user_id, to_user_id)
);

create index friend_requests_to_idx on public.friend_requests (to_user_id, status);
create index friend_requests_from_idx on public.friend_requests (from_user_id, status);

create trigger friend_requests_updated_at
  before update on public.friend_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'expired', 'vanished')),
  expires_at timestamptz,
  messages_sent integer not null default 0 check (messages_sent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_expiry_idx
  on public.conversations (expires_at)
  where status = 'active' and expires_at is not null;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  left_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create or replace function public.is_conversation_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = cid
      and user_id = auth.uid()
  );
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null,
  reply_to_id uuid references public.messages (id) on delete set null,
  kind text not null default 'text' check (kind in ('text', 'gif', 'sticker', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint body_len check (char_length(body) between 1 and 2000)
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create index messages_expires_idx
  on public.messages (expires_at)
  where expires_at is not null;

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint reaction_emoji_len check (char_length(emoji) between 1 and 8),
  constraint message_reactions_unique unique (message_id, user_id, emoji)
);

create table public.conversation_rules (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  rule_type text not null,
  enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_rules_unique unique (conversation_id, rule_type)
);

create trigger conversation_rules_updated_at
  before update on public.conversation_rules
  for each row execute function public.set_updated_at();

create table public.conversation_renewals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  duration_seconds integer not null check (duration_seconds > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index conversation_renewals_lookup_idx
  on public.conversation_renewals (conversation_id, status);

create table public.streaks (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  longest_count integer not null default 0 check (longest_count >= 0),
  last_completed_on date,
  activity jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger streaks_updated_at
  before update on public.streaks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shortcuts
-- ---------------------------------------------------------------------------

create table public.shortcuts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  trigger text not null,
  type text not null check (type in ('TEXT', 'ACTION', 'SYSTEM')),
  content text not null default '',
  action_type text,
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'conversation')),
  conversation_id uuid references public.conversations (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shortcut_trigger_format check (trigger ~ '^/[a-z0-9_]{1,24}$'),
  constraint shortcut_name_len check (char_length(name) between 1 and 32),
  constraint shortcut_content_len check (char_length(content) <= 500)
);

create unique index shortcuts_owner_trigger_global
  on public.shortcuts (owner_id, trigger)
  where conversation_id is null;

create unique index shortcuts_owner_trigger_conversation
  on public.shortcuts (owner_id, trigger, conversation_id)
  where conversation_id is not null;

create index shortcuts_owner_idx on public.shortcuts (owner_id);
create index shortcuts_conversation_idx on public.shortcuts (conversation_id);

create trigger shortcuts_updated_at
  before update on public.shortcuts
  for each row execute function public.set_updated_at();

create table public.shortcut_shares (
  id uuid primary key default gen_random_uuid(),
  shortcut_id uuid not null references public.shortcuts (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  permission text not null default 'use',
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED')),
  created_at timestamptz not null default now(),
  constraint shortcut_shares_unique unique (shortcut_id, recipient_id),
  constraint shortcut_no_self_share check (owner_id <> recipient_id)
);

create index shortcut_shares_recipient_idx on public.shortcut_shares (recipient_id, status);

-- ---------------------------------------------------------------------------
-- Notifications + presence
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'offline' check (status in ('online', 'offline')),
  last_seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth trigger
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired text;
  final_name text;
begin
  desired := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if desired !~ '^[a-z0-9_]{3,20}$'
     or exists (select 1 from public.profiles where username = desired) then
    desired := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  final_name := left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'New Toodler'), 32);

  insert into public.profiles (
    id, username, display_name, avatar_emoji, mood_emoji, mood_text
  )
  values (
    new.id,
    desired,
    final_name,
    coalesce(nullif(new.raw_user_meta_data->>'avatar_emoji', ''), '✨'),
    coalesce(nullif(new.raw_user_meta_data->>'mood_emoji', ''), '🫠'),
    left(coalesce(nullif(new.raw_user_meta_data->>'mood_text', ''), 'surviving'), 48)
  );

  insert into public.presence (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Server-authoritative expiration
-- ---------------------------------------------------------------------------

create or replace function public.expire_conversation(cid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.conversations
    set status = 'expired',
        updated_at = now()
    where id = cid
      and status = 'active'
      and expires_at is not null
      and expires_at <= now();

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    return false;
  end if;

  delete from public.messages where conversation_id = cid;
  return true;
end;
$$;

create or replace function public.purge_expired_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_rows integer;
begin
  delete from public.messages
  where expires_at is not null
    and expires_at <= now();
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

create or replace function public.conversation_inbox(uid uuid)
returns table (
  conversation_id uuid,
  status text,
  expires_at timestamptz,
  messages_sent integer,
  updated_at timestamptz,
  last_message_id uuid,
  last_body text,
  last_kind text,
  last_sender uuid,
  last_created timestamptz,
  unread_count integer,
  last_read_at timestamptz,
  left_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.status,
    c.expires_at,
    c.messages_sent,
    c.updated_at,
    lm.id,
    lm.body,
    lm.kind,
    lm.sender_id,
    lm.created_at,
    (
      select count(*)::integer
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id is distinct from uid
        and m.kind <> 'system'
        and (mem.last_read_at is null or m.created_at > mem.last_read_at)
    ) as unread_count,
    mem.last_read_at,
    mem.left_at
  from public.conversations c
  join public.conversation_members mem
    on mem.conversation_id = c.id
   and mem.user_id = uid
  left join lateral (
    select id, body, kind, sender_id, created_at
    from public.messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) lm on true;
$$;

revoke all on function public.conversation_inbox(uuid) from public, anon, authenticated;
revoke all on function public.expire_conversation(uuid) from public, anon, authenticated;
revoke all on function public.purge_expired_messages() from public, anon, authenticated;
grant execute on function public.conversation_inbox(uuid) to service_role;
grant execute on function public.expire_conversation(uuid) to service_role;
grant execute on function public.purge_expired_messages() to service_role;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- The API uses the service role and checks permissions itself.
-- These policies protect the anon/authenticated keys if they are used directly.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.conversation_rules enable row level security;
alter table public.conversation_renewals enable row level security;
alter table public.streaks enable row level security;
alter table public.shortcuts enable row level security;
alter table public.shortcut_shares enable row level security;
alter table public.notifications enable row level security;
alter table public.presence enable row level security;

alter table public.profiles force row level security;
alter table public.friend_requests force row level security;
alter table public.conversations force row level security;
alter table public.conversation_members force row level security;
alter table public.messages force row level security;
alter table public.message_reactions force row level security;
alter table public.conversation_rules force row level security;
alter table public.conversation_renewals force row level security;
alter table public.streaks force row level security;
alter table public.shortcuts force row level security;
alter table public.shortcut_shares force row level security;
alter table public.notifications force row level security;
alter table public.presence force row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy requests_select on public.friend_requests
  for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy requests_insert on public.friend_requests
  for insert to authenticated
  with check (from_user_id = auth.uid() and status = 'pending');

create policy requests_update on public.friend_requests
  for update to authenticated
  using (to_user_id = auth.uid())
  with check (to_user_id = auth.uid());

create policy conversations_select on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id));

create policy members_select on public.conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy messages_select on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy reactions_select on public.message_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy rules_select on public.conversation_rules
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy renewals_select on public.conversation_renewals
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy streaks_select on public.streaks
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy shortcuts_select on public.shortcuts
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (
      visibility = 'conversation'
      and conversation_id is not null
      and public.is_conversation_member(conversation_id)
    )
    or exists (
      select 1 from public.shortcut_shares s
      where s.shortcut_id = shortcuts.id
        and s.recipient_id = auth.uid()
        and s.status = 'ACCEPTED'
    )
  );

create policy shortcuts_insert on public.shortcuts
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy shortcuts_update on public.shortcuts
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy shortcuts_delete on public.shortcuts
  for delete to authenticated
  using (owner_id = auth.uid());

create policy shares_select on public.shortcut_shares
  for select to authenticated
  using (owner_id = auth.uid() or recipient_id = auth.uid());

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy presence_select on public.presence
  for select to authenticated
  using (true);

create policy presence_update on public.presence
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- Realtime is optional. Socket.IO is the live path the app uses.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;
