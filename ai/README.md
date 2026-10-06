# Geek Nexus AI entry

A static public-information entry for the existing GitHub Pages website.

## Architecture

- `public-info.json` is the canonical content source. Edit the six categories and source references here.
- `index.template.html` is the page layout. `ai.css` and `ai.js` are scoped assets. The page remains readable without JavaScript; JavaScript only copies the sample prompt.
- `python3 tools/build_ai.py` generates `ai/index.html`, `ai/public-info.md`, and root `llms.txt` from the canonical source.
- Generated files are committed so the existing static Pages deployment does not need an extra build step.
- Source `reviewed_at` is a content-review date, not a live status or availability timestamp. Update it only after reviewing the official source pages again.
- `source_commit` identifies the site snapshot reviewed for this edition, not the later commit which publishes these generated documents.
- The service worker bypasses its cache for machine-readable facts so it cannot silently return an outdated stored copy. Documents still carry their explicit review date.

## Checks

Run from the repository root:

```sh
python3 tools/build_ai.py --check
python3 tests/test_ai.py
node tests/ai-interactions.cjs
node --check ai/ai.js
node --check service-worker.js
```

Optional browser regression checks (requires installed Playwright and Chromium):

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# In another terminal:
node tests/ai-browser.cjs
```

Browser checks save screenshots in the OS temporary directory, not the public site.

## Scope

This entry provides public facts and reading guidance. It does not run an MCP server, ship an executable Skill, submit enquiries, access private systems, book appointments, quote prices, sign agreements, or process payments. There is no secret, API key or personal-data submission form. The email link only opens the visitor's email client.

`llms.txt` is a community reading convention, not a guarantee of discovery or search placement. JSON-LD describes a public webpage and the existing organization; it does not create an action API.

Preserve the distinction between published capability descriptions and confirmed project deliverables. Never derive fixed pricing, inventory, benchmarks, current partnerships, customer wins, guaranteed full-offline operation, or office opening hours from illustrative content. The FAQ is an editorial summary of public pages, not a claim that each answer previously existed verbatim.
