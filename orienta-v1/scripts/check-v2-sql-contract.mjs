import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "supabase", "migrations");

const requiredFiles = [
  "0030_v2_data_normalization.sql",
  "0031_v2_schema_hardening.sql",
  "0032_v2_rls_auth_cleanup.sql",
  "0033_v2_guardrails.sql",
];

const requiredTokens = [
  { file: "0031_v2_schema_hardening.sql", token: "not_applicable" },
  { file: "0031_v2_schema_hardening.sql", token: "adjustment_requested" },
  { file: "0032_v2_rls_auth_cleanup.sql", token: "analyst" },
  { file: "0033_v2_guardrails.sql", token: "question_library_binding_metric_answer_type_v2_check" },
  { file: "0033_v2_guardrails.sql", token: "form_question_library_snapshot_metric_answer_type_v2_check" },
];

const forbiddenInRuntime = [
  { file: "0031_v2_schema_hardening.sql", token: "yes_no_partial" },
  { file: "0031_v2_schema_hardening.sql", token: "implementacao_parcial" },
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(join(migrationsDir, file))) {
    failures.push(`Arquivo obrigatório ausente: supabase/migrations/${file}`);
  }
}

for (const rule of requiredTokens) {
  const full = join(migrationsDir, rule.file);
  if (!existsSync(full)) continue;
  const content = readFileSync(full, "utf8");
  if (!content.includes(rule.token)) {
    failures.push(`Token obrigatório não encontrado em ${rule.file}: "${rule.token}"`);
  }
}

for (const rule of forbiddenInRuntime) {
  const full = join(migrationsDir, rule.file);
  if (!existsSync(full)) continue;
  const content = readFileSync(full, "utf8");
  const pattern = new RegExp(`'${rule.token}'`, "g");
  const matches = content.match(pattern) ?? [];
  // em 0031 os termos legados podem existir no cast/migração e no filtro IF EXISTS.
  // permitimos até 2 ocorrências; acima disso, tratamos como regressão.
  if (matches.length > 2) {
    failures.push(
      `Token legado aparece mais do que o esperado em ${rule.file}: "${rule.token}" (${matches.length}x)`,
    );
  }
}

if (failures.length > 0) {
  console.error("V2 SQL contract check failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("V2 SQL contract check passed.");
