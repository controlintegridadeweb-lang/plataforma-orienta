# BACKEND ARCHITECTURE

## Backend + Supabase

Stack:

- Supabase
- PostgreSQL
- Auth
- Storage
- RLS

Toda tabela sensivel deve possuir RLS ativo.

## Storage

Buckets:

- evidences
- reports
- logos
- attachments

Respondent acessa apenas arquivos proprios.
Admin acessa todos.

## Triggers e Funcoes

Funcoes recomendadas:

- publish_form
- submit_assignment
- validate_evidence
- request_evidence_adjustment
- invalidate_evidence
- generate_recommendations
- approve_recommendation
- create_action_plan
- validate_action
- calculate_fami
- generate_report

## Regras Anti-Caos

E proibido:

- codigo morto;
- fallback mascarando erro;
- logica operacional na UI;
- queries espalhadas;
- status inventados;
- multiplos fluxos paralelos;
- role admin.
