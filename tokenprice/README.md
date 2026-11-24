# Token Price

Static model supplier quote lookup at `/tokenprice/`. No build or external runtime dependencies.

## Data

`data/quotes.json` is a multi-supplier snapshot built from the supplied workbooks. It preserves the WeJoy `模型报价` sheet's original prices, currencies, units, conditional tiers, cache components and discounts separately. 网宿边缘AI与界云的表只提供折扣方案，没有模型级输入、输出或缓存基础单价；这些条目明确显示为“仅折扣”，不会被伪造成结算单价。来源未提供的报价更新时间保持未知；导入时间不等于供应商报价更新时间。供应商及来源标签均未独立核验。

默认视图对有基础单价的条目按折扣试算，并清楚标示为计算结果；跨表折扣差异和单位不完整仍会展示。界云的金融智能体与金融数据工作表属于不同产品，不会混入 Token 报价。

## Features

- Search model, family, supplier and condition; filter category, family, platform, channel and currency.
- Base/discounted calculation, grouped price sorting, bookmarks, three-record comparison and CSV export.
- Source details with cache read/write components and workbook cell ranges.
- Validated JSON imports stored locally in the current browser. This is not server synchronization or automatic Feishu ingestion.

## Local preview

Serve the repository root with a static HTTP server, then open `/tokenprice/`. Do not open `index.html` through `file://`; quote loading uses `fetch`.

## Publishing

Only files in this directory are added to the existing GitHub Pages site. The root website's existing workflow publishes the repository on `main`. No credentials, source workbooks or contact details are bundled. `noindex` requests search engines not to index the page; the URL is publicly accessible and has no login gate.
