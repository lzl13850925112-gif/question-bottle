-- v2.5/v3.0 recovery helper
-- Purpose:
-- Let a browser with its existing local visitor token recover replies for
-- questions created before local private-link recovery was added.
--
-- Safe scope:
-- - Does not create accounts.
-- - Does not require email, phone, or login.
-- - Does not delete or modify user content.
-- - Only reads replies for a question whose owner_token_hash matches the
--   current browser visitor token hash.

CREATE OR REPLACE FUNCTION public.get_my_question_replies(
  owner_token_hash_value text,
  question_public_id_value text
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
  IF owner_token_hash_value IS NULL
     OR owner_token_hash_value !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'visitor token hash 格式不正确';
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
  WHERE q.public_id = question_public_id_value
    AND q.owner_token_hash = owner_token_hash_value
  ORDER BY a.created_at ASC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_question_replies(text, text) TO anon;

NOTIFY pgrst, 'reload schema';
