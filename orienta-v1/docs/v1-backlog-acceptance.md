# Backlog V1 e Criterios de Aceite

## Auth e Perfis
- Login por email/senha com Supabase Auth.
- Perfis: admin e respondent.
- Aceite: endpoint protegido valida perfil antes de operacao critica.

## Formularios e Versoes
- Criacao/publicacao de formulario versionado.
- Transicoes permitidas conforme ciclo oficial.
- Aceite: transicao invalida retorna bloqueio no endpoint de workflow.

## Evidencias e Validacao
- Upload interno como padrao; link externo apenas com motivo registrado.
- Status de validacao institucionais aplicados.
- Aceite: status `adjustment_requested` exige justificativa.

## Recomendacoes
- Motor gera tipos oficiais por combinacao resposta x comprovacao.
- Ajustes por admin devem preservar texto original.
- Aceite: casos `no`, `not_applicable`, `yes+invalidated` geram tipos corretos.

## FAMI Ponderado
- Peso 1.5 (com comprovacao aprovada/dispensada) e 1.0 (sem comprovacao).
- N/A fora do calculo.
- Aceite: percentual global por total ponderado, sem media simples.

## Relatorio Oficial
- Emissao em PDF apos consolidacao.
- Conteudo inclui identificacao, resultado FAMI e portfolio.
- Aceite: endpoint retorna `application/pdf`.
