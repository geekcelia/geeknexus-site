# IP collectibles page

- Chinese: `/goods/`; English: `/en/goods/`.
- Standalone static showcase, not a shop. No orders, payments, user accounts or visitor data collection.
- Existing home layout preserved; only localized footer links were added.
- Existing brand mark and character art are retained. Design variance 5, motion 2, density 3: cool neutral surfaces, blue accent, native CSS, system fonts, no new packages.
- Update locale copy in `tools/build-goods.py`, then run `python3 tools/build-goods.py` and `python3 tests/test_goods.py`.
- Product concepts are not finalized specifications. Keep the unavailable-for-sale notice until actual product details and purchase flow are approved.
- The generated hero is an AI concept, visibly labeled in both languages. Source character: `assets/geekcelia-assistant.png`. Source prompt: landscape editorial product concept photograph; exact bee-fairy artwork printed on a compact circular electronic badge and two character cards; cool silver-blue studio surface; no text or prices. Created with the built-in image tool; distributed as optimized WebP in `goods/assets/`.
- To add products, update the locale content and builder markup. Filters match the static `data-product` values. Dialog uses textContent only.
- Meta CSP restricts resources to same-origin scripts/styles/images and disables network connections, form posts, object embeds and base URL changes. It is not a substitute for hosting security headers or a broader site audit.

## Verification

Desktop/mobile layouts, category filters, dialog open/Escape close, translated page and dark mode tested in browser. Static tests validate routes, images, canonical links and script safety invariants. Codex Security diff scan was attempted but the plugin rejected the local Git worktree as unresolved; no completed plugin scan is claimed. Lighthouse was not available locally.
