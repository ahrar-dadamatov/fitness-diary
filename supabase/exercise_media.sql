-- Фото и видео техники упражнений. Выполнить один раз в Supabase → SQL Editor.
-- Бакет закрытый: каждый пользователь видит и меняет только файлы в папке со своим id.

-- Ссылка на фото/видео упражнения (обычный URL или storage:<путь в бакете>)
alter table public.exercises add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "exercise media read own" on storage.objects;
drop policy if exists "exercise media insert own" on storage.objects;
drop policy if exists "exercise media update own" on storage.objects;
drop policy if exists "exercise media delete own" on storage.objects;

create policy "exercise media read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "exercise media insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "exercise media update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "exercise media delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
