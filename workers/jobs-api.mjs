/**
 * Geek Nexus Jobs Community API
 * 内推码 + 求职意向 + 简历上传（R2）
 *
 * Deploy:  wrangler.jobs.jsonc
 * Route:   api.geeknexus.ai/jobs*
 *
 * Bindings:
 *   JOBS_KV  (KV)    — referrals & intents storage
 *   RESUMES  (R2)    — resume files
 *   JOBS_ADMIN_KEY (secret) — admin moderation key
 *
 * Endpoints:
 *   GET  /jobs/health
 *   GET  /jobs/referrals            — approved referral codes (public)
 *   POST /jobs/referrals            — submit a referral code (pending review)
 *   GET  /jobs/intents              — approved job intents (public, sanitized)
 *   POST /jobs/intents              — multipart: intent fields + resume file
 *   GET  /jobs/premium/content      — paid content, masked preview when locked
 *   POST /jobs/premium/unlock       — {code} → full paid content
 *   GET  /jobs/admin/pending?key=   — admin: pending queue
 *   POST /jobs/admin/moderate?key=  — admin: {type,id,action:approve|reject}
 *   GET  /jobs/admin/resume/:id?key — admin: download resume from R2
 *   GET  /jobs/admin/premium?key=   — admin: full premium content + codes
 *   POST /jobs/admin/premium?key=   — admin: replace premium content {items,...}
 *   POST /jobs/admin/unlock?key=    — admin: generate unlock codes {count,note}
 *   POST /jobs/admin/unlock-revoke  — admin: revoke an unlock code {code}
 */

const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_ORIGINS = new Set([
  "https://www.geeknexus.ai",
  "https://geeknexus.ai",
]);
const RATE_LIMIT_PER_HOUR = 30;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allow =
    ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ? origin
      : ALLOWED_ORIGINS.values().next().value;
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request) },
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function isAdmin(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-admin-key") || "";
  const expected = (env && env.JOBS_ADMIN_KEY) || "";
  return expected && key && safeEqual(key, expected);
}

function text(v, max) {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, " ").slice(0, max);
}

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function nowIso() {
  return new Date().toISOString();
}

// ---------- validation ----------

function validateReferral(payload) {
  const errors = [];
  const company = text(payload.company, 60);
  const role = text(payload.role, 80);
  const location = text(payload.location, 60);
  const code = text(payload.code, 160);
  const note = text(payload.note, 300);
  const contact = text(payload.contact, 120);
  const link = text(payload.link, 400);
  if (!company) errors.push("company required");
  if (!role) errors.push("role required");
  if (!location) errors.push("location required");
  if (!code && !link) errors.push("code or link required");
  if (link && !/^https?:\/\//i.test(link)) errors.push("link must be http(s)");
  return { errors, data: { company, role, location, code, link, note, contact } };
}

function validateIntent(fields) {
  const errors = [];
  const role = text(fields.role, 80);
  const location = text(fields.location, 60);
  const salary = text(fields.salary, 60);
  const companyType = text(fields.companyType, 80);
  const note = text(fields.note, 300);
  const contact = text(fields.contact, 120);
  const contactPublic = fields.contactPublic === "true" || fields.contactPublic === "on";
  if (!role) errors.push("role required");
  if (!location) errors.push("location required");
  if (!salary) errors.push("salary required");
  if (!companyType) errors.push("companyType required");
  if (contactPublic && !contact) errors.push("contact required when contactPublic");
  return { errors, data: { role, location, salary, companyType, note, contact, contactPublic } };
}

function sanitizeReferralPublic(r) {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    location: r.location,
    code: r.code || "",
    link: r.link || "",
    note: r.note || "",
    createdAt: r.createdAt,
    expiresAt: r.expiresAt || null,
  };
}

function sanitizeIntentPublic(i) {
  return {
    id: i.id,
    role: i.role,
    location: i.location,
    salary: i.salary,
    companyType: i.companyType,
    note: i.note || "",
    contact: i.contactPublic ? i.contact : "",
    contactPublic: !!i.contactPublic,
    hasResume: !!i.resumeName,
    createdAt: i.createdAt,
  };
}

// ---------- KV helpers ----------

