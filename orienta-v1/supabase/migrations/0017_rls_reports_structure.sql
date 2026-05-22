-- RLS em reports (SELECT por perfil) e leitura estrutural de formulario (axes/sections/questions/form_questions).
-- Mutacoes continuam via APIs com service role (sem policies de INSERT para JWT).

-- --- reports: permitir SELECT conforme organizacao / papel
create policy "reports_select_authorized"
on reports for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid()
    and (
      p.role in ('admin', 'analyst')
      or (p.role = 'respondent' and p.organization_id = reports.organization_id)
    )
  )
);

-- --- estrutura de formulario: apenas leitura para cliente autenticado (mutacao via service role)
alter table axes enable row level security;
create policy "axes_select_authenticated"
on axes for select
to authenticated
using (true);

alter table sections enable row level security;
create policy "sections_select_authenticated"
on sections for select
to authenticated
using (true);

alter table questions enable row level security;
create policy "questions_select_authenticated"
on questions for select
to authenticated
using (true);

alter table form_questions enable row level security;
create policy "form_questions_select_authenticated"
on form_questions for select
to authenticated
using (true);

-- Storage bucket evidencias: uploads/remocoes via API com service role.
-- Nao adicionamos policies em storage.objects aqui; cliente JWT continua sem acesso direto ao bucket.
