<div align="center">

### 🛡️ uOrigin Advanced Shield

Ad-blocking Chrome extension paired with a Vercel-ready landing site.

</div>

## Project Overview

- `extension/` — Manifest v3 Chrome extension that mirrors the core feature set of uBlock Origin:
  - Dynamic filter compiler using EasyList, EasyPrivacy, and uBlock community rules
  - Declarative Net Request engine with global on/off toggle and custom rule injection
  - Popup dashboard showing blocked-request telemetry and instant refresh actions
  - Options page for subscription management, custom expressions, and manual sync
- `web/` — Next.js 16 marketing site with downloadable build and installation guide
  - Static archive served from `public/uorigin-advanced-shield.zip`
  - Deployment-ready for Vercel (App Router, static prerender)
- `scripts/package_extension.py` — Utility to rebuild the extension archive at any time

## Local Development

```bash
# 1. package the Chrome extension (outputs to public/)
python3 scripts/package_extension.py

# 2. run the Next.js site
cd web
npm install
npm run dev
```

## Quality Checks

```bash
cd web
npm run lint
npm run build
```

Both commands must succeed before pushing or deploying to Vercel.

## Loading the Extension in Chrome

1. Run `python3 scripts/package_extension.py` (if you’ve changed any files).
2. Extract `public/uorigin-advanced-shield.zip` to a convenient directory.
3. Visit `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
4. Select the unzipped folder. Pin the “uOrigin Advanced Shield” icon for quick access.

## Feature Highlights

- Automated filter refresh every six hours via background service worker + alarms.
- Statistics persisted in `chrome.storage.local`, displayed in the popup HUD.
- Robust custom rule management (block or allow) through the options page.
- Graceful error handling with finer-grained UI feedback for failed list fetches.

## Packaging Script

The repo ships with the prebuilt archive, but you can regenerate it anytime:

```bash
python3 scripts/package_extension.py \
  --source extension \
  --output public/uorigin-advanced-shield.zip
```

This script uses Python’s standard library only, so no extra dependencies are required.

## Deployment

Execute from the repository root (after a successful build):

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-9f204897
```

After deployment, verify the production URL:

```bash
curl https://agentic-9f204897.vercel.app
```

Repeat the verification up to three times if DNS propagation lags.

---

Built for high-performance browsing with complete user control. Enjoy a cleaner web. 🛡️