async function listByPrefix(env, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await env.JOBS_KV.list({ prefix, cursor });
    for (const k of page.keys) {
      const raw = await env.JOBS_KV.get(k.name, "json");
      if (raw) out.push(raw);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

async function rateLimit(env, request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const bucket = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const n = parseInt((await env.JOBS_KV.get(bucket)) || "0", 10) + 1;
  await env.JOBS_KV.put(bucket, String(n), { expirationTtl: 3600 });
  return n <= RATE_LIMIT_PER_HOUR;
}

// ---------- resume storage (R2 优先，KV 兜底) ----------

async function putResume(env, key, arrayBuffer, contentType) {
  if (env.RESUMES) {
    await env.RESUMES.put(key, arrayBuffer, { httpMetadata: { contentType } });
    return "r2";
  }
  await env.JOBS_KV.put("file:" + key, arrayBuffer, { metadata: { contentType } });
  return "kv";
}

async function getResume(env, key) {
  if (env.RESUMES) {
    const obj = await env.RESUMES.get(key);
    if (!obj) return null;
    return { body: obj.body, contentType: obj.httpMetadata?.contentType || "application/octet-stream" };
  }
  const withMeta = await env.JOBS_KV.getWithMetadata("file:" + key, "arrayBuffer");
  if (!withMeta || !withMeta.value) return null;
  return { body: withMeta.value, contentType: withMeta.metadata?.contentType || "application/octet-stream" };
}

async function deleteResume(env, key) {
  if (env.RESUMES) await env.RESUMES.delete(key);
  else await env.JOBS_KV.delete("file:" + key);
}

// ---------- handlers ----------

async function handleGetReferrals(env, request) {
  const items = await listByPrefix(env, "ref:live:");
  items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json(request, { ok: true, items: items.map(sanitizeReferralPublic) });
}

async function handlePostReferrals(env, request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(request, { ok: false, error: "invalid json" }, 400);
  }
  const { errors, data } = validateReferral(payload);
  if (errors.length) return json(request, { ok: false, error: errors.join("; ") }, 400);

  const record = {
    id: newId(),
    ...data,
    expiresAt: text(payload.expiresAt, 20) || null,
    status: "pending",
    ip: request.headers.get("cf-connecting-ip") || "",
    createdAt: nowIso(),
  };
  await env.JOBS_KV.put(`ref:pending:${record.id}`, JSON.stringify(record));
  return json(request, { ok: true, id: record.id, status: "pending" }, 201);
}

async function handleGetIntents(env, request) {
  const items = await listByPrefix(env, "intent:live:");
  items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json(request, { ok: true, items: items.map(sanitizeIntentPublic) });
}

async function handlePostIntents(env, request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json(request, { ok: false, error: "invalid form data" }, 400);
  }

  const fields = {};
  for (const key of ["role", "location", "salary", "companyType", "note", "contact", "contactPublic"]) {
    fields[key] = form.get(key) ?? "";
  }
  const { errors, data } = validateIntent(fields);
  if (errors.length) return json(request, { ok: false, error: errors.join("; ") }, 400);

  const file = form.get("resume");
  let resumeName = "";
  let resumeKey = "";
  if (file && typeof file === "object" && file.size > 0) {
    if (file.size > MAX_RESUME_BYTES) {
      return json(request, { ok: false, error: "resume too large (max 10MB)" }, 413);
    }
    const type = (file.type || "").toLowerCase();
    if (!ALLOWED_RESUME_TYPES.has(type)) {
      return json(request, { ok: false, error: "only PDF / DOC / DOCX allowed" }, 415);
    }
    const safeName = String(file.name || "resume")
      .replace(/[^\w.\-\u4e00-\u9fa5 ]+/g, "_")
      .slice(0, 120);
    const id = newId();
    resumeName = safeName;
    resumeKey = `resumes/${id}/${safeName}`;
    await putResume(env, resumeKey, await file.arrayBuffer(), type);
  } else {
    return json(request, { ok: false, error: "resume file required" }, 400);
  }

  const record = {
    id: newId(),
    ...data,
    resumeName,
    resumeKey,
    status: "pending",
    ip: request.headers.get("cf-connecting-ip") || "",
    createdAt: nowIso(),
  };
  await env.JOBS_KV.put(`intent:pending:${record.id}`, JSON.stringify(record));
  return json(request, { ok: true, id: record.id, status: "pending" }, 201);
}

