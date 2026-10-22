# Anonymous chat preview

## Supabase setup

Run `supabase/migrations/20261022120000_chat_trial.sql` in the Supabase SQL Editor for the project used by this app. The chat API calls its security-definer functions with the server-only service-role key. The new tables have row-level security enabled and no browser policies.

## Behavior

- Visitors can ask two questions before email sign-in. Only successfully generated replies count toward the limit.
- Anonymous question state is held in a random, HTTP-only cookie and tracked server-side in Supabase. The server limits new anonymous sessions from one network to 30 per 24 hours; this is an abuse throttle and may be shared by people behind the same network.
- After the second successful reply, the visitor sees an email sign-in option. The transcript and draft question are preserved while email OTP sign-in completes.
- Signing in attaches the anonymous transcript to the signed-in conversation so it appears in admin monitoring.
- Anonymous messages are not written to chat monitoring until the visitor signs in and claims the transcript.
