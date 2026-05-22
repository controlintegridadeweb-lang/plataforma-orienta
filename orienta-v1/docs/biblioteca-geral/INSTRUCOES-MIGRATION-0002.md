# Instrucoes para aplicar a migration 0002 no Supabase

A tela `/admin/biblioteca` hoje retorna "Nao foi possivel carregar a
biblioteca geral" porque as tabelas `library_*` nao existem no banco.

Voce precisa aplicar a migration
[`orienta-v1/supabase/migrations/0002_biblioteca_geral.sql`](../../supabase/migrations/0002_biblioteca_geral.sql)
no projeto Supabase apontado pelas variaveis `NEXT_PUBLIC_SUPABASE_URL`
e `SUPABASE_SERVICE_ROLE_KEY` do arquivo `.env.local`.

## Opcao 1 — Supabase Studio (mais rapido)

1. Acesse `https://supabase.com/dashboard/project/<project-ref>/sql/new`.
2. Abra o arquivo `orienta-v1/supabase/migrations/0002_biblioteca_geral.sql`.
3. Copie todo o conteudo e cole no SQL Editor.
4. Clique em "Run".
5. Valide a criacao abrindo "Table Editor" — devem aparecer
   `library_axes`, `library_sections`, `library_metrics`,
   `library_recommendations` e `library_actions`.

## Opcao 2 — Supabase CLI

Pre-requisito: `supabase` CLI instalado.

```bash
cd orienta-v1
# Gerar um token em https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=seu_token_pessoal

# Linkar o projeto (rodar uma vez)
supabase link --project-ref ziszpxkivwtuhnbsbyog

# Aplicar as migrations
supabase db push
```

## Opcao 3 — psql direto

Com a connection string do Supabase em maos:

```bash
psql "$SUPABASE_DB_URL" -f orienta-v1/supabase/migrations/0002_biblioteca_geral.sql
```

## Validacao apos aplicar

1. No Supabase Studio, Table Editor, confirme as 5 tabelas listadas
   acima com colunas `id, code, name, description, ordem, created_at,
   updated_at` (exceto as tabelas que tem colunas especificas como
   `answer_type`, `priority`).
2. Acesse `http://localhost:3000/admin/biblioteca`.
3. Confirme que a mensagem de erro sumiu e que e possivel criar um
   registro em cada aba (Eixos, Secoes, Metricas, Recomendacoes,
   Acoes-modelo).

## Proxima migration (gerada pela Onda 1)

Depois desta, a proxima migration
`0003_biblioteca_geral_extensao.sql` adiciona os campos de ciclo de
vida, versionamento, tags, vigencia e a tabela de historico
`library_item_versions`. Ela deve ser aplicada da mesma forma assim
que a Onda 1 terminar.
