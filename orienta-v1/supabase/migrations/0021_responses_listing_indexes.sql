-- 0021_responses_listing_indexes.sql
-- Indices para acelerar a aba "Respostas" do modulo Formularios.
-- Sem estes indices a listagem paginada por organizacao faz seq scan
-- quando o numero de respostas cresce (>~50k linhas).
--
-- Sao indices nao-bloqueantes (apenas leitura/escrita rapida). Seguros
-- para aplicar em producao com `if not exists`.

create index if not exists responses_form_updated_idx
  on responses (form_id, updated_at desc);

create index if not exists responses_form_org_updated_idx
  on responses (form_id, organization_id, updated_at desc);

-- Acelera a derivacao de "submetida" (fami_results por par form/org).
create index if not exists fami_results_form_org_idx
  on fami_results (form_id, organization_id);
