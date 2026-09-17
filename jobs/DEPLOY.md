# Jobs 社区模块 · 部署指南

招聘求职交流模块（内推码墙 + 求职意向/简历）。

## 组成

| 文件 | 作用 |
|------|------|
| `jobs/index.html` + `jobs/jobs.css` + `jobs/jobs.js` | 前端页面（中英双语，默认中文），随主站一起部署，无需额外操作 |
| `workers/jobs-api.mjs` | 后端 API（Cloudflare Worker） |
| `wrangler.jobs.jsonc` | Worker 部署配置（路由 `api.geeknexus.ai/jobs*`） |

> 注意：`api.geeknexus.ai/*` 已被 relay-proxy Worker 占用，但 Cloudflare 路由按
> "更具体的 pattern 优先"匹配，`api.geeknexus.ai/jobs*` 会优先命中本 Worker，互不影响。

## 首次部署（一次性）

```bash
cd "/Users/geekcelia/Documents/New project/geeknexus-site"

# 1. 创建 KV namespace，把返回的 id 填进 wrangler.jobs.jsonc 的 kv_namespaces[0].id
npx wrangler kv namespace create JOBS_KV

# 2. 创建 R2 bucket（存简历）
npx wrangler r2 bucket create geeknexus-resumes

# 3. 设置管理员密钥（审核内推码/意向、下载简历用，自己定一个强随机串）
npx wrangler secret put JOBS_ADMIN_KEY --config wrangler.jobs.jsonc

# 4. 部署
npx wrangler deploy --config wrangler.jobs.jsonc
```

## 数据流

- 用人单位提交内推码 → KV `ref:pending:<id>` → 管理员审核 → `ref:live:<id>` → 前端展示
- 求职者提交意向+简历 → 简历存 R2 `resumes/<uuid>/<文件名>`，意向存 KV `intent:pending:<id>` → 审核 → 公开展示（联系方式默认不公开）
- 简历文件**永不对公众开放**，仅管理员凭 key 下载

## 付费专区（WLB 求职信息榜）

前端：`jobs/premium/`（扫码进入 `https://www.geeknexus.ai/jobs/premium/`，入口二维码在 `jobs/premium/assets/entry-qr.png`）
收款码：把自己的微信收款码截图保存为 `jobs/premium/assets/payment-qr.png`（覆盖占位图即可）

内容与解锁码都存在 KV 里，站长可随时更新，不用重新部署：

```bash
KEY="<你的 JOBS_ADMIN_KEY>"
BASE="https://api.geeknexus.ai/jobs"

# 首次：上传榜单内容（改 premium-seed.json 后同样命令可更新）
curl -X POST "$BASE/admin/premium?key=$KEY" \
  -H 'content-type: application/json' \
  --data-binary @jobs/premium-seed.json

# 生成解锁码（一次最多 50 个），把码发给付了钱的人
curl -X POST "$BASE/admin/unlock?key=$KEY" \
  -H 'content-type: application/json' \
  -d '{"count":10,"note":"朋友圈首批"}'

# 查看内容 + 所有解锁码使用情况
curl "$BASE/admin/premium?key=$KEY"

# 吊销某个解锁码（比如被转发烂了）
curl -X POST "$BASE/admin/unlock-revoke?key=$KEY" \
  -H 'content-type: application/json' \
  -d '{"code":"WLB-XXXXXXXX"}'
```

付费流程：访客扫码进页 → 看脱敏预览 → 扫收款码付 ¥10 → 加微信/发邮件拿解锁码 → 输入解锁，长期有效。
（个人收款码无法自动到账通知，发码是手动确认收款后操作；如果以后想自动化，可接微信支付商户版。）

## 管理员操作（内推码 / 求职意向审核）

```bash
KEY="<你的 JOBS_ADMIN_KEY>"
BASE="https://api.geeknexus.ai/jobs"

# 查看待审核队列
curl "$BASE/admin/pending?key=$KEY"

# 通过 / 拒绝（type: referral | intent）
curl -X POST "$BASE/admin/moderate?key=$KEY" \
  -H 'content-type: application/json' \
  -d '{"type":"referral","id":"xxxx","action":"approve"}'

# 下载某条意向的简历（id 为意向 id）
curl -o resume.pdf "$BASE/admin/resume/<intentId>?key=$KEY"
```

也可做一个简单的 admin 页面（浏览器直接访问带 key 的 pending 接口即可看到 JSON）。

## 前端配置

`jobs/jobs.js` 顶部 `API_BASE` 指向 `https://api.geeknexus.ai/jobs`。
本地预览（`python3 -m http.server`）时 API 不可达会自动进入**演示模式**，展示内置示例数据，方便先看效果。
