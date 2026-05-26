-- v4.0 local content reliability patch
-- Purpose:
-- Make submit_question return the new question public_id so the browser can
-- save a stable local private-link record immediately after posting.
--
-- Safe scope:
-- - Does not delete user content.
-- - Does not drop tables.
-- - Does not expose private tokens.
-- - Replaces only the submit_question RPC function.

DROP FUNCTION IF EXISTS public.submit_question(text, text, boolean, text);

CREATE OR REPLACE FUNCTION public.submit_question(
  question_body text,
  claim_token_hash_value text,
  allow_public_value boolean,
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

  RETURN QUERY
  INSERT INTO public.questions AS q (
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
  )
  RETURNING q.public_id, q.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_question(text, text, boolean, text) TO anon;

NOTIFY pgrst, 'reload schema';
