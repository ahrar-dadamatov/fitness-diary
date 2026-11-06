-- Уведомления об окончании отдыха (Web Push).
-- Настоящий секрет лежит только в локальном файле supabase/setup.local.sql, который не попадает в git.
-- Скрипт можно запускать повторно.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

delete from vault.secrets where name = 'push_cron_secret';
select vault.create_secret('__PUSH_CRON_SECRET__', 'push_cron_secret', 'Доступ к /api/send-due-pushes');

-- Телефоны, на которые можно отправлять уведомления
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- Когда у пользователя заканчивается отдых
create table if not exists public.rest_timer_pushes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  fire_at timestamptz not null
);
create index if not exists rest_timer_pushes_fire_at_idx on public.rest_timer_pushes (fire_at);

alter table public.push_subscriptions enable row level security;
alter table public.rest_timer_pushes enable row level security;

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own rest timer" on public.rest_timer_pushes;
create policy "own rest timer" on public.rest_timer_pushes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.rest_timer_pushes to authenticated;
grant select, delete on public.push_subscriptions to service_role;

-- Забирает наступившие таймеры. Строка удаляется сразу, поэтому уведомление не уйдёт дважды.
create or replace function public.claim_due_rest_pushes()
returns table (endpoint text, p256dh text, auth_key text)
language sql
security definer
set search_path = ''
as $$
  with due as (
    delete from public.rest_timer_pushes
    where fire_at <= now()
    returning user_id
  )
  select s.endpoint, s.p256dh, s.auth_key
  from public.push_subscriptions s
  join due on due.user_id = s.user_id;
$$;

-- Обращается к Vercel, только когда есть что отправлять
create or replace function public.dispatch_due_rest_pushes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.rest_timer_pushes where fire_at <= now()) then
    perform net.http_post(
      url := 'https://fitness-diary-khaki.vercel.app/api/send-due-pushes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret'
        )
      ),
      timeout_milliseconds := 15000
    );
  end if;
end;
$$;

revoke execute on function public.claim_due_rest_pushes() from public, anon, authenticated;
revoke execute on function public.dispatch_due_rest_pushes() from public, anon, authenticated;
grant execute on function public.claim_due_rest_pushes() to service_role;

select cron.schedule('send-rest-timer-pushes', '5 seconds', $$select public.dispatch_due_rest_pushes()$$);

-- История запусков сама не очищается, а задача выполняется 17 280 раз в сутки
select cron.schedule(
  'rest-timer-job-details-cleanup',
  '0 * * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$
);
