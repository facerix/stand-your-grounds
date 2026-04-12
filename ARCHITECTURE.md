# Architecture Overview

Visual guide to the Facerix template architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Main Thread                             │  │
│  │                                                            │  │
│  │  ┌──────────────┐      ┌──────────────┐                  │  │
│  │  │  index.html  │      │  about.html  │                  │  │
│  │  │  index.js    │      │  about.js    │                  │  │
│  │  └──────┬───────┘      └──────┬───────┘                  │  │
│  │         │                     │                           │  │
│  │         └─────────┬───────────┘                           │  │
│  │                   │                                        │  │
│  │         ┌─────────▼──────────┐                            │  │
│  │         │  ServiceWorkerMgr  │                            │  │
│  │         │   (Singleton)      │                            │  │
│  │         └─────────┬──────────┘                            │  │
│  │                   │                                        │  │
│  │         ┌─────────▼──────────┐                            │  │
│  │         │     DataStore      │◄────┐                      │  │
│  │         │   (Singleton)      │     │                      │  │
│  │         └─────────┬──────────┘     │                      │  │
│  │                   │                │                      │  │
│  │         ┌─────────▼──────────┐     │                      │  │
│  │         │   localStorage     │     │                      │  │
│  │         └────────────────────┘     │                      │  │
│  │                                    │                      │  │
│  │         ┌──────────────────────────┴──┐                   │  │
│  │         │  UpdateNotification         │                   │  │
│  │         │  (Web Component)            │                   │  │
│  │         └─────────────────────────────┘                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Service Worker Thread                     │  │
│  │                                                            │  │
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐        │  │
│  │  │  sw.js   │─────►│ sw-core  │◄─────│ sw-dev.js│        │  │
│  │  │  (prod)  │      │          │      │  (dev)   │        │  │
│  │  └──────────┘      └────┬─────┘      └──────────┘        │  │
│  │                          │                                 │  │
│  │                ┌─────────▼──────────┐                     │  │
│  │                │  CacheConfig       │                     │  │
│  │                │  ServiceWorkerCore │                     │  │
│  │                └─────────┬──────────┘                     │  │
│  │                          │                                 │  │
│  │                ┌─────────▼──────────┐                     │  │
│  │                │   Cache Storage    │                     │  │
│  │                │  - Versioned cache │                     │  │
│  │                │  - Static cache    │                     │  │
│  │                │  - Runtime cache   │                     │  │
│  │                └────────────────────┘                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Application Initialization

```
User loads page
      ↓
index.html loads
      ↓
index.js executes
      ↓
ServiceWorkerManager.register()
      ↓
Service Worker activates
      ↓
DataStore.init()
      ↓
Load data from localStorage
      ↓
Emit 'init' event
      ↓
UI renders
```

### 2. Data Update Flow

```
User action (add/update/delete)
      ↓
Call DataStore method
      ↓
Update in-memory data
      ↓
Save to localStorage
      ↓
Emit 'change' event
      ↓
Event listeners update UI
```

### 3. Service Worker Update Flow

```
New version deployed
      ↓
SW detects update
      ↓
Downloads new SW
      ↓
SW enters 'waiting' state
      ↓
ServiceWorkerManager detects
      ↓
Dispatch 'sw-update-available'
      ↓
UpdateNotification shows UI
      ↓
User clicks "Update Now"
      ↓
Send SKIP_WAITING message
      ↓
SW activates
      ↓
Page reloads
```

## Component Hierarchy

```
index.html
├── <header>
│   ├── <img> (logo)
│   └── <h1> (title)
├── <main>
│   └── (app content)
├── <footer>
│   └── <a> (attribution)
└── <update-notification>
    └── Shadow DOM
        ├── <style>
        └── <div.update-notification>
            ├── <strong> (title)
            ├── <p> (message)
            ├── <div.update-actions>
            │   ├── <button.update-now>
            │   └── <button.update-later>
            └── <div.updating-state>
                ├── <div.spinner>
                └── <p.update-status>
```

## Module Dependencies

```
index.js
├── imports ServiceWorkerManager
│   └── imports domUtils (isDevelopmentMode)
└── imports UpdateNotification (Web Component)

about.js
├── imports ServiceWorkerManager
└── imports UpdateNotification

DataStore.js
└── imports uuid (v4WithTimestamp)

sw.js / sw-dev.js
└── importScripts sw-core.js
    ├── CacheConfig
    │   ├── create()
    │   ├── getCoreResources()
    │   └── getStaticAssets()
    └── ServiceWorkerCore
        ├── handleInstall()
        ├── handleActivate()
        ├── handleFetch()
        └── handleMessage()
```

