# Token Price

Static model supplier quote lookup at `/tokenprice/`. No build or external runtime dependencies.

## Data

`data/quotes.json` contains the supplied WeJoy workbook's `模型报价` sheet only. It preserves original prices, currencies, units, conditional tiers, cache components and discounts separately. The initial 63 records have no supplier-provided update timestamp. Import time is not quote update time. Supplier/source labels are not independently verified.

The default price view multiplies each available base price by its supplied discount and labels the result as a calculation. Cross-sheet discount differences and incomplete units remain visible. Outbound selling prices from other sheets are not mixed with this source quote list.

## Features

- Search model, family, supplier and condition; filter category, family, platform, channel and currency.
- Base/discounted calculation, grouped price sorting, bookmarks, three-record comparison and CSV export.
- Source details with cache read/write components and workbook cell ranges.
- Validated JSON imports stored locally in the current browser. This is not server synchronization or automatic Feishu ingestion.

## Local preview

Serve the repository root with a static HTTP server, then open `/tokenprice/`. Do not open `index.html` through `file://`; quote loading uses `fetch`.

## Publishing

Only files in this directory are added to the existing GitHub Pages site. The root website's existing workflow publishes the repository on `main`. No credentials, source workbooks or contact details are bundled. `noindex` requests search engines not to index the page; the URL is publicly accessible and has no login gate.
