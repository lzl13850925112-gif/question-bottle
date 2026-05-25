-- 问题漂流瓶 Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- 1. Extensions
-- pgcrypto provides gen_random_uuid() and gen_random_bytes().
create extension if not exists pgcrypto;

-- 2. Tables
-- Internal UUID ids stay inside the database.
-- public_id is the random id used by the frontend when answering a question.
-- claim_token_hash stores only the SHA-256 hash of the private claim token.
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default encode(gen_random_bytes(16), 'hex'),
  question_text text not null,
  claim_token_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists answers_question_id_idx
on public.answers (question_id);

-- 3. Row Level Security
-- Anonymous visitors should not read or write tables directly.
-- They use the safe RPC functions below instead.
alter table public.questions enable row level security;
alter table public.answers enable row level security;

revoke all on table public.questions from anon, authenticated;
revoke all on table public.answers from anon, authenticated;

-- 4. Helper: very small placeholder spam/profanity check
-- This is intentionally basic. Replace it before a serious public launch.
create or replace function public.is_blocked_text(input_text text)
returns boolean
language plpgsql
immutable
as $$
begin
  return coalesce(input_text, '') ~* '(spam\.example|加微信|博彩|裸聊|贷款)';
end;
$$;

-- 5. RPC: submit an anonymous question
-- The frontend generates a private token, hashes it, and sends only the hash.
create or replace function public.submit_question(
  question_body text,
  claim_token_hash_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(question_body, ''))) < 8
     or length(trim(coalesce(question_body, ''))) > 600 then
    raise exception '问题长度需要在 8 到 600 个字符之间';
  end if;

  if claim_token_hash_value is null
     or claim_token_hash_value !~ '^[a-f0-9]{64}$' then
    raise exception 'claim token hash 格式不正确';
  end if;

  if public.is_blocked_text(question_body) then
    raise exception '内容像广告或骚扰信息';
  end if;

  insert into public.questions (question_text, claim_token_hash)
  values (trim(question_body), claim_token_hash_value);
end;
$$;

-- 6. RPC: fetch one random question that still needs answers
-- The frontend receives public_id, never the internal database id.
CREATE OR REPLACE FUNCTION public.get_random_question(answer_limit integer DEFAULT 5)
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
  GROUP BY q.id, q.public_id, q.question_text
  HAVING count(a.id) < greatest(1, least(coalesce(answer_limit, 5), 10))
  ORDER BY random()
  LIMIT 1;
END;
$$;

-- 7. RPC: submit an anonymous answer to a public question id
create or replace function public.submit_answer(
  question_public_id_value text,
  answer_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_question_id uuid;
  existing_answer_count bigint;
begin
  if length(trim(coalesce(answer_body, ''))) < 2
     or length(trim(coalesce(answer_body, ''))) > 1000 then
    raise exception '回答长度需要在 2 到 1000 个字符之间';
  end if;

  if public.is_blocked_text(answer_body) then
    raise exception '内容像广告或骚扰信息';
  end if;

  select q.id
  into target_question_id
  from public.questions q
  where q.public_id = question_public_id_value;

  if target_question_id is null then
    raise exception '没有找到这个问题';
  end if;

  select count(*)
  into existing_answer_count
  from public.answers a
  where a.question_id = target_question_id;

  if existing_answer_count >= 10 then
    raise exception '这个问题已经收到足够多回复';
  end if;

  insert into public.answers (question_id, answer_text)
  values (target_question_id, trim(answer_body));
end;
$$;

-- 8. RPC: look up replies by private claim token hash
-- The frontend hashes the user's private token and sends the hash.
create or replace function public.get_replies_by_token(
  claim_token_hash_value text
)
returns table (
  question_text text,
  answer_text text,
  answered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if claim_token_hash_value is null
     or claim_token_hash_value !~ '^[a-f0-9]{64}$' then
    raise exception 'claim token hash 格式不正确';
  end if;

  return query
  select
    q.question_text,
    a.answer_text,
    a.created_at as answered_at
  from public.questions q
  left join public.answers a on a.question_id = q.id
  where q.claim_token_hash = claim_token_hash_value
  order by a.created_at asc nulls last;
end;
$$;

-- 9. Function permissions
-- Allow anonymous frontend users to call only the public RPC functions.
grant usage on schema public to anon;
grant execute on function public.submit_question(text, text) to anon;
grant execute on function public.get_random_question(integer) to anon;
grant execute on function public.submit_answer(text, text) to anon;
grant execute on function public.get_replies_by_token(text) to anon;

-- Keep the helper callable only from inside the database functions.
revoke execute on function public.is_blocked_text(text) from public;

-- TODO: Add real rate limiting before public launch.
-- TODO: Replace the placeholder blocked-word check with stronger moderation.
-- TODO: Add cleanup/expiry rules if old bottles should disappear.
