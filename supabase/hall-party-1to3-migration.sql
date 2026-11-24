-- Apply once in Supabase SQL Editor after existing ranking and hall2 migrations.
-- Allow 1, 2, or 3 actual party members. No invented placeholder Pokemon.
-- level_sum retains the 3-member scale for existing leaderboard UI:
--     level_sum = (total level / number of party members) * 3.
-- Thus a two-member Lv.40 + Lv.60 team displays average Lv.50.00.
-- Past three-member rankings remain numerically unchanged.
begin;

alter table public.ranking_hall drop constraint if exists ranking_hall_party_three;
alter table public.ranking_hall add constraint ranking_hall_party_size
 check (jsonb_typeof(party)='array' and jsonb_array_length(party) between 1 and 3);
alter table public.ranking_hall alter column level_sum type numeric(8,3) using level_sum::numeric;

alter table public.ranking_hall2 drop constraint if exists ranking_hall2_party_three;
alter table public.ranking_hall2 add constraint ranking_hall2_party_size
 check (jsonb_typeof(party)='array' and jsonb_array_length(party) between 1 and 3);
alter table public.ranking_hall2 alter column level_sum type numeric(8,3) using level_sum::numeric;

create or replace function public.upload_ranking(
 p_nickname text,p_dex_count integer,p_achievement_count integer,p_hall jsonb
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_uid uuid:=auth.uid();
 v_item jsonb;
 v_starter text;
 v_party jsonb;
 v_level_sum numeric;
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
  if v_party is null or jsonb_typeof(v_party)<>'array' or jsonb_array_length(v_party) not between 1 and 3 then continue;end if;
  -- Sum only the three recorded levels, never accept a client-supplied average.
  if exists(select 1 from jsonb_array_elements(v_party) as p where
     coalesce(p->>'level','') !~ '^([1-9][0-9]?|100)$'
     or coalesce(p->>'dex','') !~ '^[0-9]{1,4}$'
     or case when coalesce(p->>'dex','') ~ '^[0-9]{1,4}$'
             then (p->>'dex')::integer not between 1 and 1025 else true end
  ) then continue;end if;
  select sum((p->>'level')::integer)::numeric * 3 / jsonb_array_length(v_party)
    into v_level_sum from jsonb_array_elements(v_party) as p;
  insert into public.ranking_hall(user_id,starter,level_sum,party)
  values(v_uid,v_starter,v_level_sum,v_party)
  on conflict(user_id,starter) do update set
   level_sum=excluded.level_sum,party=excluded.party,recorded_at=now()
  where excluded.level_sum < public.ranking_hall.level_sum;
 end loop;
end;
$$;

create or replace function public.upload_ranking_hall2(p_hall2 jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_uid uuid:=auth.uid();
 v_item jsonb;
 v_starter text;
 v_party jsonb;
 v_level_sum numeric;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.ranking_profiles where user_id=v_uid) then raise exception 'Upload profile first';end if;
 if p_hall2 is null or jsonb_typeof(p_hall2)<>'array' or jsonb_array_length(p_hall2)>100 then raise exception 'Invalid hall2 records';end if;
 for v_item in select value from jsonb_array_elements(p_hall2) loop
  v_starter:=v_item->>'starter';v_party:=v_item->'party';
  if v_starter not in ('eevee','snorlax','dragonite','venusaur','charizard','blastoise','raichu','butterfree','gengar','gyarados') then continue;end if;
  if v_party is null or jsonb_typeof(v_party)<>'array' or jsonb_array_length(v_party) not between 1 and 3 then continue;end if;
  if exists(select 1 from jsonb_array_elements(v_party) as p where
   coalesce(p->>'level','')!~'^([1-9][0-9]?|100)$' or coalesce(p->>'dex','')!~'^[0-9]{1,4}$'
   or case when coalesce(p->>'dex','') ~ '^[0-9]{1,4}
  select sum((p->>'level')::integer)::numeric * 3 / jsonb_array_length(v_party) into v_level_sum from jsonb_array_elements(v_party) as p;
  insert into public.ranking_hall2(user_id,starter,level_sum,party)
  values(v_uid,v_starter,v_level_sum,v_party)
  on conflict(user_id,starter) do update set
   level_sum=excluded.level_sum,party=excluded.party,recorded_at=now()
  where excluded.level_sum < public.ranking_hall2.level_sum;
 end loop;
end;
$$;
commit;

           then (p->>'dex')::integer not between 1 and 1025 else true end) then continue;end if;
  select sum((p->>'level')::integer)::numeric * 3 / jsonb_array_length(v_party) into v_level_sum from jsonb_array_elements(v_party) as p;
  insert into public.ranking_hall2(user_id,starter,level_sum,party)
  values(v_uid,v_starter,v_level_sum,v_party)
  on conflict(user_id,starter) do update set
   level_sum=excluded.level_sum,party=excluded.party,recorded_at=now()
  where excluded.level_sum < public.ranking_hall2.level_sum;
 end loop;
end;
$$;
commit;
