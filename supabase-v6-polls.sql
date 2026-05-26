-- question-bottle 6.0 polls migration
-- Conservative migration only. Review, then run manually in Supabase SQL Editor.
-- Do not run this automatically against production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  question_text text NOT NULL,
  owner_token_hash text,
  is_active boolean DEFAULT true,
  keep_public_after_end boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  option_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE,
  owner_token_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS public_id text DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS question_text text;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS owner_token_hash text;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS keep_public_after_end boolean DEFAULT true;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS ended_at timestamptz;

ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS public_id text DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE;
ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS option_text text;
ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS option_order integer DEFAULT 0;
ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE;
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE;
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS owner_token_hash text;
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS polls_public_id_idx
  ON public.polls (public_id);

CREATE INDEX IF NOT EXISTS polls_active_created_idx
  ON public.polls (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS polls_owner_token_hash_idx
  ON public.polls (owner_token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS poll_options_public_id_idx
  ON public.poll_options (public_id);

CREATE INDEX IF NOT EXISTS poll_options_poll_id_idx
  ON public.poll_options (poll_id, option_order);

CREATE INDEX IF NOT EXISTS poll_votes_poll_id_idx
  ON public.poll_votes (poll_id);

CREATE INDEX IF NOT EXISTS poll_votes_option_id_idx
  ON public.poll_votes (option_id);

CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_unique_owner_idx
  ON public.poll_votes (poll_id, owner_token_hash)
  WHERE owner_token_hash IS NOT NULL;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_public_polls(
  owner_token_hash_value text
)
RETURNS TABLE (
  public_id text,
  question_text text,
  options jsonb,
  total_votes bigint,
  owned_by_me boolean,
  is_active boolean,
  keep_public_after_end boolean,
  created_at timestamptz,
  ended_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF owner_token_hash_value IS NOT NULL
     AND NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  RETURN QUERY
  SELECT
    p.public_id,
    p.question_text,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'public_id', o.public_id,
          'option_text', o.option_text,
          'vote_count', coalesce(v.vote_count, 0)
        )
        ORDER BY o.option_order, o.created_at
      ) FILTER (WHERE o.id IS NOT NULL),
      '[]'::jsonb
    ) AS options,
    coalesce(sum(v.vote_count), 0)::bigint AS total_votes,
    coalesce(p.owner_token_hash = owner_token_hash_value, false) AS owned_by_me,
    p.is_active,
    p.keep_public_after_end,
    p.created_at,
    p.ended_at
  FROM public.polls AS p
  LEFT JOIN public.poll_options AS o
    ON o.poll_id = p.id
  LEFT JOIN (
    SELECT option_id, count(*)::bigint AS vote_count
    FROM public.poll_votes
    GROUP BY option_id
  ) AS v
    ON v.option_id = o.id
  WHERE p.is_active
     OR p.keep_public_after_end
  GROUP BY p.id
  ORDER BY p.is_active DESC, p.created_at DESC
  LIMIT 30;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_poll(
  question_body text,
  option_bodies text[],
  owner_token_hash_value text,
  keep_public_after_end_value boolean
)
RETURNS TABLE (
  public_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_poll_id uuid;
  option_body text;
  option_index integer := 0;
  option_count integer := coalesce(array_length(option_bodies, 1), 0);
BEGIN
  IF length(trim(coalesce(question_body, ''))) < 4
     OR length(trim(coalesce(question_body, ''))) > 160 THEN
    RAISE EXCEPTION '投票问题长度需要在 4 到 160 个字符之间';
  END IF;

  IF option_count < 2
     OR option_count > 4 THEN
    RAISE EXCEPTION '投票需要 2 到 4 个选项';
  END IF;

  IF owner_token_hash_value IS NOT NULL
     AND NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  IF public.is_blocked_text(question_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  INSERT INTO public.polls (
    question_text,
    owner_token_hash,
    keep_public_after_end
  )
  VALUES (
    trim(question_body),
    owner_token_hash_value,
    coalesce(keep_public_after_end_value, true)
  )
  RETURNING id INTO new_poll_id;

  FOREACH option_body IN ARRAY option_bodies LOOP
    IF length(trim(coalesce(option_body, ''))) < 1
       OR length(trim(coalesce(option_body, ''))) > 80 THEN
      RAISE EXCEPTION '投票选项长度需要在 1 到 80 个字符之间';
    END IF;

    IF public.is_blocked_text(option_body) THEN
      RAISE EXCEPTION '内容像广告或骚扰信息';
    END IF;

    option_index := option_index + 1;
    INSERT INTO public.poll_options (
      poll_id,
      option_text,
      option_order
    )
    VALUES (
      new_poll_id,
      trim(option_body),
      option_index
    );
  END LOOP;

  RETURN QUERY
  SELECT p.public_id, p.created_at
  FROM public.polls AS p
  WHERE p.id = new_poll_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vote_poll(
  poll_public_id_value text,
  option_public_id_value text,
  owner_token_hash_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_poll_id uuid;
  target_option_id uuid;
BEGIN
  IF owner_token_hash_value IS NULL
     OR NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  SELECT p.id
  INTO target_poll_id
  FROM public.polls AS p
  WHERE p.public_id = poll_public_id_value
    AND p.is_active = true;

  IF target_poll_id IS NULL THEN
    RAISE EXCEPTION '没有找到正在进行的投票';
  END IF;

  SELECT o.id
  INTO target_option_id
  FROM public.poll_options AS o
  WHERE o.public_id = option_public_id_value
    AND o.poll_id = target_poll_id;

  IF target_option_id IS NULL THEN
    RAISE EXCEPTION '没有找到这个选项';
  END IF;

  INSERT INTO public.poll_votes (
    poll_id,
    option_id,
    owner_token_hash
  )
  VALUES (
    target_poll_id,
    target_option_id,
    owner_token_hash_value
  )
  ON CONFLICT (poll_id, owner_token_hash)
  WHERE owner_token_hash IS NOT NULL
  DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_poll(
  poll_public_id_value text,
  owner_token_hash_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF owner_token_hash_value IS NULL
     OR NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  UPDATE public.polls AS p
  SET is_active = false,
      ended_at = coalesce(p.ended_at, now())
  WHERE p.public_id = poll_public_id_value
    AND p.owner_token_hash = owner_token_hash_value;

  IF NOT FOUND THEN
    RAISE EXCEPTION '没有权限结束这个投票';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_polls(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_poll(text, text[], text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vote_poll(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_poll(text, text) TO anon, authenticated;

SELECT pg_notify('pgrst', 'reload schema');
