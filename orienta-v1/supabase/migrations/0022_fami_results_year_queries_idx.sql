-- Indices para consultas FAMI por ano (intervalo em created_at por form/org + escopo).
create index if not exists fami_results_form_org_scope_created_idx
  on fami_results (form_id, organization_id, scope_type, created_at desc);
