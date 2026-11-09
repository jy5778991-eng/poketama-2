-- Run once in the Supabase SQL Editor after supabase-ranking.sql.
-- Red / second-ending leaderboard, separate from first-ending records.
create table if not exists public.ranking_hall2 (
 user_id uuid not null references public.ranking_profiles(user_id) on delete cascade,
 starter text not null,
 level_sum integer not null check(level_sum between 3 and 300),
 party jsonb not null,
 recorded_at timestamptz not null default now(),
 primary key(user_id,starter),
 constraint ranking_hall2_starter_valid check(starter in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados')),
 constraint ranking_hall2_party_three check(jsonb_typeof(party)='array' and jsonb_array_length(party)=3)
);
create index if not exists ranking_hall2_order on public.ranking_hall2(starter,level_sum,recorded_at,user_id);
alter table public.ranking_hall2 enable row level security;
drop policy if exists "Anyone can view second hall ranking" on public.ranking_hall2;
create policy "Anyone can view second hall ranking" on public.ranking_hall2 for select to anon,authenticated using(true);
revoke insert,update,delete on public.ranking_hall2 from anon,authenticated;
grant select on public.ranking_hall2 to anon,authenticated;

create or replace function public.upload_ranking_hall2(p_hall2 jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_uid uuid:=auth.uid();
 v_item jsonb;
 v_starter text;
 v_party jsonb;
 v_level_sum integer;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.ranking_profiles where user_id=v_uid) then raise exception 'Upload profile first';end if;
 if p_hall2 is null or jsonb_typeof(p_hall2)<>'array' or jsonb_array_length(p_hall2)>100 then raise exception 'Invalid hall2 records';end if;
 for v_item in select value from jsonb_array_elements(p_hall2) loop
  v_starter:=v_item->>'starter';v_party:=v_item->'party';
  if v_starter not in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados') then continue;end if;
  if v_party is null or jsonb_typeof(v_party)<>'array' or jsonb_array_length(v_party)<>3 then continue;end if;
  if exists(select 1 from jsonb_array_elements(v_party) as p where
   (p->>'level')!~'^([1-9][0-9]?|100)$' or (p->>'dex')!~'^[0-9]{1,4}$'
   or (p->>'dex')::integer not between 1 and 1025) then continue;end if;
  select sum((p->>'level')::integer) into v_level_sum from jsonb_array_elements(v_party) as p;
  insert into public.ranking_hall2(user_id,starter,level_sum,party)
  values(v_uid,v_starter,v_level_sum,v_party)
  on conflict(user_id,starter) do update set
   level_sum=excluded.level_sum,party=excluded.party,recorded_at=now()
  where excluded.level_sum < public.ranking_hall2.level_sum;
 end loop;
end;
$$;
revoke all on function public.upload_ranking_hall2(jsonb) from public,anon;
grant execute on function public.upload_ranking_hall2(jsonb) to authenticated;

create or replace view public.ranking_hall2_board with (security_invoker=true) as
 select h.user_id,p.nickname,h.starter,h.level_sum,h.party,h.recorded_at
 from public.ranking_hall2 as h join public.ranking_profiles as p on p.user_id=h.user_id;
grant select on public.ranking_hall2_board to anon,authenticated;
