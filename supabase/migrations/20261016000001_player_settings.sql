-- ACCOUNT SETTINGS: a signed-in player's game settings (FOV, graphics, sensitivity...)
-- follow them to any browser or device. One row per account; a player can only read
-- and write their own row. The game validates every value before applying it.
create table if not exists public.player_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.player_settings enable row level security;

drop policy if exists player_settings_select_own on public.player_settings;
create policy player_settings_select_own on public.player_settings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists player_settings_insert_own on public.player_settings;
create policy player_settings_insert_own on public.player_settings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists player_settings_update_own on public.player_settings;
create policy player_settings_update_own on public.player_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.player_settings from anon;
grant select, insert, update on public.player_settings to authenticated;
