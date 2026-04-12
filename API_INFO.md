# Google Maps Platform — API & pricing notes

Summary of how **billing**, **Dynamic Maps**, **Static Maps**, and the **Map Tiles API** relate to a typical web app. Official sources are linked throughout.

---

## Pricing model (pay-as-you-go)

- **[Global price list](https://developers.google.com/maps/billing-and-pricing/pricing)** — per-SKU prices (USD per 1,000 billable events), free monthly caps, and volume tiers.
- **[Billing & pricing overview](https://developers.google.com/maps/billing-and-pricing/overview)** — free usage caps, volume discounts, Essentials / Pro / Enterprise categories, subscriptions vs pay-as-you-go.
- **[SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details)** — what counts as one billable event per product (map load, tile request, Places request, etc.).

**In practice:**

- Each **SKU** (row on the price list) has its own **monthly free cap** and, above that, tiered cost per 1,000 events.
- Usage **aggregates** across **all projects** on the **same billing account** for the month.
- **Deploying to a host** does not change pricing: the same API key and the same user-driven API usage produce the same billable events as on `localhost`. Restrict the key (e.g. HTTP referrers) to limit abuse.

### March 2025 change: free caps vs. $200 credit

- **[March 1, 2025 pricing changes](https://developers.google.com/maps/billing-and-pricing/march-2025)** — Google **replaced** the recurring **$200/month credit** with **per-SKU monthly free usage thresholds** (and adjusted volume discounts). Older articles that only mention “$200 free” may be outdated unless your account has a special agreement.

**Estimating cost:** [Maps Platform pricing calculator](https://mapsplatform.google.com/pricing/).

---

## Dynamic Maps (Maps JavaScript API) — “full” interactive map

- **Docs:** [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- **Billing:** [Dynamic Maps SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#dynamic-maps-ess-sku) — billable event is a **successful map load**.

**Navigable worldwide vs. geofenced (e.g. Bay Area only):**  
Restricting the camera (`restriction`, bounds, max zoom) is **client-side UX only**. It does **not** switch to a cheaper “regional” SKU for the base map. For the standard embedded map, cost is driven by **map loads** (and separate SKUs for anything else you call, e.g. Places, Geocoding, Street View). On native Maps SDKs, Google states that **panning/zooming does not generate additional map loads** for that SKU; the model is **load-based**, not “pay per square mile explored.”

---

## Static Maps API

- **Docs:** [Static Maps API](https://developers.google.com/maps/documentation/maps-static)
- **Billing:** [Static Maps SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#static-maps-ess-sku) — billable event is a **successful map load** (one composed image per request).

**Zoom / pan:**  
One URL returns **one raster image** for a fixed center, zoom, and size. Users cannot get new Google map detail by zooming **that single image** without either:

- **New Static Maps requests** (each success typically another billable load), or  
- **Scaling the same image in the browser** (blurry; not new map data).

---

## Map Tiles API

- **Docs:** [Map Tiles API overview](https://developers.google.com/maps/documentation/tile/overview)
- **Billing (examples):** [Map Tiles API: 2D Map Tiles](https://developers.google.com/maps/billing-and-pricing/sku-details#map-tiles-2d-ess-sku) — billable event is a **request that returns a 2D map tile**; Street View and 3D tiles have their own SKUs on the same overview / SKU pages.

**What it is:**  
Direct access to **tiles** (roadmap, satellite, terrain, Street View, photorealistic 3D) so **you** build the map experience (custom clients, games, non-web stacks, immersive 2D/3D). Zoom/pan implies **requesting more tiles**; billing is **per tile** (and related requests), not the single “Dynamic Maps map load” model of the embedded JS `Map`.

**Policies:** [Map Tiles API policies](https://developers.google.com/maps/documentation/tile/policies)

---

## Quick comparison

| Approach | What you get | Typical billing shape |
|----------|----------------|------------------------|
| **Maps JavaScript API** (`Map`) | Full interactive widget | **Dynamic Maps:** per **successful map load** ([SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details#dynamic-maps-ess-sku)) |
| **Static Maps** | One image per request | **Static Maps:** per **successful load** ([SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details#static-maps-ess-sku)) |
| **Map Tiles API** | Raw tiles; you render | **Per tile** (2D) and related SKUs ([SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details#map-tiles-2d-ess-sku)) |

---

## Project plan: keys, config, quotas, and errors

Validated for this repo (`config.json` loaded via `fetch("/config.json")` in `index.js`; `config.json` is gitignored). **[API key best practices](https://developers.google.com/maps/api-security-best-practices)** (restrictions, rotation).

| # | Plan | Valid? | Notes |
|---|------|--------|--------|
| 1 | **Two keys**, both **HTTP referrer–restricted**: one for **local dev** (`http://localhost:*` / your dev patterns), one for the **deployed site** (`https://yourdomain.com/*`, etc.). | **Yes** | Strong separation: rotate or revoke dev without touching prod; align each key’s **API restrictions** to only the Maps/Places APIs you use. |
| 2 | Keys live in **`config.json`**, **gitignored**, not committed. | **Yes** | Keeps secrets out of git. For production, deploy a **server-side** `config.json` (or equivalent) that is **never** the localhost-only key. |
| 3 | Production key is **only usable on your site**, so a hostile user **cannot use it elsewhere**. | **Mostly yes** | Referrer restriction blocks use from **other origins** (their domain, random apps). It does **not** hide the key: visitors can still see it (e.g. `/config.json`, DevTools). Anyone may consume **your** quota **while using your deployed site**—that is expected. **Localhost keys** match **any** `localhost` origin, so treat a leaked dev key as usable by others on their own machine; keep dev keys out of public repos and chat. |
| 4 | **Usage caps** in Google Cloud + app shows a **friendly error** when quota is exceeded. | **Partly—clarify** | Set **quotas** in **[Google Cloud Console](https://console.cloud.google.com/)** (APIs & Services → select API → Quotas) so Google **rejects** traffic after the cap—see **[Managing quotas](https://cloud.google.com/docs/quotas/view-manage)**. That is **not** the same as a **monthly billing / free-tier dollar cap**; overage billing vs hard quota depends on what you configure. **Detection:** handle **Maps script load failure** (e.g. `script.onerror` / failed bootstrap) and **runtime errors** from Places or map init where Google returns quota-related failures—messages vary, so test by lowering a quota in a test project. A single friendly string may not cover every failure mode. |

**Summary:** Items 1–2 are sound. Item 3 is correct for **cross-site** abuse if referrer rules are tight; it does not make the key secret or stop usage **on your own site**. Item 4 is sound if you mean **Cloud quota caps** plus **defensive error handling** in the app, with the limits above.

---

## Disclaimer

Pricing, caps, and product names change. Always confirm against the **current** [price list](https://developers.google.com/maps/billing-and-pricing/pricing) and [SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details) for your billing account and region.
