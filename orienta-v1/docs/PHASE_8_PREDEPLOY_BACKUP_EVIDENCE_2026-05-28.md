# PHASE 8 — PREDEPLOY BACKUP EVIDENCE (2026-05-28)

Estratégia adotada: **opção gratuita** (backup lógico interno no banco, sem branch paga).

## Ambiente

- Projeto Supabase: `ziszpxkivwtuhnbsbyog`
- Timestamp da captura (UTC): `2026-05-28 11:25:55.838867+00`

## Execução do backup

Foi criado o schema de snapshot:

- `backup_predeploy_20260528_0825`

Conteúdo:

- cópia das tabelas da `public` no momento pré-deploy;
- tabela de manifesto com contagem de linhas:
  - `backup_predeploy_20260528_0825._backup_manifest`

## Evidência de integridade (manifest)

Exemplos de tabelas e contagem na captura:

- `forms`: `4`
- `responses`: `6`
- `evidences`: `2`
- `evidence_validations`: `5`
- `recommendations`: `3`
- `fami_results`: `31`
- `organizations`: `52`
- `profiles`: `2`
- `reports`: `21`

## Observação operacional

Este backup é útil para recuperação lógica rápida de dados críticos em rollback.
Para restauração, usar `insert/select` a partir do schema `backup_predeploy_20260528_0825` para as tabelas afetadas.
