/* Geek Nexus 人才社区 — jobs module front-end */
(() => {
  "use strict";

  const API_BASE = "https://api.geeknexus.ai/jobs";
  const LANG_KEY = "gn-jobs-lang";

  // ---------- i18n ----------
  const DICT = {
    zh: {
      "hero.eyebrow": "人才社区 · 内推与求职交流",
      "hero.title": "找工作这件事，<em>抱团更快。</em>",
      "hero.intro": "这里是一个面向互联网与游戏行业朋友的交流平台：有内推资源的人挂出内推码，正在看机会的人挂出求职意向和简历。平台只做信息撮合，不参与招聘流程、不收取任何费用。",
      "hero.actionBrowse": "看内推码",
      "hero.actionPost": "我要挂简历",
      "hero.sig1": "免费交流", "hero.sig2": "实名内推", "hero.sig3": "简历仅授权可见",
      "hero.card1t": "企业/员工发布内推码", "hero.card1d": "审核通过后上墙，求职者直接使用",
      "hero.card2t": "求职者挂出意向", "hero.card2d": "意向岗位、地点、薪酬、期望单位一目了然",
      "hero.card3t": "双方直接对接", "hero.card3d": "内推码直接用；简历经站长授权给到企业方",
      "hero.cardNote": "平台不抽成、不代谈 offer，只做信息中转",
      "pp.badge": "付费专区", "pp.title": "游戏云 WLB 求职信息榜",
      "pp.desc": "11 家公司内推入口 + 直投岗位 · ¥10 解锁长期看更新",
      "demo.banner": "演示模式：后端尚未连接，以下为示例数据。部署 jobs-api Worker 后自动切换为真实数据。",
      "sec.referrals.index": "内推码墙", "sec.referrals.title": "拿走就能用的内推码。",
      "sec.referrals.desc": "以下内推码由各公司员工或 HR 提供，均经人工审核。点击内推码即可复制，投递时填入官网投递页对应栏位。",
      "sec.referrals.searchPh": "搜索公司、岗位或城市…", "sec.referrals.post": "我也有内推码要分享",
      "sec.referrals.empty": "暂无内推码，做第一个分享的人。",
      "sec.intents.index": "求职意向墙", "sec.intents.title": "正在看机会的人。",
      "sec.intents.desc": "求职者公开的意向信息如下。简历文件不公开展示——企业方如需某位求职者的简历，请通过页面底部邮箱联系站长获取授权。",
      "sec.intents.searchPh": "搜索意向岗位或城市…", "sec.intents.post": "我也要挂意向",
      "sec.intents.empty": "还没有人挂意向，来打样。",
      "sec.postRef.index": "发布内推码", "sec.postRef.title": "分享一个内推机会。",
      "sec.postRef.desc": "提交后由站长人工审核，通过后 24 小时内上墙。你的联系方式仅站长可见，不会公开展示。",
      "sec.postResume.index": "挂出求职意向", "sec.postResume.title": "让机会找到你。",
      "sec.postResume.desc": "填写意向并上传简历（PDF / DOC / DOCX，≤10MB）。审核通过后，你的意向卡片会上墙；简历文件本身不公开，仅在你同意的情况下经站长转交给企业方。",
      "f.company": "公司 *", "f.companyPh": "例如：某云计算大厂",
      "f.role": "岗位 *", "f.rolePh": "例如：CDN 产品经理 / 服务端开发",
      "f.location": "工作地点 *", "f.locationPh": "例如：上海 / 深圳 / 远程",
      "f.code": "内推码（或内推链接）*", "f.codePh": "例如：NT2026ABC 或 https://…",
      "f.note": "岗位说明 / 要求", "f.notePh": "例如：3 年以上经验，看重 CDN/GCP 背景，走得急",
      "f.contact": "你的联系方式（仅站长可见）", "f.contactPh": "微信 / 邮箱，方便失效后通知更新",
      "f.submitRef": "提交内推码",
      "f.iRole": "意向岗位 *", "f.iRolePh": "例如：云产品经理 / 游戏运营",
      "f.iLocation": "意向地点 *", "f.iLocationPh": "例如：上海 / 深圳 / 香港 / 远程",
      "f.iSalary": "期望薪酬 *", "f.iSalaryPh": "例如：25",
      "f.iCompany": "意向单位 / 方向 *", "f.iCompanyPh": "例如：云计算大厂 / 游戏出海公司 / 不限",
      "f.iNote": "一句话介绍自己", "f.iNotePh": "例如：5 年云行业售前，熟悉游戏出海场景，英语可开会",
      "f.iContact": "联系方式（选填）", "f.iContactPh": "微信 / 邮箱",
      "f.iResume": "简历文件 *", "f.iResumeHint": "PDF / DOC / DOCX，不超过 10MB。简历不会公开展示。",
      "f.iPublic": "公开我的联系方式（勾选后，企业方可直接联系你；不勾选则通过站长中转）",
      "f.iAgree": "我了解并同意：本平台为免费信息交流区，提交的意向信息经审核后公开展示，简历仅在企业方提出需求并经站长转交时提供。 *",
      "f.unitNeg": "面议", "f.submitIntent": "提交意向与简历",
      "cta.index": "企业方看过来", "cta.title": "想触达这些求职者？",
      "cta.desc": "如果你在招人、想查看完整简历或发布批量内推码，邮件联系站长，说明公司与岗位需求。",
      "cta.small": "1 个工作日内回复 · 简历转交前会征求求职者同意",
      "footer.tag": "人才社区 · 免费信息交流平台",
      "footer.copy": "Hong Kong · © 2026 Geek Nexus · 本社区仅为信息交流平台，不参与任何招聘流程",
      // JS-only strings
      "js.location": "地点", "js.posted": "发布于", "js.copy": "复制", "js.copied": "已复制 ✓",
      "js.openLink": "打开内投链接 ↗", "js.expired": "已过期", "js.seeker": "求职者", "js.resumeReady": "简历已备好",
      "js.contact": "联系", "js.viaOwner": "联系方式经站长中转", "js.daysAgo": "天前", "js.today": "今天",
      "js.refOk": "提交成功！已进入审核队列，通过后 24 小时内上墙。感谢分享 🙌",
      "js.intentOk": "提交成功！意向与简历已进入审核队列，通过后即可在求职意向墙看到你。",
      "js.demoOk": "演示模式：本次提交未真正发送。部署后端后即可正式收表。",
      "js.errNetwork": "网络异常，请稍后重试。", "js.errServer": "提交失败：",
      "js.errFile": "请选择简历文件（PDF / DOC / DOCX，≤10MB）。", "js.errAgree": "请先勾选同意声明。",
    },
    en: {
      "hero.eyebrow": "Talent Community · Referrals & Job Search",
      "hero.title": "Job hunting is faster <em>together.</em>",
      "hero.intro": "A community board for friends in the internet and gaming industries: people with referral access share their codes, and job seekers post their intents and resumes. We only match information — no recruiting process, no fees.",
      "hero.actionBrowse": "Browse referrals",
      "hero.actionPost": "Post my intent",
      "hero.sig1": "Free to use", "hero.sig2": "Verified referrals", "hero.sig3": "Resume shared by consent",
      "hero.card1t": "Employees post referral codes", "hero.card1d": "Reviewed, then published for anyone to use",
      "hero.card2t": "Job seekers post intents", "hero.card2d": "Target role, location, salary, and company type at a glance",
      "hero.card3t": "Connect directly", "hero.card3d": "Use codes directly; resumes shared via the site owner with consent",
      "hero.cardNote": "No cuts, no offer negotiation — pure information relay",
      "pp.badge": "PREMIUM", "pp.title": "Gaming-Cloud WLB Job Board",
      "pp.desc": "11 companies' referral entry points + direct roles · ¥10 to unlock with updates",
      "demo.banner": "Demo mode: backend not connected, sample data shown. Deploy the jobs-api Worker to go live.",
      "sec.referrals.index": "Referral wall", "sec.referrals.title": "Referral codes, ready to use.",
      "sec.referrals.desc": "Codes below are shared by employees or recruiters and manually reviewed. Click a code to copy it, then paste it into the company's application page.",
      "sec.referrals.searchPh": "Search company, role, or city…", "sec.referrals.post": "Share a referral code",
      "sec.referrals.empty": "No referral codes yet — be the first to share.",
      "sec.intents.index": "Job intents", "sec.intents.title": "People open to opportunities.",
      "sec.intents.desc": "Public intent cards are shown below. Resume files are never public — employers can request one via the email at the bottom of this page.",
      "sec.intents.searchPh": "Search target role or city…", "sec.intents.post": "Post my intent",
      "sec.intents.empty": "No intents yet — be the first.",
      "sec.postRef.index": "Post a referral", "sec.postRef.title": "Share a referral opportunity.",
      "sec.postRef.desc": "Submissions are reviewed by the site owner and published within 24 hours after approval. Your contact info stays private.",
      "sec.postResume.index": "Post your intent", "sec.postResume.title": "Let opportunities find you.",
      "sec.postResume.desc": "Fill in your intent and upload a resume (PDF / DOC / DOCX, ≤10MB). After review, your intent card goes live; the resume file itself stays private and is only shared with employers with your consent.",
      "f.company": "Company *", "f.companyPh": "e.g. a major cloud vendor",
      "f.role": "Role *", "f.rolePh": "e.g. CDN Product Manager / Backend Engineer",
      "f.location": "Location *", "f.locationPh": "e.g. Shanghai / Shenzhen / Remote",
      "f.code": "Referral code (or link) *", "f.codePh": "e.g. NT2026ABC or https://…",
      "f.note": "Role notes / requirements", "f.notePh": "e.g. 3+ years, CDN/GCP background preferred, urgent hire",
      "f.contact": "Your contact (site owner only)", "f.contactPh": "WeChat / email, for expiry notices",
      "f.submitRef": "Submit referral code",
      "f.iRole": "Target role *", "f.iRolePh": "e.g. Cloud PM / Game Operations",
      "f.iLocation": "Target location *", "f.iLocationPh": "e.g. Shanghai / Shenzhen / Hong Kong / Remote",
      "f.iSalary": "Expected salary *", "f.iSalaryPh": "e.g. 25",
      "f.iCompany": "Target company / direction *", "f.iCompanyPh": "e.g. cloud majors / game-overseas studios / open",
      "f.iNote": "One-line intro", "f.iNotePh": "e.g. 5 yrs in cloud pre-sales, game-overseas savvy, business English",
      "f.iContact": "Contact (optional)", "f.iContactPh": "WeChat / email",
      "f.iResume": "Resume file *", "f.iResumeHint": "PDF / DOC / DOCX, max 10MB. Never shown publicly.",
      "f.iPublic": "Make my contact public (employers reach out directly; otherwise relayed by the site owner)",
      "f.iAgree": "I understand and agree: this is a free information board; my intent card will be public after review, and my resume is only shared when an employer requests it via the site owner. *",
      "f.unitNeg": "Negotiable", "f.submitIntent": "Submit intent & resume",
      "cta.index": "For employers", "cta.title": "Want to reach these candidates?",
      "cta.desc": "Hiring? Need full resumes, or want to publish referral codes in bulk? Email the site owner with your company and role requirements.",
      "cta.small": "Replies within 1 business day · candidate consent obtained before any resume handover",
      "footer.tag": "Talent community · free information board",
      "footer.copy": "Hong Kong · © 2026 Geek Nexus · An information board only — not involved in any hiring process",
      "js.location": "Location", "js.posted": "Posted", "js.copy": "Copy", "js.copied": "Copied ✓",
      "js.openLink": "Open referral link ↗", "js.expired": "Expired", "js.seeker": "Candidate", "js.resumeReady": "Resume on file",
      "js.contact": "Contact", "js.viaOwner": "Contact relayed by site owner", "js.daysAgo": "days ago", "js.today": "today",
      "js.refOk": "Submitted! Now in the review queue — it will go live within 24 hours after approval. Thanks for sharing 🙌",
      "js.intentOk": "Submitted! Your intent and resume are in the review queue and will appear on the wall once approved.",
      "js.demoOk": "Demo mode: this submission was not actually sent. Deploy the backend to start collecting for real.",
      "js.errNetwork": "Network error, please try again later.", "js.errServer": "Submission failed: ",
      "js.errFile": "Please choose a resume file (PDF / DOC / DOCX, ≤10MB).", "js.errAgree": "Please accept the notice first.",
    },
  };

  let lang = localStorage.getItem(LANG_KEY) || "zh";
  const t = (k) => (DICT[lang] && DICT[lang][k]) || DICT.zh[k] || k;

  function applyLang() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = t(el.dataset.i18n);
      if (v) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const v = t(el.dataset.i18nHtml);
      if (v) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const v = t(el.dataset.i18nPh);
      if (v) el.placeholder = v;
    });
    document.querySelectorAll("[data-i18n-opt]").forEach((el) => {
      const v = t(el.dataset.i18nOpt);
      if (v) el.textContent = v;
    });
    const btn = document.querySelector("[data-lang-toggle]");
    if (btn) btn.textContent = lang === "zh" ? "EN" : "中文";
    renderReferrals();
    renderIntents();
  }

  const langBtn = document.querySelector("[data-lang-toggle]");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      lang = lang === "zh" ? "en" : "zh";
      localStorage.setItem(LANG_KEY, lang);
      applyLang();
    });
  }

  // ---------- demo data (fallback when API is not deployed) ----------
  const DEMO_REFERRALS = [
    { id: "d1", company: "某头部云计算大厂", role: "CDN / 边缘云产品经理", location: "上海", code: "EDGE2026SH", link: "", note: "3 年以上产品经验，熟悉 CDN、直播分发优先；业务扩张期，走得比较急。", createdAt: "2026-09-12T10:00:00Z", expiresAt: "2026-10-31" },
    { id: "d2", company: "游戏出海公司（SLG）", role: "服务端开发（Go）", location: "深圳 / 远程", code: "", link: "https://example.com/referral/game-go", note: "负责海外多区域战斗服架构，有 AWS / 高并发经验加分。", createdAt: "2026-09-08T08:00:00Z", expiresAt: null },
    { id: "d3", company: "AI Infra 创业公司", role: "解决方案架构师", location: "北京", code: "AISOL2026BJ", link: "", note: "面向企业客户做 LLM 落地方案，云行业售前转型非常合适。", createdAt: "2026-09-01T09:00:00Z", expiresAt: "2026-12-31" },
  ];
  const DEMO_INTENTS = [
    { id: "e1", role: "云产品经理 / 解决方案", location: "上海 / 远程", salary: "30K/月", companyType: "云计算大厂或 AI Infra", note: "5 年云行业，从 CDN 售前转产品，游戏出海客户服务经验丰富。", contact: "", contactPublic: false, hasResume: true, createdAt: "2026-09-14T12:00:00Z" },
    { id: "e2", role: "游戏海外发行运营", location: "深圳 / 广州", salary: "25K/月", companyType: "游戏出海公司", note: "3 年 SLG 海外运营，熟悉泰国/东南亚市场，泰语英语可用。", contact: "", contactPublic: false, hasResume: true, createdAt: "2026-09-10T09:00:00Z" },
    { id: "e3", role: "DevOps / SRE", location: "香港 / 远程", salary: "面议", companyType: "外企或不限", note: "8 年基础设施运维，AWS 多区域架构，正在考 CKA。", contact: "", contactPublic: false, hasResume: true, createdAt: "2026-09-05T07:00:00Z" },
  ];

  let referrals = [];
  let intents = [];
  let demoMode = false;

  // ---------- rendering ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function timeAgo(iso) {
    if (!iso) return "";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days < 1) return t("js.today");
    return days + " " + t("js.daysAgo");
  }

  function isExpired(r) {
    return !!(r.expiresAt && new Date(r.expiresAt) < new Date());
  }

  function referralCard(r) {
    const expired = isExpired(r);
    const isLink = !r.code && r.link;
    const codeEl = isLink
      ? `<a class="code-chip is-link" href="${esc(r.link)}" target="_blank" rel="noopener nofollow">${t("js.openLink")}</a>`
      : `<button class="code-chip" type="button" data-copy="${esc(r.code)}" title="${t("js.copy")}"><span>${esc(r.code)}</span><small data-copy-label>${t("js.copy")}</small></button>`;
    return `<article class="referral-card${expired ? " is-expired" : ""}">
      <div class="rc-top"><span class="rc-company">${esc(r.company)}</span><span class="rc-meta">${t("js.posted")} ${esc(timeAgo(r.createdAt))}</span></div>
      <h3>${esc(r.role)}</h3>
      <div class="rc-tags"><span>${esc(r.location)}</span>${expired ? `<span class="rc-expired">${t("js.expired")}</span>` : ""}</div>
      ${r.note ? `<p class="rc-note">${esc(r.note)}</p>` : ""}
      <div class="rc-code-row">${codeEl}</div>
    </article>`;
  }

  function intentCard(i) {
    const contact = i.contactPublic && i.contact
      ? `<span class="ic-contact">${t("js.contact")}：<a href="${/^mailto:|^https?:\/\//.test(i.contact) ? esc(i.contact) : "mailto:" + esc(i.contact)}">${esc(i.contact)}</a></span>`
      : `<span class="ic-resume"><i></i>${t("js.viaOwner")}</span>`;
    return `<article class="intent-card">
      <div class="ic-top"><span class="ic-seeker">${t("js.seeker")} #${esc(String(i.id).slice(0, 4).toUpperCase())}</span><span class="rc-meta">${t("js.posted")} ${esc(timeAgo(i.createdAt))}</span></div>
      <h3>${esc(i.role)}</h3>
      <dl class="ic-rows">
        <div><dt>${t("js.location")}</dt><dd>${esc(i.location)}</dd></div>
        <div><dt>${lang === "zh" ? "期望薪酬" : "Salary"}</dt><dd>${esc(i.salary)}</dd></div>
        <div><dt>${lang === "zh" ? "意向单位" : "Target co."}</dt><dd>${esc(i.companyType)}</dd></div>
      </dl>
      ${i.note ? `<p class="ic-note">${esc(i.note)}</p>` : ""}
      <div class="ic-foot">${i.hasResume ? `<span class="ic-resume"><i></i>${t("js.resumeReady")}</span>` : "<span></span>"}${contact}</div>
    </article>`;
  }

  function filterItems(items, q) {
    if (!q) return items;
    const needle = q.trim().toLowerCase();
    return items.filter((x) =>
      [x.company, x.role, x.location, x.note, x.companyType].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }

  function renderReferrals() {
    const grid = document.getElementById("referral-grid");
    const empty = document.getElementById("referral-empty");
    if (!grid) return;
    const q = (document.getElementById("referral-search") || {}).value || "";
    const list = filterItems(referrals, q);
    grid.innerHTML = list.map(referralCard).join("");
    if (empty) empty.hidden = list.length > 0;
  }

  function renderIntents() {
    const grid = document.getElementById("intent-grid");
    const empty = document.getElementById("intent-empty");
    if (!grid) return;
    const q = (document.getElementById("intent-search") || {}).value || "";
    const list = filterItems(intents, q);
    grid.innerHTML = list.map(intentCard).join("");
    if (empty) empty.hidden = list.length > 0;
  }

  // copy-to-clipboard (event delegation)
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
      label.textContent = t("js.copied");
      setTimeout(() => { label.textContent = t("js.copy"); }, 1600);
    }
  });

  ["referral-search", "intent-search"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => (id === "referral-search" ? renderReferrals() : renderIntents()));
  });

  // ---------- data loading ----------
  async function load() {
    try {
      const [rRes, iRes] = await Promise.all([
        fetch(API_BASE + "/referrals", { headers: { accept: "application/json" } }),
        fetch(API_BASE + "/intents", { headers: { accept: "application/json" } }),
      ]);
      if (!rRes.ok || !iRes.ok) throw new Error("bad status");
      const rJson = await rRes.json();
      const iJson = await iRes.json();
      referrals = (rJson.items || []).filter((r) => !isExpired(r));
      intents = iJson.items || [];
    } catch {
      demoMode = true;
      referrals = DEMO_REFERRALS;
      intents = DEMO_INTENTS;
      const banner = document.getElementById("demo-banner");
      if (banner) banner.hidden = false;
    }
    renderReferrals();
    renderIntents();
  }

  // ---------- forms ----------
  function setStatus(el, msg, ok) {
    if (!el) return;
    el.textContent = msg;
    el.className = "form-status " + (ok ? "ok" : "err");
  }

  const referralForm = document.getElementById("referral-form");
  if (referralForm) {
    referralForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("referral-status");
      const btn = referralForm.querySelector(".form-submit");
      const data = Object.fromEntries(new FormData(referralForm).entries());
      if (!data.company || !data.role || !data.location || !(data.code || "").trim()) {
        setStatus(status, lang === "zh" ? "请填写带 * 的必填项。" : "Please fill in the required fields.", false);
        return;
      }
      // single field accepts code or URL
      const raw = String(data.code).trim();
      const payload = { ...data, code: /^https?:\/\//i.test(raw) ? "" : raw, link: /^https?:\/\//i.test(raw) ? raw : "" };
      btn.disabled = true;
      try {
        if (demoMode) {
          setStatus(status, t("js.demoOk"), true);
        } else {
          const res = await fetch(API_BASE + "/referrals", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.error || res.status);
          setStatus(status, t("js.refOk"), true);
        }
        referralForm.reset();
      } catch (err) {
        setStatus(status, t("js.errServer") + (err.message === "Failed to fetch" ? t("js.errNetwork") : err.message), false);
      } finally {
        btn.disabled = false;
      }
    });
  }

  const intentForm = document.getElementById("intent-form");
  if (intentForm) {
    intentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("intent-status");
      const btn = intentForm.querySelector(".form-submit");
      const fd = new FormData(intentForm);
      const file = fd.get("resume");
      if (!(file && file.size > 0)) { setStatus(status, t("js.errFile"), false); return; }
      if (file.size > 10 * 1024 * 1024) { setStatus(status, t("js.errFile"), false); return; }
      if (!fd.get("agree")) { setStatus(status, t("js.errAgree"), false); return; }
      if (!fd.get("role") || !fd.get("location") || !fd.get("salaryNum") || !fd.get("companyType")) {
        setStatus(status, lang === "zh" ? "请填写带 * 的必填项。" : "Please fill in the required fields.", false);
        return;
      }

      // combine salary number + unit into a single salary string
      const unit = fd.get("salaryUnit") || "";
      const num = String(fd.get("salaryNum")).trim();
      fd.set("salary", unit === "面议" || unit === "Negotiable" ? (lang === "zh" ? "面议" : "Negotiable") : num + unit);
      fd.delete("salaryNum");
      fd.delete("salaryUnit");
      fd.set("contactPublic", fd.get("contactPublic") ? "true" : "false");

      btn.disabled = true;
      try {
        if (demoMode) {
          setStatus(status, t("js.demoOk"), true);
        } else {
          const res = await fetch(API_BASE + "/intents", { method: "POST", body: fd });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.error || res.status);
          setStatus(status, t("js.intentOk"), true);
        }
        intentForm.reset();
      } catch (err) {
        setStatus(status, t("js.errServer") + (err.message === "Failed to fetch" ? t("js.errNetwork") : err.message), false);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- init ----------
  applyLang();
  load();
})();
