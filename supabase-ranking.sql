-- Run in Supabase SQL Editor. Enable Authentication > Providers > Anonymous sign-ins.
-- Only the online ranking uses Supabase; local adventure saves never leave the browser.
create table if not exists public.ranking_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null,
 dex_count integer not null default 0 check(dex_count between 0 and 1025),
 achievement_count integer not null default 0 check(achievement_count between 0 and 200),
 updated_at timestamptz not null default now(),
 constraint nickname_length check(char_length(nickname) between 2 and 12)
);
create unique index if not exists ranking_profiles_name_unique on public.ranking_profiles(lower(nickname));

create table if not exists public.ranking_hall (
 user_id uuid not null references public.ranking_profiles(user_id) on delete cascade,
 starter text not null,
 level_sum integer not null check(level_sum between 3 and 300),
 party jsonb not null,
 recorded_at timestamptz not null default now(),
 primary key(user_id,starter),
 constraint ranking_starter_valid check(starter in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados')),
 constraint ranking_hall_party_three check(jsonb_typeof(party)='array' and jsonb_array_length(party)=3)
);
create index if not exists ranking_hall_order on public.ranking_hall(starter,level_sum,recorded_at,user_id);

alter table public.ranking_profiles enable row level security;
alter table public.ranking_hall enable row level security;
drop policy if exists "Anyone can view ranking profiles" on public.ranking_profiles;
create policy "Anyone can view ranking profiles" on public.ranking_profiles for select to anon,authenticated using(true);
drop policy if exists "Anyone can view hall ranking" on public.ranking_hall;
create policy "Anyone can view hall ranking" on public.ranking_hall for select to anon,authenticated using(true);

-- Clients cannot write to either table directly. The RPC validates identity and format.
revoke insert,update,delete on public.ranking_profiles from anon,authenticated;
revoke insert,update,delete on public.ranking_hall from anon,authenticated;
grant select on public.ranking_profiles,public.ranking_hall to anon,authenticated;

create or replace function public.upload_ranking(
 p_nickname text,p_dex_count integer,p_achievement_count integer,p_hall jsonb
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_uid uuid:=auth.uid();
 v_item jsonb;
 v_starter text;
 v_party jsonb;
 v_level_sum integer;
 v_existing text;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 p_nickname:=btrim(p_nickname);
 if char_length(p_nickname) not between 2 and 12 then raise exception 'Nickname must be 2-12 characters';end if;
 if p_dex_count not between 0 and 1025 or p_achievement_count not between 0 and 200 then raise exception 'Invalid count';end if;
 if p_hall is null or jsonb_typeof(p_hall)<>'array' or jsonb_array_length(p_hall)>100 then raise exception 'Invalid hall records';end if;
 select nickname into v_existing from public.ranking_profiles where user_id=v_uid;
 if v_existing is not null and v_existing<>p_nickname then raise exception 'Nickname cannot be changed after joining';end if;
 insert into public.ranking_profiles(user_id,nickname,dex_count,achievement_count,updated_at)
 values(v_uid,p_nickname,p_dex_count,p_achievement_count,now())
 on conflict(user_id) do update set
 dex_count=greatest(public.ranking_profiles.dex_count,excluded.dex_count),
 achievement_count=greatest(public.ranking_profiles.achievement_count,excluded.achievement_count),
 updated_at=now();
 for v_item in select value from jsonb_array_elements(p_hall) loop
  v_starter:=v_item->>'starter';
  v_party:=v_item->'party';
  if v_starter not in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados') then continue;end if;
  if v_party is null or jsonb_typeof(v_party)<>'array' or jsonb_array_length(v_party)<>3 then continue;end if;
  -- Sum only the three recorded levels, never accept a client-supplied average.
  if exists(select 1 from jsonb_array_elements(v_party) as p where
     (p->>'level')!~'^([1-9][0-9]?|100)$') then continue;end if;
  select sum((p->>'level')::integer) into v_level_sum from jsonb_array_elements(v_party) as p;
  insert into public.ranking_hall(user_id,starter,level_sum,party)
  values(v_uid,v_starter,v_level_sum,v_party)
  on conflict(user_id,starter) do update set
   level_sum=excluded.level_sum,party=excluded.party,recorded_at=now()
  where excluded.level_sum < public.ranking_hall.level_sum;
 end loop;
end;
$$;
revoke all on function public.upload_ranking(text,integer,integer,jsonb) from public,anon;
grant execute on function public.upload_ranking(text,integer,integer,jsonb) to authenticated;

-- Ranking reads are public; the ranking UI never sends an adventure save file.

-- Read-only public view adds nickname to each best Hall of Fame entry.
create or replace view public.ranking_hall_board with (security_invoker=true) as
 select h.user_id,p.nickname,h.starter,h.level_sum,h.recorded_at
 from public.ranking_hall as h
 join public.ranking_profiles as p on p.user_id=h.user_id;
grant select on public.ranking_hall_board to anon,authenticated;
