# Backlog — área administrativa

Itens fora do escopo do refatoramento recente (referência para próximos ciclos):

- **Convites por e-mail** (Magic Link / fluxo de onboarding na própria aplicação).
- **Evidências**: ações em lote, rota dedicada `/admin/evidencias/[id]`, download seguro/signed URL para arquivos no Storage.
- **Formulários**: duplicar formulário (template).
- **Relatórios**: exportação CSV/XLSX (hoje apenas PDF oficial).
- **Biblioteca**: UI de histórico de versões / diff; checklist de qualidade se voltar a ser necessário.
- **Efetividade**: a UI da aba `/admin/biblioteca/efetividade` foi removida do front (menu, página, page-headings, queue-link). O serviço `EffectivenessService`, a API `/api/admin/library/effectiveness` e a tabela `library_effectiveness_snapshots` continuam intactos no back. Reativar a aba quando existir job/cron alimentando os snapshots automaticamente.
- **Segurança**: reduzir uso de service role no admin em favor de RLS end-to-end onde fizer sentido.
- **Testes**: cobertura Vitest para páginas (`page.tsx`), não só para `lib/`.
