-- Remove feature de prioridade (Alta / Media / Baixa) em todo o dominio.

delete from recommendation_changes where field = 'priority';

alter table recommendation_changes
  drop constraint if exists recommendation_changes_field_check;

alter table recommendation_changes
  add constraint recommendation_changes_field_check
  check (field in ('status', 'current_text'));

alter table action_plans drop column if exists priority;
alter table recommendations drop column if exists priority;
alter table questions drop column if exists priority;

alter table library_actions drop column if exists suggested_priority;
alter table library_recommendations drop column if exists priority;

alter table library_metrics drop column if exists severity_hint;

drop type if exists library_priority;
drop type if exists library_severity;
