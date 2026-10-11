-- Run in the Supabase SQL editor for this project.
create table if not exists public.email_verification_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.email_verification_tokens enable row level security;
revoke all on table public.email_verification_tokens from anon, authenticated;
grant all on table public.email_verification_tokens to service_role;

create table if not exists public.auth_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0
);
alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from anon, authenticated;
grant all on table public.auth_rate_limits to service_role;

create or replace function public.claim_auth_rate_limit(
  p_keys text[],
  p_max_attempts integer default 5,
  p_window_seconds integer default 900
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_key text;
  current_attempts integer;
  allowed boolean := true;
begin
  foreach current_key in array p_keys loop
    insert into public.auth_rate_limits as current_limit (key_hash, window_started_at, attempts)
    values (current_key, now(), 1)
    on conflict (key_hash) do update set
      window_started_at = case
        when current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
        else current_limit.window_started_at
      end,
      attempts = case
        when current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
        else current_limit.attempts + 1
      end
    returning attempts into current_attempts;

    if current_attempts > p_max_attempts then allowed := false; end if;
  end loop;
  return allowed;
end;
$$;

revoke all on function public.claim_auth_rate_limit(text[], integer, integer) from public, anon, authenticated;
grant execute on function public.claim_auth_rate_limit(text[], integer, integer) to service_role;

-- Persistent campus incident and safety check-in data. Every exposed table has
-- RLS enabled; staff privileges come only from trusted app_metadata claims.
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  reference text generated always as ('INC-' || upper(substr(replace(id::text, '-', ''), 1, 10))) stored unique,
  reported_by uuid not null references auth.users(id) on delete restrict,
  incident_type text not null check (incident_type in ('medical','fire','security','hazard','infrastructure','wellbeing','other')),
  priority text not null default 'P3' check (priority in ('P1','P2','P3','P4')),
  building text not null check (building ~ '^[0-9]{1,3}$'),
  description text not null check (char_length(description) between 3 and 4000),
  status text not null default 'NEW' check (status in ('NEW','ACKNOWLEDGED','TEAM_DISPATCHED','ON_SCENE','RESOLVED','CLOSED')),
  responder text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters >= 0),
  location_captured_at timestamptz,
  location_source text check (location_source in ('gps','map-pin','mapped-building') or location_source is null),
  campus_verified boolean,
  reporter_name text check (reporter_name is null or char_length(reporter_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dispatched_at timestamptz,
  resolved_at timestamptz
);
create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_reported_by_created_idx on public.incidents (reported_by, created_at desc);
create index if not exists incidents_status_priority_idx on public.incidents (status, priority);
alter table public.incidents enable row level security;
revoke all on public.incidents from anon, authenticated;
grant select on public.incidents to authenticated;
grant insert (reported_by, incident_type, priority, building, description, latitude, longitude, accuracy_meters, location_captured_at, location_source, campus_verified, reporter_name) on public.incidents to authenticated;
grant update (status, responder, dispatched_at, resolved_at, updated_at) on public.incidents to authenticated;
drop policy if exists "incident read own or staff" on public.incidents;
create policy "incident read own or staff" on public.incidents for select to authenticated
using (reported_by = (select auth.uid()) or coalesce((select auth.jwt()->'app_metadata'->>'ceis_role'),'student') in ('staff','admin','security','medical'));
drop policy if exists "incident create as self" on public.incidents;
create policy "incident create as self" on public.incidents for insert to authenticated
with check (reported_by = (select auth.uid()) and status = 'NEW' and responder is null);
drop policy if exists "staff update incidents" on public.incidents;
create policy "staff update incidents" on public.incidents for update to authenticated
using (coalesce((select auth.jwt()->'app_metadata'->>'ceis_role'),'student') in ('staff','admin','security','medical'))
with check (coalesce((select auth.jwt()->'app_metadata'->>'ceis_role'),'student') in ('staff','admin','security','medical'));

create table if not exists public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('safe','help')),
  note text check (note is null or char_length(note) <= 500),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);
create index if not exists safety_checkins_user_created_idx on public.safety_checkins (user_id, created_at desc);
alter table public.safety_checkins enable row level security;
revoke all on public.safety_checkins from anon, authenticated;
grant select on public.safety_checkins to authenticated;
grant insert (user_id, status, note, latitude, longitude) on public.safety_checkins to authenticated;
drop policy if exists "checkins read own or staff" on public.safety_checkins;
create policy "checkins read own or staff" on public.safety_checkins for select to authenticated
using (user_id = (select auth.uid()) or coalesce((select auth.jwt()->'app_metadata'->>'ceis_role'),'student') in ('staff','admin','security','medical'));
drop policy if exists "checkin create as self" on public.safety_checkins;
create policy "checkin create as self" on public.safety_checkins for insert to authenticated
with check (user_id = (select auth.uid()));

-- This function is an event-trigger hook, not a public RPC. It is invoked by
-- PostgreSQL event triggers and does not need direct execution by API roles.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
