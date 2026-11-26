-- Run once in Supabase SQL Editor AFTER the previous 1-3 party migration.
-- Retain old ranking_hall / ranking_hall2 and migrate existing best entries.
-- Each victory has its own record_key, even for the same starter and user.
begin;

create table if not exists public.ranking_hall_records (
 user_id uuid not null references public.ranking_profiles(user_id) on delete cascade,
 record_key text not null check (char_length(record_key) between 1 and 256),
 starter text not null check (starter in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados')),
 level_sum numeric(8,3) not null check (level_sum between 3 and 300),
 party jsonb not null check (jsonb_typeof(party)='array' and jsonb_array_length(party) between 1 and 3),
 recorded_at timestamptz not null default now(),
 primary key (user_id,record_key)
);
create table if not exists public.ranking_hall2_records (
 user_id uuid not null references public.ranking_profiles(user_id) on delete cascade,
 record_key text not null check (char_length(record_key) between 1 and 256),
 starter text not null check (starter in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados')),
 level_sum numeric(8,3) not null check (level_sum between 3 and 300),
 party jsonb not null check (jsonb_typeof(party)='array' and jsonb_array_length(party) between 1 and 3),
 recorded_at timestamptz not null default now(),
 primary key (user_id,record_key)
);
create index if not exists ranking_hall_records_board_idx on public.ranking_hall_records(starter,level_sum,recorded_at,user_id);
create index if not exists ranking_hall2_records_board_idx on public.ranking_hall2_records(starter,level_sum,recorded_at,user_id);

-- Preserve prior leaderboard records, even if a player's old browser save was lost.
insert into public.ranking_hall_records(user_id,record_key,starter,level_sum,party,recorded_at)
select user_id,'legacy:'||starter,starter,level_sum,party,recorded_at
from public.ranking_hall
on conflict (user_id,record_key) do nothing;
insert into public.ranking_hall2_records(user_id,record_key,starter,level_sum,party,recorded_at)
select user_id,'legacy:'||starter,starter,level_sum,party,recorded_at
from public.ranking_hall2
on conflict (user_id,record_key) do nothing;

alter table public.ranking_hall_records enable row level security;
alter table public.ranking_hall2_records enable row level security;
drop policy if exists "Anyone can view all Hall records" on public.ranking_hall_records;
create policy "Anyone can view all Hall records" on public.ranking_hall_records
 for select to anon,authenticated using(true);
drop policy if exists "Anyone can view all Red Hall records" on public.ranking_hall2_records;
create policy "Anyone can view all Red Hall records" on public.ranking_hall2_records
 for select to anon,authenticated using(true);
revoke insert,update,delete on public.ranking_hall_records from anon,authenticated;
revoke insert,update,delete on public.ranking_hall2_records from anon,authenticated;
grant select on public.ranking_hall_records,public.ranking_hall2_records to anon,authenticated;

create or replace function public.upload_ranking_all_hall_records(p_hall jsonb,p_hall2 jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_uid uuid:=auth.uid();
 v_second boolean;
 v_records jsonb;
 v_item jsonb;
 v_key text;
 v_starter text;
 v_party jsonb;
 v_sum numeric;
 v_target text;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.ranking_profiles where user_id=v_uid) then raise exception 'Upload profile first';end if;
 if p_hall is null or jsonb_typeof(p_hall)<>'array' or jsonb_array_length(p_hall)>100 then raise exception 'Invalid first Hall records';end if;
 if p_hall2 is null or jsonb_typeof(p_hall2)<>'array' or jsonb_array_length(p_hall2)>100 then raise exception 'Invalid second Hall records';end if;
 for v_second in select unnest(array[false,true]) loop
  v_records:=case when v_second then p_hall2 else p_hall end;
  for v_item in select value from jsonb_array_elements(v_records) loop
   v_key:=v_item->>'record_key';
   v_starter:=v_item->>'starter';
   v_party:=v_item->'party';
   if v_key is null or length(v_key) not between 1 and 256 then continue;end if;
   if v_starter is null or v_starter not in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados') then continue;end if;
   if v_party is null or jsonb_typeof(v_party)<>'array' then continue;end if;
   if jsonb_array_length(v_party) not between 1 and 3 then continue;end if;
   if exists (
    select 1 from jsonb_array_elements(v_party) p
    where coalesce(p->>'level','') !~ '^([1-9][0-9]?|100)$'
       or coalesce(p->>'dex','') !~ '^[0-9]{1,4}$'
       or case when coalesce(p->>'dex','') ~ '^[0-9]{1,4}$'
           then (p->>'dex')::integer not between 1 and 1025 else true end
   ) then continue;end if;
   select sum((p->>'level')::integer)::numeric * 3 / jsonb_array_length(v_party)
    into v_sum from jsonb_array_elements(v_party) p;
   if v_second then
    -- Do not duplicate an existing legacy row when the same victory is uploaded anew.
    if exists(select 1 from public.ranking_hall2_records
      where user_id=v_uid and starter=v_starter and party=v_party and record_key like 'legacy:%') then continue;end if;
    insert into public.ranking_hall2_records(user_id,record_key,starter,level_sum,party)
    values(v_uid,v_key,v_starter,v_sum,v_party) on conflict (user_id,record_key) do nothing;
   else
    if exists(select 1 from public.ranking_hall_records
      where user_id=v_uid and starter=v_starter and party=v_party and record_key like 'legacy:%') then continue;end if;
    insert into public.ranking_hall_records(user_id,record_key,starter,level_sum,party)
    values(v_uid,v_key,v_starter,v_sum,v_party) on conflict (user_id,record_key) do nothing;
   end if;
  end loop;
 end loop;
end;
$$;
revoke all on function public.upload_ranking_all_hall_records(jsonb,jsonb) from public,anon;
grant execute on function public.upload_ranking_all_hall_records(jsonb,jsonb) to authenticated;

create or replace view public.ranking_hall_records_board with (security_invoker=true) as
select h.user_id,p.nickname,h.record_key,h.starter,h.level_sum,h.party,h.recorded_at
from public.ranking_hall_records h join public.ranking_profiles p on p.user_id=h.user_id;
create or replace view public.ranking_hall2_records_board with (security_invoker=true) as
select h.user_id,p.nickname,h.record_key,h.starter,h.level_sum,h.party,h.recorded_at
from public.ranking_hall2_records h join public.ranking_profiles p on p.user_id=h.user_id;
grant select on public.ranking_hall_records_board,public.ranking_hall2_records_board to anon,authenticated;
commit;
notify pgrst,'reload schema';