## Class Relationships

```
┌─────────────────────┐
│   EventTarget       │ (Browser API)
└──────────▲──────────┘
           │
           │ extends
           │
┌──────────┴──────────┐
│    DataStore        │
│   (Singleton)       │
│                     │
│  #items: Array      │
│  #itemsById: Map    │
│                     │
│  + init()           │
│  + addItem()        │
│  + updateItem()     │
│  + deleteItem()     │
└─────────────────────┘

┌─────────────────────┐
│  HTMLElement        │ (Browser API)
└──────────▲──────────┘
           │
           │ extends
           │
┌──────────┴──────────┐
│ UpdateNotification  │
│  (Web Component)    │
│                     │
│  + show()           │
│  + hide()           │
│  + handleUpdateNow()│
└─────────────────────┘

┌─────────────────────┐
│ ServiceWorkerMgr    │
│   (Singleton)       │
│                     │
│  #registration      │
│  #isRegistered      │
│                     │
│  + register()       │
│  + skipWaiting()    │
│  + getVersion()     │
└─────────────────────┘
```

## Caching Strategy

```
Request arrives at Service Worker
         │
         ▼
    Is it GET?  ──No──► Pass through
         │
        Yes
         │
         ▼
  Is it static asset? ──Yes──► Cache-first
  (png, svg, fonts)              (static cache)
         │
         No
         │
         ▼
  Is it HTML/CSS/JS? ──Yes──► Cache-first + Background Refresh
                               (versioned cache)
         │
         No
         │
         ▼
  Cache-first (versioned cache)
```

## Event System

```
DataStore Events:
  ├── 'change'
  │   └── detail: { changeType, items, affectedRecords }
  │       └── changeType: 'init' | 'add' | 'update' | 'delete'

Window Events:
  ├── 'sw-update-available'
  │   └── detail: { registration, pendingWorker }
  │
  └── 'sw-update-progress'
      └── detail: { status }

UpdateNotification Events:
  ├── 'update-notification-shown'
  ├── 'update-notification-hidden'
  ├── 'update-accepted'
  └── 'update-dismissed'
```

## Lifecycle

### Application Lifecycle

```
Page Load
  ↓
Parse HTML
  ↓
Load CSS (main.css)
  ↓
Load JS modules (index.js)
  ↓
Wait for custom elements
  ↓
Register Service Worker
  ↓
Initialize DataStore
  ↓
Render UI
  ↓
App Ready
```

### Service Worker Lifecycle

```
navigator.serviceWorker.register()
  ↓
SW downloads
  ↓
'install' event
  ↓
Cache resources
  ↓
'activate' event
  ↓
Clean old caches
  ↓
Claim clients
  ↓
'fetch' events
  ↓
Serve from cache/network
```

### Update Lifecycle

```
New SW version available
  ↓
SW downloads in background
  ↓
'updatefound' event
  ↓
New SW enters 'waiting' state
  ↓
ServiceWorkerManager detects
  ↓
Dispatch custom event
  ↓
UpdateNotification shows
  ↓
User clicks "Update Now"
  ↓
Send SKIP_WAITING message
  ↓
SW activates
  ↓
'controllerchange' event
  ↓
Page reloads
  ↓
New version active
```

## Storage Architecture

```
localStorage
├── 'items' ──────────► DataStore data (JSON array)
└── (app-specific) ───► Additional app data

Cache Storage (Service Worker)
├── 'app-cache-v1.0.0' ────► Versioned cache
│   ├── /
│   ├── /index.html
│   ├── /index.js
│   ├── /about.html
│   ├── /about.js
│   ├── /main.css
│   └── /site.webmanifest
│
└── 'app-cache-static' ────► Static cache
    ├── /apple-touch-icon.png
    ├── /favicon-96x96.png
    ├── /favicon.ico'
    ├── /favicon.svg
    ├── /web-app-manifest-192x192.png
    └── /web-app-manifest-512x512.png
```

## Request Flow

```
Browser Request
      ↓
Service Worker intercepts
      ↓
   Check cache
      ↓
   ┌──────┴──────┐
   │             │
Found         Not Found
   │             │
   ▼             ▼
Return       Fetch from
cached       network
response        │
   │            ▼
   │         Cache
   │        response
   │            │
   └────┬───────┘
        │
        ▼
   Return to
    browser
```

## Development vs Production

### Development Mode (localhost)

- Uses `sw-dev.js`
- Faster updates
- More logging
- Optional mock server
- Version: `x.x.x-dev`

### Production Mode (deployed)

