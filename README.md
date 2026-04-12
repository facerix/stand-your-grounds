# Stand Your Grounds

Progressive Web App: a **read-only Bay Area ethical coffee map** built on the Facerix vanilla PWA template. Curated shop data in JSON is plotted on **Google Maps**; tapping a pin opens a custom panel with your copy plus **Google Place Details** when a `placeId` is set.

- **No frameworks** — ES modules, Web Components for shell UI, `h()` from `src/domUtils.js` for map popup DOM
- **DataStore** — Still initialized for future phase (favorites / notes); **shop locations are not** stored in DataStore (see [`data/shops.json`](data/shops.json))
- **Service worker** — App shell + map modules precached; `/data/shops.json` is **network-first**; Google Maps/Places requests bypass SW caching

## Setup

1. `npm install`
2. Copy `config.example.json` to **`config.json`** (gitignored) and set `googleMapsApiKey` to a browser key with **Maps JavaScript API** and **Places API** enabled. Restrict the key by HTTP referrer in Google Cloud Console.
3. `npm start` → open http://localhost:8080

## Curated shops schema (`data/shops.json`)

JSON **array** of objects. Required for each shop:

| Field  | Type   | Description                                        |
| ------ | ------ | -------------------------------------------------- |
| `id`   | string | Stable id (e.g. for future favorites in DataStore) |
| `name` | string | Title shown in popup                               |
| `lat`  | number | Latitude                                           |
| `lng`  | number | Longitude                                          |

Optional:

| Field     | Type     | Description                                           |
| --------- | -------- | ----------------------------------------------------- |
| `placeId` | string   | Google Place ID — enables Place Details in the popup  |
| `summary` | string   | Your editorial blurb                                  |
| `values`  | string[] | Tags (e.g. `fair_trade`, `b_corp`) for future filters |
| `links`   | object[] | `{ "label": "…", "url": "https://…" }`                |

Shops missing `placeId` still appear on the map; the Google block is omitted from the popup.

## Commands

- **Start server**: `npm start` (live-server at http://localhost:8080)
- **Lint**: `npm run lint`
- **Format**: `npm run format`

## Project structure (map-related)

```
data/shops.json           # Curated shops (committed)
config.example.json       # Template for config.json
src/maps/
  loadMapsScript.js       # Google Maps JS + places library
  shopMap.js              # Map, markers, click → popup
  shopPopup.js            # Hybrid curated + Google UI
  placeDetailsCache.js    # In-memory Place Details cache
```

## Credits

Based on the Facerix PWA template by [Rylee Corradini](https://www.facerix.com/about).
