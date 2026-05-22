-- 0012_recommendations_audit.sql
-- Normaliza o conjunto de status de `recommendations` e adiciona tabela de
-- auditoria append-only para mudancas feitas no admin.

-- 1) Backfill: qualquer status fora do conjunto canonico vira 'open'.
update recommendations
set status = case
  when status in ('open','in_progress','resolved','dismissed') then status
  when status = 'closed' then 'resolved'
  else 'open'
end;

-- 2) CHECK canonico. Remove o antigo (nome padrao quando criado inline).
alter table recommendations
  drop constraint if exists recommendations_status_check;
alter table recommendations
  add constraint recommendations_status_check
  check (status in ('open','in_progress','resolved','dismissed'));

-- 3) Tabela de auditoria: 1 linha por campo alterado.
create table if not exists recommendation_changes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  field text not null check (field in ('status','current_text','priority')),
  old_value text,
  new_value text,
  comment text
);

create index if not exists recommendation_changes_rec_idx
  on recommendation_changes (recommendation_id, changed_at desc);
