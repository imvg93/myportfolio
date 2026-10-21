-- Optional visitor rating/comment, writable only through authenticated server routes.
-- Feedback expires when its parent conversation is pruned after 180 days.
create table if not exists public.chat_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique
    references public.chat_conversations (conversation_id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'reviewed'))
);

create index if not exists chat_feedback_created_at_idx
  on public.chat_feedback (created_at desc);

alter table public.chat_feedback enable row level security;
revoke all on table public.chat_feedback from public, anon, authenticated, service_role;
grant insert, select, update on table public.chat_feedback to service_role;
