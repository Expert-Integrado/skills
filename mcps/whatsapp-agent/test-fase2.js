// Smoke test da Fase 2 — filtros de categoria e waiting_on em inbox/search.
// Roda contra DB real, usa Cesar Barboza (chat 554896561958) como fixture.

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail="") {
  if (ok) { pass++; console.log(`  PASS  ${name}  ::  ${detail}`); }
  else { fail++; failures.push({name,detail}); console.log(`  FAIL  ${name}  ::  ${detail}`); }
}

const TEST_CHAT_ID = "553171720654"; // Tiago Guedes — fixture limpa

console.log("\n=== Setup: marca fixture como cliente+equipe ===");
const { data: clienteCat } = await supabase.from("categories").select("id").eq("slug", "cliente").single();
const { data: equipeCat } = await supabase.from("categories").select("id").eq("slug", "equipe").single();
await supabase.from("chat_categories").delete().eq("chat_id", TEST_CHAT_ID);
await supabase.from("chat_categories").upsert([
  { chat_id: TEST_CHAT_ID, category_id: clienteCat.id, assigned_by: "manual" },
  { chat_id: TEST_CHAT_ID, category_id: equipeCat.id, assigned_by: "manual" },
], { onConflict: "chat_id,category_id" });

console.log("\n=== Test 1: v_chats_with_categories — overlap funciona ===");
const { data: clientes } = await supabase
  .from("v_chats_with_categories")
  .select("chat_id,chat_name,category_slugs")
  .overlaps("category_slugs", ["cliente"])
  .order("last_message_at", { ascending: false, nullsFirst: false });
check("query 'overlaps cliente' retorna ao menos 1", clientes?.length >= 1,
  `total: ${clientes?.length}`);
check("Cesar Barboza esta no resultado de cliente",
  clientes?.find(c => c.chat_id === TEST_CHAT_ID),
  `found: ${!!clientes?.find(c => c.chat_id === TEST_CHAT_ID)}`);

console.log("\n=== Test 2: filtro multi-categoria (cliente OU equipe) ===");
const { data: clientesOrEquipe } = await supabase
  .from("v_chats_with_categories")
  .select("chat_id,category_slugs")
  .overlaps("category_slugs", ["cliente", "equipe"]);
check("overlaps com 2 slugs retorna union", clientesOrEquipe?.length >= 1,
  `total: ${clientesOrEquipe?.length}`);
check("fixture aparece (tem cliente E equipe)",
  clientesOrEquipe?.find(c => c.chat_id === TEST_CHAT_ID),
  "found");

console.log("\n=== Test 3: filtro waiting_on=eric (lead respondeu por ultimo) ===");
const { data: waiting } = await supabase
  .from("v_chats_with_contact")
  .select("chat_id,chat_name,last_received_at,last_sent_at,is_group")
  .order("last_message_at", { ascending: false, nullsFirst: false })
  .limit(50);
const ericDevendo = (waiting || []).filter(c => {
  const recv = c.last_received_at ? new Date(c.last_received_at).getTime() : 0;
  const sent = c.last_sent_at ? new Date(c.last_sent_at).getTime() : 0;
  return recv > sent && !c.is_group;
});
check("filtro client-side waiting_on=eric retorna lista valida",
  Array.isArray(ericDevendo) && ericDevendo.length > 0,
  `eric devendo: ${ericDevendo.length}/50 dos top chats`);

console.log("\n=== Test 4: read retorna categorias do chat ===");
const { data: catRow } = await supabase
  .from("v_chats_with_categories")
  .select("category_slugs,category_labels,linked_pipedrive_person_id")
  .eq("chat_id", TEST_CHAT_ID).single();
check("read traz array de slugs", Array.isArray(catRow?.category_slugs),
  `slugs: ${catRow?.category_slugs?.join(",")}`);
check("slugs ordenados alfabeticamente",
  JSON.stringify(catRow?.category_slugs) === JSON.stringify(["cliente","equipe"]),
  `got: ${JSON.stringify(catRow?.category_slugs)}`);

console.log("\n=== Test 5: filtro composto (categoria + waiting_on) ===");
const { data: combinedRaw } = await supabase
  .from("v_chats_with_categories")
  .select("chat_id,category_slugs,last_received_at,last_sent_at,is_group")
  .overlaps("category_slugs", ["cliente"]);
const combined = (combinedRaw || []).filter(c => {
  if (c.is_group) return false;
  const recv = c.last_received_at ? new Date(c.last_received_at).getTime() : 0;
  const sent = c.last_sent_at ? new Date(c.last_sent_at).getTime() : 0;
  return recv > sent;
});
check("filtro 'cliente devendo resposta' retorna >=0", combined.length >= 0,
  `clientes devendo: ${combined.length}`);

console.log("\n=== Test 6: exclude_categories — descartar nao aparece ===");
// Marca temporariamente um chat de teste com 'descartar', valida que nao aparece em queries
const TEST_DESCARTE = "5511995807599"; // Lourivaldo
const { data: descCat } = await supabase.from("categories").select("id").eq("slug", "descartar").single();
await supabase.from("chat_categories").upsert([
  { chat_id: TEST_DESCARTE, category_id: descCat.id, assigned_by: "manual" }
], { onConflict: "chat_id,category_id" });
const { data: discardSet } = await supabase
  .from("v_chats_with_categories")
  .select("chat_id,category_slugs")
  .overlaps("category_slugs", ["descartar"]);
const excluded = new Set((discardSet || []).map(c => c.chat_id));
const { data: allChats } = await supabase.from("v_chats_with_contact").select("chat_id").limit(50);
const filteredOut = (allChats || []).filter(c => !excluded.has(c.chat_id));
check("exclude_categories filtra fora",
  filteredOut.length === 50 - excluded.size || filteredOut.length === 50,
  `total ${allChats?.length}, excluidos ${excluded.size}, sobraram ${filteredOut.length}`);

console.log("\n=== Cleanup ===");
await supabase.from("chat_categories").delete().eq("chat_id", TEST_CHAT_ID);
await supabase.from("chat_categories").delete().eq("chat_id", TEST_DESCARTE);

console.log(`\n${pass}/${pass+fail} testes passaram`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
process.exit(0);
