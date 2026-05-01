// Smoke test da tool `inbox` — replica EXATAMENTE as queries do handler em
// index.js v2.6 e valida que rodam sem erro contra o DB real.
//
// Por que: o bug `column v_chats_with_contact.unread_count does not exist`
// (corrigido em ccb81e0) passou batido porque test-fase2.js so testa as views
// diretamente, nao a tool. Esse smoke fecha esse gap — qualquer SELECT
// referenciando coluna inexistente quebra aqui antes de chegar no usuario.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node test-inbox.js

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatorios");
  process.exit(2);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}  ::  ${detail}`); }
  else    { fail++; failures.push({name, detail}); console.log(`  FAIL  ${name}  ::  ${detail}`); }
}

// ─── Query 1: default path (sem filtro de categoria) ───────────────────────
// Replica handler `inbox` (index.js linhas 541-548) quando useCategoryView=false.
console.log("\n=== Test 1: SELECT default em v_chats_with_contact ===");
{
  const { data, error } = await supabase
    .from("v_chats_with_contact")
    .select("chat_id,chat_name,contact_name,is_group,last_message_at,last_received_at,last_sent_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("chat_id", { ascending: true })
    .limit(5);
  check("query nao retorna erro", !error, error?.message || `rows=${data?.length}`);
  check("colunas selecionadas existem", Array.isArray(data) && data.length > 0,
    `tem ${data?.length} linhas`);
  if (data?.[0]) {
    const cols = Object.keys(data[0]).sort().join(",");
    check("retorno tem colunas esperadas",
      cols === "chat_id,chat_name,contact_name,is_group,last_message_at,last_received_at,last_sent_at",
      `cols: ${cols}`);
  }
}

// ─── Query 2: path com filtro de categoria ─────────────────────────────────
// Replica handler quando useCategoryView=true (linhas 542-545).
console.log("\n=== Test 2: SELECT em v_chats_with_categories com overlaps ===");
{
  const { data, error } = await supabase
    .from("v_chats_with_categories")
    .select("chat_id,chat_name,is_group,last_message_at,last_received_at,last_sent_at,category_slugs")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("chat_id", { ascending: true })
    .overlaps("category_slugs", ["cliente"])
    .limit(5);
  check("query nao retorna erro", !error, error?.message || `rows=${data?.length}`);
  check("category_slugs vem como array",
    !data?.length || Array.isArray(data[0].category_slugs),
    `slugs do primeiro: ${JSON.stringify(data?.[0]?.category_slugs)}`);
}

// ─── Query 3: enriquecimento contact_name quando useCategoryView ───────────
// Replica linhas 571-578 do handler — busca contact_name pra os chats
// vindos da view de categorias.
console.log("\n=== Test 3: enriquecimento contact_name in() ===");
{
  // Pega 1 chat_id real pra usar de fixture
  const { data: ref } = await supabase.from("chats").select("chat_id").limit(1);
  const ids = (ref || []).map(r => r.chat_id);
  const { data, error } = await supabase
    .from("v_chats_with_contact")
    .select("chat_id,contact_name")
    .in("chat_id", ids);
  check("enrich query nao retorna erro", !error, error?.message || `rows=${data?.length}`);
  check("colunas enrich corretas",
    !data?.length || Object.keys(data[0]).sort().join(",") === "chat_id,contact_name",
    `cols: ${data?.[0] && Object.keys(data[0]).sort().join(",")}`);
}

// ─── Query 4: filtro `since` (gt em last_message_at) ───────────────────────
console.log("\n=== Test 4: filtro since (gt last_message_at) ===");
{
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("v_chats_with_contact")
    .select("chat_id,last_message_at")
    .gt("last_message_at", since)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(3);
  check("filtro since nao explode", !error, error?.message || `rows=${data?.length}`);
}

// ─── Query 5: exclude_groups (eq is_group=false) ───────────────────────────
console.log("\n=== Test 5: filtro exclude_groups (is_group=false) ===");
{
  const { data, error } = await supabase
    .from("v_chats_with_contact")
    .select("chat_id,is_group")
    .eq("is_group", false)
    .limit(3);
  check("filtro is_group nao explode", !error, error?.message || `rows=${data?.length}`);
  check("nenhum grupo no retorno",
    !data?.length || data.every(c => c.is_group === false),
    `is_group values: ${data?.map(c => c.is_group).join(",")}`);
}

// ─── Query 6: categorias agregadas via v_chats_with_categories.in() ────────
// Replica linhas 586-589 (busca avulsa de categorias quando NAO veio pela view).
console.log("\n=== Test 6: categorias agregadas via in() ===");
{
  const { data: ref } = await supabase.from("chats").select("chat_id").limit(3);
  const ids = (ref || []).map(r => r.chat_id);
  const { data, error } = await supabase
    .from("v_chats_with_categories")
    .select("chat_id,category_slugs")
    .in("chat_id", ids);
  check("query .in() em v_chats_with_categories nao explode", !error,
    error?.message || `rows=${data?.length}`);
}

// ─── Query 7: messages (last message por chat) ─────────────────────────────
// Replica linhas 597-601 do handler.
console.log("\n=== Test 7: select em messages com .in() chat_ids ===");
{
  const { data: ref } = await supabase.from("chats").select("chat_id").limit(3);
  const ids = (ref || []).map(r => r.chat_id);
  const { data, error } = await supabase
    .from("messages")
    .select("id,chat_id,content,message_type,from_me,created_at")
    .in("chat_id", ids)
    .order("created_at", { ascending: false })
    .limit(10);
  check("query messages nao explode", !error, error?.message || `rows=${data?.length}`);
}

console.log(`\n${pass}/${pass+fail} testes passaram`);
if (failures.length) {
  console.log("\nFalhas:");
  for (const f of failures) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
process.exit(0);
