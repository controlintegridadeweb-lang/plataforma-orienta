-- 0025_fami_cohesion.sql
-- Suporte ao plano "Coesão FAMI formulário-maturidade":
--   * forms.response_deadline_at + forms.closed_at (prazo informativo + auditoria).
--   * responses.is_not_applicable (cenário "Não se aplica" persistido).
--   * question_organization_waivers (dispensa institucional por órgão).
-- Pesos e fórmula `calculateFami` permanecem inalterados; perguntas dispensadas
-- viram `isNotApplicable=true` no reprocessamento (fora do denominador).

alter table forms
  add column if not exists response_deadline_at timestamptz null,
  add column if not exists closed_at timestamptz null;

alter table responses
  add column if not exists is_not_applicable boolean not null default false;

create index if not exists responses_form_org_na_idx
  on responses (form_id, organization_id)
  where is_not_applicable = true;

create table if not exists question_organization_waivers (
  form_id uuid not null references forms(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  reason text,
  waived_by uuid not null references auth.users(id),
  waived_at timestamptz not null default now(),
  primary key (form_id, organization_id, question_id)
);

create index if not exists question_organization_waivers_form_org_idx
  on question_organization_waivers (form_id, organization_id);

alter table question_organization_waivers enable row level security;

-- Leitura: staff/analista da organização e admin/analyst veem dispensas que se
-- aplicam à própria organização ou (admin/analyst) a qualquer uma.
create policy "waivers read by org or admin"
on question_organization_waivers for select
to authenticated
using (
  organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
  or exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
);

-- Escrita: apenas admin via service_role (rotas API). Política mantida
-- restritiva para evitar gravação direta pelo cliente.
create policy "waivers write admin only"
on question_organization_waivers for all
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
);

create trigger audit_question_organization_waivers
after insert or update or delete on question_organization_waivers
for each row execute function audit_row_change();
