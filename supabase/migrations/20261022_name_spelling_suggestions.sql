-- Private admin review queue for names visitors clarify in chat.
-- Rows follow the parent conversation's existing 180-day retention window.
create table if not exists public.name_spelling_suggestions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.chat_conversations (conversation_id) on delete cascade,
  request_id uuid not null unique,
  visitor_email text not null,
  mentioned_name_context text not null default ''
    check (char_length(mentioned_name_context) <= 1000),
  visitor_spelling text not null
    check (char_length(visitor_spelling) between 1 and 200),
  corrected_spelling text not null default ''
    check (char_length(corrected_spelling) <= 200),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists name_spelling_suggestions_created_at_idx
  on public.name_spelling_suggestions (created_at desc);

alter table public.name_spelling_suggestions enable row level security;
revoke all on table public.name_spelling_suggestions from public, anon, authenticated, service_role;
grant insert, select, update on table public.name_spelling_suggestions to service_role;

create or replace function public.set_name_spelling_suggestion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists name_spelling_suggestions_updated_at on public.name_spelling_suggestions;
create trigger name_spelling_suggestions_updated_at
  before update on public.name_spelling_suggestions
  for each row execute function public.set_name_spelling_suggestion_updated_at();
