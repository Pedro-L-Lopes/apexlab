import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const require = createRequire(path.join(rootDir, "package.json"));
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

globalThis.WebSocket = globalThis.WebSocket ?? class {};

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];

function record(test, expected, res, detailFn) {
  const errMsg = res.error ? `${res.error.code ?? ""} ${res.error.message}`.trim() : null;
  const rows = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0;
  const detail = detailFn && Array.isArray(res.data) ? detailFn(res.data) : "";
  results.push({ test, expected, rows, error: errMsg, detail });
}

// 1. SELECT public tables & view
record(
  "SELECT products (apenas active)",
  "Apenas status='active' (>= 1 linha, 0 drafts, sem erro)",
  await supabase.from("products").select("id, slug, status"),
  (rows) => {
    const nonActive = rows.filter((r) => r.status !== "active").length;
    return `${rows.length} ativos, ${nonActive} não-ativos`;
  }
);

record(
  "SELECT products (filtro draft)",
  "0 linhas, SEM erro",
  await supabase.from("products").select("id, slug, status").eq("status", "draft")
);

record(
  "SELECT view products_listing (apenas active)",
  "Apenas ativos (>= 1 linha, sem erro)",
  await supabase
    .from("products_listing")
    .select("id, slug, starting_price, cover_image_url, active_variants_count")
    .limit(3),
  (rows) => rows.map((r) => `${r.slug} (starting_price=${r.starting_price}, variants=${r.active_variants_count})`).join("; ")
);

record(
  "SELECT categories (apenas active=true)",
  "Todas active=true (>= 1 linha, 0 inativas, sem erro)",
  await supabase.from("categories").select("id, slug, active"),
  (rows) => {
    const inactive = rows.filter((r) => !r.active).length;
    return `${rows.length} ativas, ${inactive} inativas`;
  }
);

record(
  "SELECT product_variants (apenas active=true)",
  "Todas active=true (0 inativas, sem erro)",
  await supabase.from("product_variants").select("id, name, active"),
  (rows) => {
    const inactive = rows.filter((r) => !r.active).length;
    return `${rows.length} ativas, ${inactive} inativas`;
  }
);

record(
  "SELECT product_images (somente de produtos ativos)",
  "Apenas imagens públicas (>= 1 linha, sem erro)",
  await supabase.from("product_images").select("id, product_id, url").limit(5),
  (rows) => `${rows.length} imagens visíveis (amostra)`
);

record(
  "SELECT site_settings",
  "1 linha (sem erro)",
  await supabase.from("site_settings").select("id, name, primary_color, whatsapp, instagram, hero_mode, home_category_id"),
  (rows) => rows.map((r) => `id=${r.id} name=${r.name} whatsapp='${r.whatsapp}' instagram=${r.instagram} hero_mode=${r.hero_mode} home_category_id=${r.home_category_id}`).join(", ")
);

// 2. Private tables (must be permission denied)
record(
  "SELECT product_private",
  "permission denied",
  await supabase.from("product_private").select("*")
);

record(
  "SELECT import_jobs",
  "permission denied",
  await supabase.from("import_jobs").select("*")
);

record(
  "SELECT admins",
  "permission denied",
  await supabase.from("admins").select("*")
);

// 3. Writes across all 8 tables (INSERT / UPDATE / DELETE)
const dummyUuid = "88888888-8888-4888-8888-888888888888";
const activeUuid = "99999999-9999-4999-8999-999999999901";
const activeCatUuid = "77777777-7777-4777-8777-777777777701";
const activeVarUuid = "66666666-6666-4666-8666-666666666601";
const activeImgUuid = "55555555-5555-4555-8555-555555555501";

const writeCases = [
  {
    table: "site_settings",
    ins: () => supabase.from("site_settings").insert({ id: 2, name: "Hack" }).select(),
    upd: () => supabase.from("site_settings").update({ name: "Hack" }).eq("id", 1).select(),
    del: () => supabase.from("site_settings").delete().eq("id", 1).select(),
  },
  {
    table: "categories",
    ins: () => supabase.from("categories").insert({ id: dummyUuid, slug: "hack-cat", name: "Hack" }).select(),
    upd: () => supabase.from("categories").update({ name: "Hack" }).eq("id", activeCatUuid).select(),
    del: () => supabase.from("categories").delete().eq("id", activeCatUuid).select(),
  },
  {
    table: "products",
    ins: () => supabase.from("products").insert({ id: dummyUuid, slug: "hack-prod", name: "Hack" }).select(),
    upd: () => supabase.from("products").update({ name: "Hack" }).eq("id", activeUuid).select(),
    del: () => supabase.from("products").delete().eq("id", activeUuid).select(),
  },
  {
    table: "product_images",
    ins: () => supabase.from("product_images").insert({ id: dummyUuid, product_id: activeUuid, url: "https://x/y.png" }).select(),
    upd: () => supabase.from("product_images").update({ url: "https://x/z.png" }).eq("id", activeImgUuid).select(),
    del: () => supabase.from("product_images").delete().eq("id", activeImgUuid).select(),
  },
  {
    table: "product_variants",
    ins: () => supabase.from("product_variants").insert({ id: dummyUuid, product_id: activeUuid, name: "Hack" }).select(),
    upd: () => supabase.from("product_variants").update({ name: "Hack" }).eq("id", activeVarUuid).select(),
    del: () => supabase.from("product_variants").delete().eq("id", activeVarUuid).select(),
  },
  {
    table: "product_private",
    ins: () => supabase.from("product_private").insert({ product_id: dummyUuid, stl_url: "https://hack" }).select(),
    upd: () => supabase.from("product_private").update({ notes: "Hack" }).eq("product_id", activeUuid).select(),
    del: () => supabase.from("product_private").delete().eq("product_id", activeUuid).select(),
  },
  {
    table: "admins",
    ins: () => supabase.from("admins").insert({ user_id: dummyUuid }).select(),
    upd: () => supabase.from("admins").update({ user_id: dummyUuid }).neq("user_id", dummyUuid).select(),
    del: () => supabase.from("admins").delete().neq("user_id", dummyUuid).select(),
  },
  {
    table: "import_jobs",
    ins: () => supabase.from("import_jobs").insert({ id: dummyUuid, source_url: "https://hack" }).select(),
    upd: () => supabase.from("import_jobs").update({ status: "done" }).neq("id", dummyUuid).select(),
    del: () => supabase.from("import_jobs").delete().neq("id", dummyUuid).select(),
  },
];

for (const c of writeCases) {
  record(`INSERT ${c.table}`, "Falha", await c.ins());
  record(`UPDATE ${c.table}`, "Falha", await c.upd());
  record(`DELETE ${c.table}`, "Falha", await c.del());
}

// 4. Storage tests on bucket 'products'
const fakeFile = new Uint8Array([1, 2, 3, 4]);
record(
  "Storage upload (products)",
  "Falha",
  await supabase.storage.from("products").upload("anon-hack.webp", fakeFile, { contentType: "image/webp" })
);
record(
  "Storage update (products)",
  "Falha",
  await supabase.storage.from("products").update("temp-test-file.webp", fakeFile, { contentType: "image/webp" })
);
record(
  "Storage remove (products)",
  "Falha / 0 removidos",
  await supabase.storage.from("products").remove(["temp-test-file.webp"])
);
record(
  "Storage list (products)",
  "Negado / lista vazia",
  await supabase.storage.from("products").list("")
);

console.log(JSON.stringify(results, null, 2));
