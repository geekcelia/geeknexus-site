/* WLB 求职信息榜 · 付费专区 front-end */
(() => {
  "use strict";

  const API_BASE = "https://api.geeknexus.ai/jobs";
  const CODE_KEY = "gn-wlb-code";
  const DEMO_CODE = "WLB-DEMO";

  // 演示模式兜底数据（假数据，仅本地预览用；真实内容存后端 KV，不进前端源码）
  const SEED = {
    title: "游戏云 WLB 求职信息榜（演示）",
    price: 10,
    updatedAt: "2026-09-17",
    items: [
      { id: "demo-1", type: "referral", company: "示例公司 A", role: "服务端开发", location: "上海", code: "DEMO-AAAA1111", link: "", note: "演示数据：部署后端后此处显示真实内容。", status: "active" },
      { id: "demo-2", type: "referral", company: "示例公司 B", role: "产品经理", location: "深圳", code: "", link: "https://example.com/demo", note: "演示数据。", status: "active" },
      { id: "demo-3", type: "direct", company: "示例公司 C", role: "游戏运营", location: "远程", code: "", link: "", email: "demo@example.com", note: "演示数据。", status: "active" },
    ],
  };

  let demoMode = false;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const $ = (id) => document.getElementById(id);

  // ---------- rendering ----------

  function setMeta(meta) {
    if (meta.price != null) {
      const yuan = "¥" + meta.price;
      if ($("price-badge")) $("price-badge").textContent = yuan;
      if ($("pay-price")) $("pay-price").textContent = yuan + " / 次";
      if ($("nav-price")) $("nav-price").textContent = yuan;
    }
    if ($("stat-companies")) $("stat-companies").textContent = meta.count ?? "—";
    if ($("stat-active")) $("stat-active").textContent = meta.activeCount ?? "—";
    const d = meta.updatedAt || "—";
    if ($("stat-updated")) $("stat-updated").textContent = d;
    if ($("unlocked-updated")) $("unlocked-updated").textContent = d;
    if (meta.title && $("hero-intro")) {
      $("hero-intro").textContent = meta.title + "：一线互联网与游戏公司的内推入口、直投岗位和投递姿势，一次解锁长期看更新。";
    }
  }

  function previewCard(it) {
    return `<article class="pv-card">
      <div class="pv-top"><span class="pv-company">${esc(it.company)}</span><span class="pv-tag ${it.status === "pending" ? "pending" : "active"}">${it.status === "pending" ? "更新中" : "已生效"}</span></div>
      <h3>${esc(it.role)}</h3>
      <span class="pv-loc">${esc(it.location || "—")}</span>
      <div class="pv-hidden"><span class="lock">🔒</span><span class="fake-code" aria-hidden="true"></span><span>${it.type === "direct" ? "投递方式已隐藏" : "内推码已隐藏"}</span></div>
    </article>`;
  }

  function fullCard(it) {
    let action = "";
    if (it.type === "direct" && it.email) {
      action = `<div class="pv-mail">简历投递：<a href="mailto:${esc(it.email)}?subject=${encodeURIComponent(it.role + " 应聘")}">${esc(it.email)}</a></div>`;
    } else if (it.link) {
      action = `<div class="pv-code-row"><a class="code-chip is-link" href="${esc(it.link)}" target="_blank" rel="noopener nofollow">打开内推链接 ↗</a></div>`;
    } else if (it.code) {
      action = `<div class="pv-code-row"><button class="code-chip" type="button" data-copy="${esc(it.code)}" title="复制"><span>${esc(it.code)}</span><small data-copy-label>复制</small></button></div>`;
    } else {
      action = `<div class="pv-hidden"><span class="lock">⏳</span><span>内推码开通中 · 加站长微信催更</span></div>`;
    }
    return `<article class="pv-card">
      <div class="pv-top"><span class="pv-company">${esc(it.company)}</span><span class="pv-tag ${it.status === "pending" ? "pending" : "active"}">${it.type === "direct" ? "直投岗位" : it.status === "pending" ? "更新中" : "内推"}</span></div>
      <h3>${esc(it.role)}</h3>
      <span class="pv-loc">${esc(it.location || "—")}</span>
      ${it.note ? `<p class="pv-note">${esc(it.note)}</p>` : ""}
      ${action}
    </article>`;
  }

  function renderPreview(items) {
    const grid = $("preview-grid");
    if (grid) grid.innerHTML = items.map(previewCard).join("");
  }

  function renderFull(items) {
    const grid = $("full-grid");
    if (grid) grid.innerHTML = items.map(fullCard).join("");
  }

  function showUnlocked() {
    const locked = $("locked-view");
    const unlocked = $("unlocked-view");
    const panel = $("unlock-panel");
    if (locked) locked.hidden = true;
    if (unlocked) unlocked.hidden = false;
    if (panel) panel.hidden = true;
  }

  // ---------- data ----------

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.error || ("HTTP " + res.status));
    return json;
  }

  async function loadPreview() {
    try {
      const data = await fetchJson(API_BASE + "/premium/content");
      setMeta(data.meta || {});
      renderPreview(data.items || []);
    } catch {
      demoMode = true;
      const banner = $("demo-banner");
      if (banner) banner.hidden = false;
      setMeta({ title: SEED.title, price: SEED.price, updatedAt: SEED.updatedAt, count: SEED.items.length, activeCount: SEED.items.filter((i) => i.status === "active").length });
      renderPreview(SEED.items);
    }
  }

  async function tryUnlock(code, { silent } = {}) {
    const status = $("unlock-status");
    const btn = $("unlock-btn");
    if (!code.trim()) {
      if (!silent && status) { status.textContent = "请输入解锁码。"; status.className = "form-status err"; }
      return false;
    }
    if (btn) btn.disabled = true;
    try {
      let data;
      if (demoMode) {
        if (code.trim().toUpperCase() !== DEMO_CODE) throw new Error("演示模式下请输入 " + DEMO_CODE);
        data = { meta: { title: SEED.title, price: SEED.price, updatedAt: SEED.updatedAt, count: SEED.items.length, activeCount: SEED.items.filter((i) => i.status === "active").length }, items: SEED.items };
      } else {
        data = await fetchJson(API_BASE + "/premium/unlock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });
      }
      localStorage.setItem(CODE_KEY, code.trim().toUpperCase());
      setMeta(data.meta || {});
      renderFull(data.items || []);
      showUnlocked();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    } catch (err) {
      if (!silent && status) {
        status.textContent = (err.message === "Failed to fetch" ? "网络异常，请稍后重试。" : "解锁失败：" + (err.message === "invalid code" ? "解锁码不正确" : err.message));
        status.className = "form-status err";
      }
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ---------- events ----------

  const form = $("unlock-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("unlock-code");
      tryUnlock(input ? input.value : "");
    });
  }

  // copy-to-clipboard（与 jobs.js 相同的交互）
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const code = btn.dataset.copy || "";
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const label = btn.querySelector("[data-copy-label]");
    if (label) {
      label.textContent = "已复制 ✓";
      setTimeout(() => { label.textContent = "复制"; }, 1600);
    }
  });

  // ---------- init ----------
  loadPreview().then(() => {
    const saved = localStorage.getItem(CODE_KEY);
    if (saved) tryUnlock(saved, { silent: true });
  });
})();
