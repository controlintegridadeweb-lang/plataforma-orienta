/**
 * Esvazia o bucket `evidencias` via Storage API (o SQL nao pode apagar em storage.objects).
 *
 * DESTRUTIVO: exige CONFIRM=YES no ambiente.
 *
 * Uso (na pasta orienta-v1):
 *   set CONFIRM=YES
 *   set NEXT_PUBLIC_SUPABASE_URL=...
 *   set SUPABASE_SERVICE_ROLE_KEY=...
 *   node supabase/scripts/clean-storage.mjs
 *
 * Linux/macOS: export CONFIRM=YES e demais variaveis ; node ...
 */

import { createClient } from "@supabase/supabase-js";

if (process.env.CONFIRM !== "YES") {
  console.error(
    "Script destrutivo: defina CONFIRM=YES no ambiente antes de executar (ex.: set CONFIRM=YES no Windows).",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (service role, nao anon).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const bucket = "evidencias";

const { data, error } = await supabase.storage.emptyBucket(bucket);

if (error) {
  console.error("Falha ao esvaziar bucket:", error.message);
  process.exit(1);
}

console.log("OK:", data?.message ?? "bucket esvaziado");
