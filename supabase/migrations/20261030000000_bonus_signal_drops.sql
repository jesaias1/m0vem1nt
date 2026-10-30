-- BONUS SIGNAL DROPS (Shift+M in the game).
--
-- Signal drops are server-authored: a browser can never mint one. This function is
-- the ONLY way the game's Shift+M key gives drops, and it enforces "one time use"
-- itself: a registered account can claim the 20-drop bonus exactly once, from any
-- device. The drops are ordinary unopened drops, opened in the Armory as usual.

create or replace function public.claim_bonus_signal_drops_v1()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  granted integer := 0;
  n integer;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.accounts a where a.user_id = me) then
    raise exception 'registered account required';
  end if;

  -- One lock per account, so two devices pressing the key together cannot both win.
  perform pg_advisory_xact_lock(hashtextextended(me::text, 4242));

  if exists (select 1 from public.signal_drops d where d.user_id = me and d.track_key like 'bonus:shift_m:%') then
    return 0;  -- already claimed
  end if;

  perform set_config('playhead.authorized_drop_write', '1', true);
  for n in 1..20 loop
    insert into public.signal_drops (user_id, track_id, track_key, rarity, status)
    values (me, 'track_1_signal_drift', 'bonus:shift_m:' || n, 'STANDARD', 'unopened');
    granted := granted + 1;
  end loop;
  perform set_config('playhead.authorized_drop_write', '0', true);
  return granted;
end;
$$;

revoke execute on function public.claim_bonus_signal_drops_v1() from public, anon;
grant execute on function public.claim_bonus_signal_drops_v1() to authenticated;