- Uses `sw.js`
- Optimized caching
- Less logging
- No mock server
- Version: `x.x.x`

**Detection**: `isDevelopmentMode()` in `domUtils.js`

```javascript
export const isDevelopmentMode = () => {
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname.includes("local") ||
    location.search.includes("dev=true")
  );
};
```

## Singleton Pattern

Both DataStore and ServiceWorkerManager use the singleton pattern:

```javascript
let instance;
class MyClass {
  constructor() {
    if (instance) {
      throw new Error("New instance cannot be created!!");
    }
    instance = this;
  }
}

const singleton = Object.freeze(new MyClass());
export default singleton;
```

**Benefits**:

- Single source of truth
- Shared state across modules
- Prevents accidental multiple instances
- Clean import syntax

## Web Component Pattern

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.cleanupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>/* scoped styles */</style>
      <div>/* content */</div>
    `;
  }
}

customElements.define("my-component", MyComponent);
```

**Benefits**:

- Encapsulated styles (Shadow DOM)
- Reusable across pages
- Standard browser API
- No framework needed

## CSS Architecture

```
main.css (Global)
├── :root (CSS variables)
├── Reset styles (box-sizing)
├── Base styles (body, typography)
├── Layout (header, main, footer)
├── Component styles (buttons, forms)
├── Utility classes (.u-*)
├── Responsive media queries
└── View transitions

Web Component Styles (Scoped)
└── <style> in Shadow DOM
    ├── Component-specific styles
    └── No conflicts with global styles
```

## File Naming Conventions

| Type               | Convention  | Examples                        |
| ------------------ | ----------- | ------------------------------- |
| HTML files         | lowercase   | index.html, about.html          |
| JS modules         | camelCase   | domUtils.js, uuid.js            |
| Classes            | PascalCase  | DataStore, ServiceWorkerManager |
| Components         | PascalCase  | UpdateNotification.js           |
| Web Component tags | kebab-case  | `<update-notification>`         |
| CSS files          | lowercase   | main.css                        |
| Utility classes    | u-prefix    | .u-flex, .u-hidden              |
| Private fields     | #prefix     | #items, #isRegistered           |
| Constants          | UPPER_SNAKE | CACHE_VERSION, LOG_PREFIX       |

## Code Organization Principles

### 1. Separation of Concerns

- **Presentation** - HTML + CSS
- **Behavior** - JavaScript modules
- **Data** - DataStore
- **Offline** - Service Worker
- **Components** - Web Components

### 2. Single Responsibility

- Each module has one clear purpose
- DataStore manages data only
- ServiceWorkerManager manages SW only
- Components manage their own UI

### 3. Dependency Injection

- Pass dependencies explicitly
- No hidden global dependencies
- Clear module boundaries

### 4. Event-Driven

- DataStore emits events
- Components listen for events
- Loose coupling between modules

### 5. Progressive Enhancement

- Works without JavaScript (basic HTML)
- Works without Service Worker (online only)
- Enhanced with PWA features

## Performance Optimizations

### Service Worker

- Multi-cache strategy (versioned + static)
- Cache-first for instant loading
- Background refresh for updates
- Static assets cached indefinitely

### JavaScript

- ES6 modules (native browser loading)
- No build step (faster development)
- Minimal dependencies
- Lazy loading possible

### CSS

- Single stylesheet (main.css)
- Modern features (nesting, custom properties)
- Minimal specificity
- Scoped component styles

### Data

- localStorage (synchronous, fast)
- In-memory Map for lookups
- UUID-based IDs (no collisions)

## Security Model

### Same-Origin Policy

- Service Worker scoped to origin
- No cross-origin caching
- HTTPS required for SW

### Data Privacy

- All data stored locally
- No server communication (by default)
- User controls all data

### No Authentication

- Client-side only
- Add backend sync if needed (Brain Crack pattern)

## Extensibility Points

### 1. Add Backend Sync

Follow Brain Crack pattern:

- Add API clients
- Extend DataStore with sync methods
- Add mock server to sw-dev.js

### 2. Add IndexedDB

Follow Personnel pattern:

- Create MetadataStore.js
- Use for large datasets
- Keep localStorage for simple data

### 3. Add Routing

Options:

- Hash routing (`#/page`)
- URL parameters (`?page=name`)
- History API (requires server config)

### 4. Add Build Step

Optional:

- Bundler (esbuild, rollup)
- TypeScript
- CSS preprocessing
- Minification

### 5. Add Testing

Options:

- Jest for unit tests
- Playwright for E2E tests
- Web Test Runner

---

**Last Updated**: March 17, 2026  
**Template Version**: 1.0.0
