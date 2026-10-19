-- Adds the email captured by the existing OTP verification flow to each chat turn.
-- Safe to apply whether or not this column already exists.
alter table public.chat_messages
  add column if not exists visitor_email text;

create index if not exists chat_messages_visitor_email_idx
  on public.chat_messages (visitor_email);
