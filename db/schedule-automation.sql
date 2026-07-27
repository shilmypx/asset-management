-- Schedules run-automation-rules to fire daily via pg_cron + pg_net.
-- Run this in the Supabase SQL editor AFTER deploying the function
-- (`supabase functions deploy run-automation-rules`).
--
-- Replace <project-ref> and <anon-or-service-key> below with your actual
-- values (Project Settings → API). Using the service role key here is
-- fine — this SQL only runs inside your own database, never sent to a
-- client.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'run-automation-rules-daily',
  '0 6 * * *',  -- 06:00 UTC daily — adjust to your preferred time
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/run-automation-rules',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-or-service-key>')
  );
  $$
);

-- To check it's registered:
-- select * from cron.job;
-- To remove it:
-- select cron.unschedule('run-automation-rules-daily');