async function handleAdminPending(env, request) {
  const [refs, intents] = await Promise.all([
    listByPrefix(env, "ref:pending:"),
    listByPrefix(env, "intent:pending:"),
  ]);
  refs.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  intents.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  return json(request, {
    ok: true,
    referrals: refs,
    intents: intents.map((i) => ({ ...i, resumeKey: i.resumeKey, resumeUrl: `./resume/${i.id}?key=${new URL(request.url).searchParams.get("key")}` })),
  });
}

async function handleAdminModerate(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, error: "invalid json" }, 400);
  }
  const { type, id, action } = body;
  if (!["referral", "intent"].includes(type) || !id || !["approve", "reject"].includes(action)) {
    return json(request, { ok: false, error: "type, id, action (approve|reject) required" }, 400);
  }
  const prefix = type === "referral" ? "ref:" : "intent:";
  const raw = await env.JOBS_KV.get(`${prefix}pending:${id}`, "json");
  if (!raw) return json(request, { ok: false, error: "not found" }, 404);

  await env.JOBS_KV.delete(`${prefix}pending:${id}`);
  if (action === "approve") {
    raw.status = "live";
    raw.approvedAt = nowIso();
    await env.JOBS_KV.put(`${prefix}live:${id}`, JSON.stringify(raw));
  } else if (raw.resumeKey) {
    // rejected intent: also clean up the uploaded resume
    await deleteResume(env, raw.resumeKey);
  }
  return json(request, { ok: true, action, id });
}

async function handleAdminResume(env, request) {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  for (const prefix of ["intent:pending:", "intent:live:"]) {
    const rec = await env.JOBS_KV.get(`${prefix}${id}`, "json");
    if (rec && rec.resumeKey) {
      const obj = await getResume(env, rec.resumeKey);
      if (!obj) break;
      return new Response(obj.body, {
        headers: {
          ...corsHeaders(request),
          "content-type": obj.contentType || "application/octet-stream",
          "content-disposition": `attachment; filename="${encodeURIComponent(rec.resumeName || "resume")}"`,
        },
      });
    }
  }
  return json(request, { ok: false, error: "resume not found" }, 404);
}

// ---------- premium (paid content) ----------

const PREMIUM_KEY = "premium:wlb:content";

function maskItem(item) {
  // 公开预览：公司/岗位/地点可见，内推码、链接、邮箱、说明全部隐藏
  return {
    id: item.id,
    type: item.type,
    company: item.company,
    role: item.role,
    location: item.location,
    status: item.status,
    hasCode: !!(item.code || item.link || item.email),
  };
}

function premiumMeta(data) {
  const items = data.items || [];
  return {
    title: data.title || "付费内容",
    price: data.price || 0,
    currency: data.currency || "CNY",
    updatedAt: data.updatedAt || "",
    count: items.length,
    activeCount: items.filter((i) => i.status === "active").length,
  };
}

async function getPremiumContent(env) {
  return (await env.JOBS_KV.get(PREMIUM_KEY, "json")) || { title: "", price: 10, currency: "CNY", updatedAt: "", items: [] };
}

async function handleGetPremium(env, request) {
  const data = await getPremiumContent(env);
  return json(request, { ok: true, locked: true, meta: premiumMeta(data), items: (data.items || []).map(maskItem) });
}

async function handlePremiumUnlock(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, error: "invalid json" }, 400);
  }
  const code = text(body.code, 64).toUpperCase();
  if (!code) return json(request, { ok: false, error: "code required" }, 400);

  const rec = await env.JOBS_KV.get(`premium:unlock:${code}`, "json");
  if (!rec || rec.revoked) return json(request, { ok: false, error: "invalid code" }, 403);

  rec.usedCount = (rec.usedCount || 0) + 1;
  rec.lastUsedAt = nowIso();
  await env.JOBS_KV.put(`premium:unlock:${code}`, JSON.stringify(rec));

  const data = await getPremiumContent(env);
  return json(request, { ok: true, locked: false, meta: premiumMeta(data), items: data.items || [] });
}

async function handleAdminPremiumGet(env, request) {
  const data = await getPremiumContent(env);
  const codes = (await listByPrefix(env, "premium:unlock:")).sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
  return json(request, { ok: true, content: data, unlockCodes: codes });
}

