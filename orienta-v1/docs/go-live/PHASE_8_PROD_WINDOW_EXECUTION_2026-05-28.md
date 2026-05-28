# PHASE 8 — PROD WINDOW EXECUTION (2026-05-28)

Status geral: **CONCLUIDO (GO)**
Commit final em produção: `986e923` (`main`)
Deploy: https://orienta-v1.vercel.app
Projeto Supabase: `ziszpxkivwtuhnbsbyog`

## 1) Pré-janela

- [x] Go/No-Go aprovado (`PHASE_8_PROD_GO_NO_GO_2026-05-28.md`)
- [x] Backup pré-deploy executado (schema `backup_predeploy_20260528_0825`)
- [x] Evidência de backup registrada (`PHASE_8_PREDEPLOY_BACKUP_EVIDENCE_2026-05-28.md`)
- [x] Smoke cross-org em homolog validado (`PHASE_8_HOMOLOG_REHEARSAL_2026-05-28.md`)

## 2) Janela de deploy em produção

- [x] Deploy da aplicação em produção iniciado
- [x] Deploy da aplicação em produção concluído (Vercel `READY`, alias `orienta-v1.vercel.app`)
- [x] Código V2 consolidado no `main` (merge `backup/limpeza-local-2026-05-28` → `986e923`)
- [x] Env vars de produção configuradas (Supabase + `NEXT_PUBLIC_APP_URL`)
- [x] Migrations V2 `0030`–`0033` já aplicadas no projeto alvo (sessões anteriores)

## 3) Smoke pós-deploy (produção)

Validação operacional confirmada em 2026-05-28 (usuário):

- [x] Login admin: **PASS** (conta CONTROL — seleção cross-org)
- [x] Login respondent: **PASS**
- [x] Rotas `/admin` e `/respondente` acessíveis após login: **PASS**
- [ ] Submissão de formulário respondent: pendente (smoke estendido)
- [ ] Validação de evidência admin: pendente (smoke estendido)
- [ ] Regra recommendation `invalidated`: pendente (smoke estendido)
- [ ] Regra recommendation `adjustment_requested`: pendente (smoke estendido)
- [ ] Relatório oficial gerado: pendente (smoke estendido)
- [ ] Export CSV gerado: pendente (smoke estendido)

Checagens automáticas complementares:

- [x] Home e `/auth/forgot-password` respondem em produção
- [x] `/admin` sem sessão redireciona para login
- [x] `/api/admin/evidences` retorna `401` sem auth (não `500`)
- [x] Rotas `/api/dev/*` não expostas para uso em produção (`403` em dev-only)

## 4) Monitoramento 24-48h

- [ ] Checkpoint 1h registrado
- [ ] Checkpoint 6h registrado
- [ ] Checkpoint 24h registrado
- [ ] Checkpoint 48h registrado (se aplicável)

## 5) Encerramento da janela

- [x] Janela de go-live inicial encerrada sem incidentes críticos reportados
- [x] Smoke essencial (auth + navegação admin/respondent): **PASS**
- [ ] Smoke funcional completo do runbook (form/evidência/report): agendar em uso real
- [x] Status final da janela: **CONCLUIDO (GO operacional)**

## Evidências operacionais

- Horário de início da janela (BRT): 2026-05-28 (manhã)
- Horário de encerramento smoke essencial (BRT): 2026-05-28
- Responsável técnico: equipe Orienta / operação assistida
- Incidentes relevantes: nenhum bloqueador após correção de login CONTROL e deploy `986e923`
- Ação corretiva aplicada: exceção de login admin CONTROL; merge V2 no `main`; redeploy Vercel produção
