-- Mapeamento de respostas em escala / numerico para o trio yes/no/partial do motor v2.
-- O JSON guarda:
--   {
--     "scaleBands":        { "failMax": 2, "partialMax": 3 } | null,
--     "numericThresholds": { "failBelow": 30, "partialBelow": 70 } | null
--   }
-- Campos sao opcionais; a ausencia cai para defaults documentados em metric-response-mapper.ts.

alter table question_library_binding
  add column if not exists response_mapping jsonb not null default '{}';

alter table form_question_library_snapshot
  add column if not exists response_mapping jsonb not null default '{}';
