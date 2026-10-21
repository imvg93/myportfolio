-- Admin dashboard reads visitor ratings/comments and marks them reviewed.
-- Keep access restricted to server routes using the service role.
grant select, update on table public.chat_feedback to service_role;
