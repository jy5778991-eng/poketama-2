-- Run once in the Supabase SQL Editor before deploying the matching ranking UI.
-- The timestamp tracks when the CURRENT achievement count was first registered.
-- Re-uploading the same count never changes it.
ALTER TABLE public.ranking_profiles
  ADD COLUMN IF NOT EXISTS achievement_reached_at timestamptz;

-- Existing timestamps cannot reliably reconstruct historical achievement milestones.
-- Preserve the current ordering as the initial baseline.
UPDATE public.ranking_profiles
SET achievement_reached_at = COALESCE(updated_at, now())
WHERE achievement_reached_at IS NULL;

CREATE OR REPLACE FUNCTION public.poketama_preserve_achievement_reached_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.achievement_reached_at := COALESCE(NEW.achievement_reached_at, clock_timestamp());
  ELSIF NEW.achievement_count IS DISTINCT FROM OLD.achievement_count THEN
    NEW.achievement_reached_at := clock_timestamp();
  ELSE
    NEW.achievement_reached_at := OLD.achievement_reached_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS poketama_achievement_reached_at_trigger
  ON public.ranking_profiles;

CREATE TRIGGER poketama_achievement_reached_at_trigger
BEFORE INSERT OR UPDATE ON public.ranking_profiles
FOR EACH ROW EXECUTE FUNCTION public.poketama_preserve_achievement_reached_at();

CREATE INDEX IF NOT EXISTS ranking_profiles_achievement_order_idx
ON public.ranking_profiles (achievement_count DESC, achievement_reached_at ASC);
