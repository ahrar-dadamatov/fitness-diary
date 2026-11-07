-- Названия и значки дней тренировок. Выполнить один раз в Supabase → SQL Editor.
-- Раньше дни хранились только на устройстве и терялись в установленном приложении.

create table if not exists public.training_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  num integer not null,
  title text not null,
  icon text not null default '💪',
  primary key (user_id, num)
);

alter table public.training_days enable row level security;

drop policy if exists "training days own" on public.training_days;
create policy "training days own" on public.training_days
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
