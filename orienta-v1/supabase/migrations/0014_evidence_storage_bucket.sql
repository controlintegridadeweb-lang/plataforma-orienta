-- Bucket para upload de evidencias via API (service role).
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidencias', 'evidencias', false, 52428800)
on conflict (id) do nothing;
