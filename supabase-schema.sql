-- 匿名留言瓶 / 夜间匿名空间 Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it.

-- 1. Extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Core tables
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  question_text text NOT NULL,
  claim_token_hash text NOT NULL UNIQUE,
  owner_token_hash text,
  allow_public boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  owner_token_hash text,
  allow_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  message_kind text NOT NULL DEFAULT 'message',
  message_text text NOT NULL,
  owner_token_hash text,
  source_answer_id uuid REFERENCES public.answers(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.public_messages(id) ON DELETE CASCADE,
  reply_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_message_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.public_messages(id) ON DELETE CASCADE,
  owner_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.answer_feedback (
  answer_id uuid PRIMARY KEY REFERENCES public.answers(id) ON DELETE CASCADE,
  asker_liked boolean NOT NULL DEFAULT false,
  asker_reply_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Migration-safe columns for existing databases
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE public.questions
SET public_id = encode(gen_random_bytes(16), 'hex')
WHERE public_id IS NULL;

ALTER TABLE public.questions
  ALTER COLUMN public_id SET DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.questions
  ALTER COLUMN public_id SET NOT NULL;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS owner_token_hash text;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS allow_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS public_id text;

UPDATE public.answers
SET public_id = encode(gen_random_bytes(16), 'hex')
WHERE public_id IS NULL;

ALTER TABLE public.answers
  ALTER COLUMN public_id SET DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.answers
  ALTER COLUMN public_id SET NOT NULL;

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS owner_token_hash text;

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS allow_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS message_kind text NOT NULL DEFAULT 'message';

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS owner_token_hash text;

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS source_answer_id uuid REFERENCES public.answers(id) ON DELETE SET NULL;

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS questions_public_id_idx
  ON public.questions (public_id);

CREATE UNIQUE INDEX IF NOT EXISTS answers_public_id_idx
  ON public.answers (public_id);

CREATE INDEX IF NOT EXISTS answers_question_id_idx
  ON public.answers (question_id);

CREATE INDEX IF NOT EXISTS questions_owner_token_hash_idx
  ON public.questions (owner_token_hash);

CREATE INDEX IF NOT EXISTS answers_owner_token_hash_idx
  ON public.answers (owner_token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS public_messages_public_id_idx
  ON public.public_messages (public_id);

CREATE INDEX IF NOT EXISTS public_messages_created_at_idx
  ON public.public_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS public_messages_owner_token_hash_idx
  ON public.public_messages (owner_token_hash);

CREATE INDEX IF NOT EXISTS public_message_replies_message_id_idx
  ON public.public_message_replies (message_id);

CREATE UNIQUE INDEX IF NOT EXISTS public_messages_source_answer_id_idx
  ON public.public_messages (source_answer_id)
  WHERE source_answer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS public_message_likes_unique_idx
  ON public.public_message_likes (message_id, owner_token_hash);

-- 5. Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_message_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.questions FROM anon, authenticated;
REVOKE ALL ON TABLE public.answers FROM anon, authenticated;
REVOKE ALL ON TABLE public.public_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.public_message_replies FROM anon, authenticated;
REVOKE ALL ON TABLE public.public_message_likes FROM anon, authenticated;
REVOKE ALL ON TABLE public.answer_feedback FROM anon, authenticated;

-- 6. Drop older RPC signatures before recreating current ones
DROP FUNCTION IF EXISTS public.is_blocked_text(text);
DROP FUNCTION IF EXISTS public.is_sha256_hex(text);
DROP FUNCTION IF EXISTS public.submit_question(text, text);
DROP FUNCTION IF EXISTS public.submit_question(text, text, boolean);
DROP FUNCTION IF EXISTS public.submit_question(text, text, boolean, text);
DROP FUNCTION IF EXISTS public.get_random_question(integer);
DROP FUNCTION IF EXISTS public.get_random_question(integer, text[]);
DROP FUNCTION IF EXISTS public.submit_answer(text, text);
DROP FUNCTION IF EXISTS public.submit_answer(text, text, boolean);
DROP FUNCTION IF EXISTS public.submit_answer(text, text, boolean, text);
DROP FUNCTION IF EXISTS public.get_replies_by_token(text);
DROP FUNCTION IF EXISTS public.submit_public_message(text);
DROP FUNCTION IF EXISTS public.submit_public_message(text, text);
DROP FUNCTION IF EXISTS public.get_public_messages(integer);
DROP FUNCTION IF EXISTS public.get_public_messages(integer, text);
DROP FUNCTION IF EXISTS public.submit_public_message_reply(text, text);
DROP FUNCTION IF EXISTS public.get_public_message_replies(text);
DROP FUNCTION IF EXISTS public.like_public_message(text, text);
DROP FUNCTION IF EXISTS public.update_public_message(text, text, text);
DROP FUNCTION IF EXISTS public.delete_public_message(text, text);
DROP FUNCTION IF EXISTS public.get_my_content(text);
DROP FUNCTION IF EXISTS public.update_my_question(text, text, text);
DROP FUNCTION IF EXISTS public.delete_my_question(text, text);
DROP FUNCTION IF EXISTS public.like_answer_by_asker(text, text);
DROP FUNCTION IF EXISTS public.send_asker_reply(text, text, text);

-- 7. Helper: placeholder spam/profanity check
CREATE OR REPLACE FUNCTION public.is_blocked_text(input_text text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN coalesce(input_text, '') ~* '(spam\.example|加微信|博彩|裸聊|贷款)';
END;
$$;

-- 8. Helper: validate SHA-256 hex values from browser-generated tokens
CREATE OR REPLACE FUNCTION public.is_sha256_hex(input_text text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN input_text IS NOT NULL AND input_text ~ '^[a-f0-9]{64}$';
END;
$$;

-- 9. RPC: submit an anonymous question
CREATE OR REPLACE FUNCTION public.submit_question(
  question_body text,
  claim_token_hash_value text,
  allow_public_value boolean DEFAULT false,
  owner_token_hash_value text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(trim(coalesce(question_body, ''))) < 8
     OR length(trim(coalesce(question_body, ''))) > 600 THEN
    RAISE EXCEPTION '问题长度需要在 8 到 600 个字符之间';
  END IF;

  IF NOT public.is_sha256_hex(claim_token_hash_value) THEN
    RAISE EXCEPTION 'claim token hash 格式不正确';
  END IF;

  IF owner_token_hash_value IS NOT NULL
     AND NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  IF public.is_blocked_text(question_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  INSERT INTO public.questions (
    question_text,
    claim_token_hash,
    owner_token_hash,
    allow_public
  )
  VALUES (
    trim(question_body),
    claim_token_hash_value,
    owner_token_hash_value,
    coalesce(allow_public_value, false)
  );
END;
$$;

-- 10. RPC: fetch one random low-answer question, excluding recently seen ids
CREATE OR REPLACE FUNCTION public.get_random_question(
  answer_limit integer DEFAULT 5,
  excluded_public_ids text[] DEFAULT ARRAY[]::text[]
)
RETURNS TABLE (
  public_id text,
  question_text text,
  answer_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.public_id,
    q.question_text,
    count(a.id)::bigint AS answer_count
  FROM public.questions AS q
  LEFT JOIN public.answers AS a
    ON a.question_id = q.id
  WHERE q.public_id <> ALL(coalesce(excluded_public_ids, ARRAY[]::text[]))
  GROUP BY q.id, q.public_id, q.question_text
  HAVING count(a.id) < greatest(1, least(coalesce(answer_limit, 5), 10))
  ORDER BY count(a.id) ASC, random()
  LIMIT 1;
END;
$$;

-- 11. RPC: submit an anonymous answer and publish only if both sides consent
CREATE OR REPLACE FUNCTION public.submit_answer(
  question_public_id_value text,
  answer_body text,
  allow_public_value boolean DEFAULT false,
  owner_token_hash_value text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_question_id uuid;
  target_question_text text;
  question_allows_public boolean;
  existing_answer_count bigint;
  new_answer_id uuid;
BEGIN
  IF length(trim(coalesce(answer_body, ''))) < 2
     OR length(trim(coalesce(answer_body, ''))) > 1000 THEN
    RAISE EXCEPTION '回答长度需要在 2 到 1000 个字符之间';
  END IF;

  IF owner_token_hash_value IS NOT NULL
     AND NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  IF public.is_blocked_text(answer_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  SELECT q.id, q.question_text, q.allow_public
  INTO target_question_id, target_question_text, question_allows_public
  FROM public.questions AS q
  WHERE q.public_id = question_public_id_value;

  IF target_question_id IS NULL THEN
    RAISE EXCEPTION '没有找到这个问题';
  END IF;

  SELECT count(*)
  INTO existing_answer_count
  FROM public.answers AS a
  WHERE a.question_id = target_question_id;

  IF existing_answer_count >= 10 THEN
    RAISE EXCEPTION '这个问题已经收到足够多回复';
  END IF;

  INSERT INTO public.answers (
    question_id,
    answer_text,
    owner_token_hash,
    allow_public
  )
  VALUES (
    target_question_id,
    trim(answer_body),
    owner_token_hash_value,
    coalesce(allow_public_value, false)
  )
  RETURNING id INTO new_answer_id;

  IF question_allows_public AND coalesce(allow_public_value, false) THEN
    INSERT INTO public.public_messages (
      message_kind,
      message_text,
      source_answer_id
    )
    SELECT
      'bottle_qa',
      '问：' || trim(target_question_text) || chr(10) || chr(10) || '答：' || trim(answer_body),
      new_answer_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.public_messages AS m
      WHERE m.source_answer_id = new_answer_id
    );
  END IF;
END;
$$;

-- 12. RPC: look up private bottle replies by claim token hash
CREATE OR REPLACE FUNCTION public.get_replies_by_token(
  claim_token_hash_value text
)
RETURNS TABLE (
  question_text text,
  answer_text text,
  answered_at timestamptz,
  answer_public_id text,
  asker_liked boolean,
  asker_reply_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_sha256_hex(claim_token_hash_value) THEN
    RAISE EXCEPTION 'claim token hash 格式不正确';
  END IF;

  RETURN QUERY
  SELECT
    q.question_text,
    a.answer_text,
    a.created_at AS answered_at,
    a.public_id AS answer_public_id,
    coalesce(f.asker_liked, false) AS asker_liked,
    f.asker_reply_text
  FROM public.questions AS q
  LEFT JOIN public.answers AS a
    ON a.question_id = q.id
  LEFT JOIN public.answer_feedback AS f
    ON f.answer_id = a.id
  WHERE q.claim_token_hash = claim_token_hash_value
  ORDER BY a.created_at ASC NULLS LAST;
END;
$$;

-- 13. RPC: submit a short public anonymous message
CREATE OR REPLACE FUNCTION public.submit_public_message(
  message_body text,
  owner_token_hash_value text
)
RETURNS TABLE (
  public_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(trim(coalesce(message_body, ''))) < 2
     OR length(trim(coalesce(message_body, ''))) > 280 THEN
    RAISE EXCEPTION '留言长度需要在 2 到 280 个字符之间';
  END IF;

  IF owner_token_hash_value IS NOT NULL
     AND NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  IF public.is_blocked_text(message_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  RETURN QUERY
  INSERT INTO public.public_messages (
    message_kind,
    message_text,
    owner_token_hash
  )
  VALUES (
    'message',
    trim(message_body),
    owner_token_hash_value
  )
  RETURNING public_messages.public_id, public_messages.created_at;
END;
$$;

-- 14. RPC: read recent public anonymous messages
CREATE OR REPLACE FUNCTION public.get_public_messages(
  limit_count integer,
  owner_token_hash_value text
)
RETURNS TABLE (
  public_id text,
  message_kind text,
  message_text text,
  reply_count bigint,
  like_count bigint,
  liked_by_me boolean,
  owned_by_me boolean,
  edited_at timestamptz,
  created_at timestamptz
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
  WITH recent_messages AS (
    SELECT *
    FROM public.public_messages
    ORDER BY created_at DESC
    LIMIT greatest(1, least(coalesce(limit_count, 30), 50))
  )
  SELECT
    m.public_id,
    m.message_kind,
    m.message_text,
    count(DISTINCT r.id)::bigint AS reply_count,
    count(DISTINCT l.id)::bigint AS like_count,
    bool_or(l.owner_token_hash = owner_token_hash_value) FILTER (
      WHERE owner_token_hash_value IS NOT NULL
    ) AS liked_by_me,
    coalesce(m.owner_token_hash = owner_token_hash_value, false) AS owned_by_me,
    m.edited_at,
    m.created_at
  FROM recent_messages AS m
  LEFT JOIN public.public_message_replies AS r
    ON r.message_id = m.id
  LEFT JOIN public.public_message_likes AS l
    ON l.message_id = m.id
  GROUP BY
    m.id,
    m.public_id,
    m.message_kind,
    m.message_text,
    m.owner_token_hash,
    m.edited_at,
    m.created_at
  ORDER BY m.created_at ASC;
END;
$$;

-- 15. RPC: anonymously reply to a public message
CREATE OR REPLACE FUNCTION public.submit_public_message_reply(
  message_public_id_value text,
  reply_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_message_id uuid;
BEGIN
  IF length(trim(coalesce(reply_body, ''))) < 1
     OR length(trim(coalesce(reply_body, ''))) > 500 THEN
    RAISE EXCEPTION '回复长度需要在 1 到 500 个字符之间';
  END IF;

  IF public.is_blocked_text(reply_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  SELECT m.id
  INTO target_message_id
  FROM public.public_messages AS m
  WHERE m.public_id = message_public_id_value;

  IF target_message_id IS NULL THEN
    RAISE EXCEPTION '没有找到这条留言';
  END IF;

  INSERT INTO public.public_message_replies (message_id, reply_text)
  VALUES (target_message_id, trim(reply_body));
END;
$$;

-- 16. RPC: read replies for one public message
CREATE OR REPLACE FUNCTION public.get_public_message_replies(
  message_public_id_value text
)
RETURNS TABLE (
  reply_text text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.reply_text,
    r.created_at
  FROM public.public_messages AS m
  JOIN public.public_message_replies AS r
    ON r.message_id = m.id
  WHERE m.public_id = message_public_id_value
  ORDER BY r.created_at ASC
  LIMIT 80;
END;
$$;

-- 17. RPC: like a public message once per browser-local visitor token
CREATE OR REPLACE FUNCTION public.like_public_message(
  message_public_id_value text,
  owner_token_hash_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_message_id uuid;
BEGIN
  IF NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  SELECT m.id
  INTO target_message_id
  FROM public.public_messages AS m
  WHERE m.public_id = message_public_id_value;

  IF target_message_id IS NULL THEN
    RAISE EXCEPTION '没有找到这条留言';
  END IF;

  INSERT INTO public.public_message_likes (message_id, owner_token_hash)
  VALUES (target_message_id, owner_token_hash_value)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 18. RPC: owner edits a public board message
CREATE OR REPLACE FUNCTION public.update_public_message(
  message_public_id_value text,
  owner_token_hash_value text,
  message_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  IF length(trim(coalesce(message_body, ''))) < 2
     OR length(trim(coalesce(message_body, ''))) > 280 THEN
    RAISE EXCEPTION '留言长度需要在 2 到 280 个字符之间';
  END IF;

  IF public.is_blocked_text(message_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  UPDATE public.public_messages AS m
  SET
    message_text = trim(message_body),
    edited_at = now()
  WHERE m.public_id = message_public_id_value
    AND m.owner_token_hash = owner_token_hash_value
    AND m.message_kind = 'message';

  IF NOT FOUND THEN
    RAISE EXCEPTION '没有权限修改这条留言';
  END IF;
END;
$$;

-- 19. RPC: owner deletes a public board message
CREATE OR REPLACE FUNCTION public.delete_public_message(
  message_public_id_value text,
  owner_token_hash_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  DELETE FROM public.public_messages AS m
  WHERE m.public_id = message_public_id_value
    AND m.owner_token_hash = owner_token_hash_value
    AND m.message_kind = 'message';

  IF NOT FOUND THEN
    RAISE EXCEPTION '没有权限删除这条留言';
  END IF;
END;
$$;

-- 20. RPC: read content owned by this browser-local visitor token
CREATE OR REPLACE FUNCTION public.get_my_content(
  owner_token_hash_value text
)
RETURNS TABLE (
  item_type text,
  public_id text,
  body text,
  created_at timestamptz,
  edited_at timestamptz,
  reply_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF owner_token_hash_value IS NULL
     OR owner_token_hash_value !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  RETURN QUERY
  SELECT
    owned_items.item_type,
    owned_items.public_id,
    owned_items.body,
    owned_items.created_at,
    owned_items.edited_at,
    owned_items.reply_count
  FROM (
    SELECT
      'question'::text AS item_type,
      q.public_id,
      q.question_text AS body,
      q.created_at,
      q.edited_at,
      count(a.id)::bigint AS reply_count
    FROM public.questions AS q
    LEFT JOIN public.answers AS a
      ON a.question_id = q.id
    WHERE q.owner_token_hash = owner_token_hash_value
    GROUP BY q.id, q.public_id, q.question_text, q.created_at, q.edited_at

    UNION ALL

    SELECT
      'answer'::text AS item_type,
      a.public_id,
      a.answer_text AS body,
      a.created_at,
      NULL::timestamptz AS edited_at,
      NULL::bigint AS reply_count
    FROM public.answers AS a
    WHERE a.owner_token_hash = owner_token_hash_value

    UNION ALL

    SELECT
      'public_message'::text AS item_type,
      m.public_id,
      m.message_text AS body,
      m.created_at,
      m.edited_at,
      count(r.id)::bigint AS reply_count
    FROM public.public_messages AS m
    LEFT JOIN public.public_message_replies AS r
      ON r.message_id = m.id
    WHERE m.owner_token_hash = owner_token_hash_value
      AND m.message_kind = 'message'
    GROUP BY m.id, m.public_id, m.message_text, m.created_at, m.edited_at
  ) AS owned_items
  ORDER BY owned_items.created_at DESC;
END;
$$;

-- 21. RPC: owner edits a question only while it has no answers
CREATE OR REPLACE FUNCTION public.update_my_question(
  question_public_id_value text,
  owner_token_hash_value text,
  question_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_question_id uuid;
  answer_count bigint;
BEGIN
  IF NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  IF length(trim(coalesce(question_body, ''))) < 8
     OR length(trim(coalesce(question_body, ''))) > 600 THEN
    RAISE EXCEPTION '问题长度需要在 8 到 600 个字符之间';
  END IF;

  IF public.is_blocked_text(question_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  SELECT q.id
  INTO target_question_id
  FROM public.questions AS q
  WHERE q.public_id = question_public_id_value
    AND q.owner_token_hash = owner_token_hash_value;

  IF target_question_id IS NULL THEN
    RAISE EXCEPTION '没有权限修改这个问题';
  END IF;

  SELECT count(*)
  INTO answer_count
  FROM public.answers AS a
  WHERE a.question_id = target_question_id;

  IF answer_count > 0 THEN
    RAISE EXCEPTION '已经收到回复的问题不能再编辑';
  END IF;

  UPDATE public.questions AS q
  SET
    question_text = trim(question_body),
    edited_at = now()
  WHERE q.id = target_question_id;
END;
$$;

-- 22. RPC: owner deletes a question and its related bottle Q&A public copies
CREATE OR REPLACE FUNCTION public.delete_my_question(
  question_public_id_value text,
  owner_token_hash_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_question_id uuid;
BEGIN
  IF NOT public.is_sha256_hex(owner_token_hash_value) THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
  END IF;

  SELECT q.id
  INTO target_question_id
  FROM public.questions AS q
  WHERE q.public_id = question_public_id_value
    AND q.owner_token_hash = owner_token_hash_value;

  IF target_question_id IS NULL THEN
    RAISE EXCEPTION '没有权限删除这个问题';
  END IF;

  DELETE FROM public.public_messages AS m
  WHERE m.source_answer_id IN (
    SELECT a.id
    FROM public.answers AS a
    WHERE a.question_id = target_question_id
  );

  DELETE FROM public.questions AS q
  WHERE q.id = target_question_id;
END;
$$;

-- 23. RPC: asker likes an answer after opening the private claim link
CREATE OR REPLACE FUNCTION public.like_answer_by_asker(
  claim_token_hash_value text,
  answer_public_id_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_answer_id uuid;
BEGIN
  IF NOT public.is_sha256_hex(claim_token_hash_value) THEN
    RAISE EXCEPTION 'claim token hash 格式不正确';
  END IF;

  SELECT a.id
  INTO target_answer_id
  FROM public.answers AS a
  JOIN public.questions AS q
    ON q.id = a.question_id
  WHERE a.public_id = answer_public_id_value
    AND q.claim_token_hash = claim_token_hash_value;

  IF target_answer_id IS NULL THEN
    RAISE EXCEPTION '没有权限操作这条回复';
  END IF;

  INSERT INTO public.answer_feedback (
    answer_id,
    asker_liked,
    updated_at
  )
  VALUES (
    target_answer_id,
    true,
    now()
  )
  ON CONFLICT (answer_id) DO UPDATE
  SET
    asker_liked = true,
    updated_at = now();
END;
$$;

-- 24. RPC: asker sends one short reply to an answer
CREATE OR REPLACE FUNCTION public.send_asker_reply(
  claim_token_hash_value text,
  answer_public_id_value text,
  reply_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_answer_id uuid;
  existing_reply text;
BEGIN
  IF NOT public.is_sha256_hex(claim_token_hash_value) THEN
    RAISE EXCEPTION 'claim token hash 格式不正确';
  END IF;

  IF length(trim(coalesce(reply_body, ''))) < 1
     OR length(trim(coalesce(reply_body, ''))) > 240 THEN
    RAISE EXCEPTION '补充回复长度需要在 1 到 240 个字符之间';
  END IF;

  IF public.is_blocked_text(reply_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  SELECT a.id
  INTO target_answer_id
  FROM public.answers AS a
  JOIN public.questions AS q
    ON q.id = a.question_id
  WHERE a.public_id = answer_public_id_value
    AND q.claim_token_hash = claim_token_hash_value;

  IF target_answer_id IS NULL THEN
    RAISE EXCEPTION '没有权限操作这条回复';
  END IF;

  SELECT f.asker_reply_text
  INTO existing_reply
  FROM public.answer_feedback AS f
  WHERE f.answer_id = target_answer_id;

  IF existing_reply IS NOT NULL THEN
    RAISE EXCEPTION '这条回复已经补充过一次';
  END IF;

  INSERT INTO public.answer_feedback (
    answer_id,
    asker_reply_text,
    updated_at
  )
  VALUES (
    target_answer_id,
    trim(reply_body),
    now()
  )
  ON CONFLICT (answer_id) DO UPDATE
  SET
    asker_reply_text = trim(reply_body),
    updated_at = now()
  WHERE public.answer_feedback.asker_reply_text IS NULL;
END;
$$;

-- 25. Function permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.submit_question(text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_random_question(integer, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_replies_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_message(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_messages(integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_message_reply(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_message_replies(text) TO anon;
GRANT EXECUTE ON FUNCTION public.like_public_message(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_public_message(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_public_message(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_content(text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_my_question(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_my_question(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.like_answer_by_asker(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.send_asker_reply(text, text, text) TO anon;

REVOKE EXECUTE ON FUNCTION public.is_blocked_text(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_sha256_hex(text) FROM public;

-- TODO: Add real rate limiting before public launch.
-- TODO: Replace the placeholder blocked-word check with stronger moderation.
-- TODO: Add reporting and hiding tools for public board content.
-- TODO: Add cleanup/expiry rules if old bottles should disappear.
