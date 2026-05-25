-- 问题漂流瓶 / 夜间匿名信号 Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it.

-- 1. Extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  question_text text NOT NULL,
  claim_token_hash text NOT NULL UNIQUE,
  allow_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  allow_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  message_kind text NOT NULL DEFAULT 'message',
  message_text text NOT NULL,
  source_answer_id uuid REFERENCES public.answers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.public_messages(id) ON DELETE CASCADE,
  reply_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Migration-safe columns for existing databases
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS allow_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS allow_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS message_kind text NOT NULL DEFAULT 'message';

ALTER TABLE public.public_messages
  ADD COLUMN IF NOT EXISTS source_answer_id uuid REFERENCES public.answers(id) ON DELETE SET NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS answers_question_id_idx
  ON public.answers (question_id);

CREATE INDEX IF NOT EXISTS public_messages_created_at_idx
  ON public.public_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS public_message_replies_message_id_idx
  ON public.public_message_replies (message_id);

CREATE UNIQUE INDEX IF NOT EXISTS public_messages_source_answer_id_idx
  ON public.public_messages (source_answer_id)
  WHERE source_answer_id IS NOT NULL;

-- 5. Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_message_replies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.questions FROM anon, authenticated;
REVOKE ALL ON TABLE public.answers FROM anon, authenticated;
REVOKE ALL ON TABLE public.public_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.public_message_replies FROM anon, authenticated;

-- 6. Drop older overloaded RPC signatures before recreating current ones
DROP FUNCTION IF EXISTS public.submit_question(text, text);
DROP FUNCTION IF EXISTS public.submit_question(text, text, boolean);
DROP FUNCTION IF EXISTS public.get_random_question(integer);
DROP FUNCTION IF EXISTS public.get_random_question(integer, text[]);
DROP FUNCTION IF EXISTS public.submit_answer(text, text);
DROP FUNCTION IF EXISTS public.submit_answer(text, text, boolean);
DROP FUNCTION IF EXISTS public.get_replies_by_token(text);
DROP FUNCTION IF EXISTS public.submit_public_message(text);
DROP FUNCTION IF EXISTS public.get_public_messages(integer);
DROP FUNCTION IF EXISTS public.submit_public_message_reply(text, text);
DROP FUNCTION IF EXISTS public.get_public_message_replies(text);
DROP FUNCTION IF EXISTS public.is_blocked_text(text);

-- 7. Helper: placeholder spam/profanity check
CREATE OR REPLACE FUNCTION public.is_blocked_text(input_text text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN coalesce(input_text, '') ~* '(spam\.example|加微信|博彩|裸聊|贷款)';
END;
$$;

-- 8. RPC: submit an anonymous question
CREATE OR REPLACE FUNCTION public.submit_question(
  question_body text,
  claim_token_hash_value text,
  allow_public_value boolean DEFAULT false
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

  IF claim_token_hash_value IS NULL
     OR claim_token_hash_value !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'claim token hash 格式不正确';
  END IF;

  IF public.is_blocked_text(question_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  INSERT INTO public.questions (question_text, claim_token_hash, allow_public)
  VALUES (
    trim(question_body),
    claim_token_hash_value,
    coalesce(allow_public_value, false)
  );
END;
$$;

-- 9. RPC: fetch one random low-answer question, excluding recently seen ids
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

-- 10. RPC: submit an anonymous answer and publish only if both sides consent
CREATE OR REPLACE FUNCTION public.submit_answer(
  question_public_id_value text,
  answer_body text,
  allow_public_value boolean DEFAULT false
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

  INSERT INTO public.answers (question_id, answer_text, allow_public)
  VALUES (
    target_question_id,
    trim(answer_body),
    coalesce(allow_public_value, false)
  )
  RETURNING id INTO new_answer_id;

  IF question_allows_public AND coalesce(allow_public_value, false) THEN
    INSERT INTO public.public_messages (message_kind, message_text, source_answer_id)
    VALUES (
      'bottle_qa',
      '问：' || trim(target_question_text) || chr(10) || chr(10) || '答：' || trim(answer_body),
      new_answer_id
    )
    ON CONFLICT (source_answer_id) DO NOTHING;
  END IF;
END;
$$;

-- 11. RPC: look up private bottle replies by claim token hash
CREATE OR REPLACE FUNCTION public.get_replies_by_token(
  claim_token_hash_value text
)
RETURNS TABLE (
  question_text text,
  answer_text text,
  answered_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF claim_token_hash_value IS NULL
     OR claim_token_hash_value !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'claim token hash 格式不正确';
  END IF;

  RETURN QUERY
  SELECT
    q.question_text,
    a.answer_text,
    a.created_at AS answered_at
  FROM public.questions AS q
  LEFT JOIN public.answers AS a
    ON a.question_id = q.id
  WHERE q.claim_token_hash = claim_token_hash_value
  ORDER BY a.created_at ASC NULLS LAST;
END;
$$;

-- 12. RPC: submit a short public anonymous message
CREATE OR REPLACE FUNCTION public.submit_public_message(
  message_body text
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

  IF public.is_blocked_text(message_body) THEN
    RAISE EXCEPTION '内容像广告或骚扰信息';
  END IF;

  RETURN QUERY
  INSERT INTO public.public_messages (message_kind, message_text)
  VALUES ('message', trim(message_body))
  RETURNING public_messages.public_id, public_messages.created_at;
END;
$$;

-- 13. RPC: read recent public anonymous messages
CREATE OR REPLACE FUNCTION public.get_public_messages(
  limit_count integer DEFAULT 30
)
RETURNS TABLE (
  public_id text,
  message_kind text,
  message_text text,
  reply_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    count(r.id)::bigint AS reply_count,
    m.created_at
  FROM recent_messages AS m
  LEFT JOIN public.public_message_replies AS r
    ON r.message_id = m.id
  GROUP BY m.id, m.public_id, m.message_kind, m.message_text, m.created_at
  ORDER BY m.created_at ASC;
END;
$$;

-- 14. RPC: anonymously reply to a public message
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

-- 15. RPC: read replies for one public message
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

-- 16. Function permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.submit_question(text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_random_question(integer, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_replies_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_message(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_messages(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_message_reply(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_message_replies(text) TO anon;

REVOKE EXECUTE ON FUNCTION public.is_blocked_text(text) FROM public;

-- TODO: Add real rate limiting before public launch.
-- TODO: Replace the placeholder blocked-word check with stronger moderation.
-- TODO: Add cleanup/expiry rules if old bottles should disappear.