async function handleAdminPremiumSet(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, error: "invalid json" }, 400);
  }
  const items = Array.isArray(body.items) ? body.items : null;
  if (!items || !items.length) return json(request, { ok: false, error: "items array required" }, 400);
  for (const it of items) {
    if (!it.company || !it.role) return json(request, { ok: false, error: "each item needs company + role" }, 400);
  }
  const data = {
    title: text(body.title, 80) || "付费内容",
    price: Math.max(0, Number(body.price) || 0),
    currency: text(body.currency, 8) || "CNY",
    updatedAt: nowIso().slice(0, 10),
    items: items.map((it, idx) => ({
      id: text(it.id, 20) || `item-${idx + 1}`,
      type: it.type === "direct" ? "direct" : "referral",
      company: text(it.company, 60),
      role: text(it.role, 80),
      location: text(it.location, 60),
      code: text(it.code, 160),
      link: text(it.link, 400),
      email: text(it.email, 120),
      note: text(it.note, 2000),
      status: it.status === "pending" ? "pending" : "active",
    })),
  };
  await env.JOBS_KV.put(PREMIUM_KEY, JSON.stringify(data));
  return json(request, { ok: true, meta: premiumMeta(data) });
}

async function handleAdminUnlockGen(env, request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const count = Math.min(50, Math.max(1, parseInt(body.count, 10) || 1));
  const note = text(body.note, 120);
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = "WLB-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const rec = { code, note, usedCount: 0, createdAt: nowIso() };
    await env.JOBS_KV.put(`premium:unlock:${code}`, JSON.stringify(rec));
    codes.push(rec);
  }
  return json(request, { ok: true, codes });
}

async function handleAdminUnlockRevoke(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, error: "invalid json" }, 400);
  }
  const code = text(body.code, 64).toUpperCase();
  if (!code) return json(request, { ok: false, error: "code required" }, 400);
  const rec = await env.JOBS_KV.get(`premium:unlock:${code}`, "json");
  if (!rec) return json(request, { ok: false, error: "not found" }, 404);
  rec.revoked = true;
  await env.JOBS_KV.put(`premium:unlock:${code}`, JSON.stringify(rec));
  return json(request, { ok: true, revoked: code });
}

// ---------- entry ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/jobs";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      // health
      if (path === "/jobs/health") return json(request, { ok: true, service: "jobs-api" });

      // public
      if (path === "/jobs/referrals" && request.method === "GET") return handleGetReferrals(env, request);
      if (path === "/jobs/referrals" && request.method === "POST") {
        if (!(await rateLimit(env, request))) return json(request, { ok: false, error: "rate limited" }, 429);
        return handlePostReferrals(env, request);
      }
      if (path === "/jobs/intents" && request.method === "GET") return handleGetIntents(env, request);
      if (path === "/jobs/intents" && request.method === "POST") {
        if (!(await rateLimit(env, request))) return json(request, { ok: false, error: "rate limited" }, 429);
        return handlePostIntents(env, request);
      }

      // premium (paid content)
      if (path === "/jobs/premium/content" && request.method === "GET") return handleGetPremium(env, request);
      if (path === "/jobs/premium/unlock" && request.method === "POST") {
        if (!(await rateLimit(env, request))) return json(request, { ok: false, error: "rate limited" }, 429);
        return handlePremiumUnlock(env, request);
      }

      // admin
      if (path.startsWith("/jobs/admin/")) {
        if (!isAdmin(request, env)) return json(request, { ok: false, error: "unauthorized" }, 401);
        if (path === "/jobs/admin/pending" && request.method === "GET") return handleAdminPending(env, request);
        if (path === "/jobs/admin/moderate" && request.method === "POST") return handleAdminModerate(env, request);
        if (path.startsWith("/jobs/admin/resume/") && request.method === "GET") return handleAdminResume(env, request);
        if (path === "/jobs/admin/premium" && request.method === "GET") return handleAdminPremiumGet(env, request);
        if (path === "/jobs/admin/premium" && request.method === "POST") return handleAdminPremiumSet(env, request);
        if (path === "/jobs/admin/unlock" && request.method === "POST") return handleAdminUnlockGen(env, request);
        if (path === "/jobs/admin/unlock-revoke" && request.method === "POST") return handleAdminUnlockRevoke(env, request);
      }

      return json(request, { ok: false, error: "not found" }, 404);
    } catch (err) {
      return json(request, { ok: false, error: String(err && err.message || err) }, 500);
    }
  },
};
