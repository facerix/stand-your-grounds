# Facerix Template Guide

This template is based on common patterns extracted from multiple Facerix projects (brain-crack, crusader, cuisiner, longbox, personnel, superlatives, and yondr).

## Common Patterns Across All Projects

### 1. Progressive Web Apps (PWAs)

All projects are PWAs with:

- `site.webmanifest` for app metadata
- Service workers for offline support
- Installable on mobile/desktop

### 2. Vanilla JavaScript Architecture

- ES6 modules (`import`/`export`)
- No frameworks (React, Vue, etc.)
- Web Components for reusable UI elements
- Modern JavaScript features (classes, async/await, private fields)

### 3. Service Worker Pattern (Latest: Personnel/Brain Crack)

Three-file architecture:

- `sw.js` - Production service worker
- `sw-dev.js` - Development service worker (optional mock server)
- `sw-core.js` - Shared caching logic

Features:

- Multi-cache strategy (versioned cache + static cache)
- Cache-first with background refresh for HTML/CSS/JS
- Automatic version management
- Update notifications

### 4. Data Management Pattern

**DataStore.js** - Singleton EventTarget pattern:

- Manages app state in localStorage
- Emits "change" events with `changeType` (init, add, update, delete)
- Uses UUIDs (v4WithTimestamp) for unique IDs
- Private fields for encapsulation

### 5. Service Worker Management

**ServiceWorkerManager.js** - Singleton for SW lifecycle:

- Automatic dev/prod detection
- Update notification system
- Version checking
- Cache clearing utilities

### 6. DOM Utilities

**domUtils.js** - Helper functions:

- `h()` - Concise DOM element creation
- `jsx()` - Template literal helper
- `isDevelopmentMode()` - Environment detection
- `pluralize()`, `listify()`, etc.

### 7. Web Components

**UpdateNotification.js** - Standard component:

- Shadow DOM with scoped styles
- Handles service worker updates
- Shows update progress
- User can update now or later

### 8. CSS Patterns

- Modern CSS with nesting
- CSS custom properties (`:root`)
- Utility classes with `u-` prefix
- Responsive design (Bootstrap breakpoints)
- View transitions support

### 9. Development Tools

- **ESLint** - Code linting (Personnel pattern)
- **Prettier** - Code formatting
- **live-server** - Development server

## Customization Checklist

When starting a new project from this template:

### 1. Update package.json

- [ ] Change `name` field
- [ ] Update `description`
- [ ] Set initial `version` (1.0.0)

### 2. Update site.webmanifest

- [ ] Change `name` and `short_name`
- [ ] Update `description`
- [ ] Set `theme_color` and `background_color`
- [ ] Update `start_url` if needed

### 3. Update HTML files

- [ ] Change `<title>` tags
- [ ] Update meta descriptions
- [ ] Update canonical URLs
- [ ] Update Open Graph tags
- [ ] Replace "App Name" with your app name

### 4. Update Service Workers

- [ ] In `sw.js`: Change VERSION constant
- [ ] In `sw-dev.js`: Change VERSION constant
- [ ] In `sw-core.js`: Update `CacheConfig.create()` prefix (e.g., 'myapp-cache-')
- [ ] In `sw-core.js`: Update `getCoreResources()` with your app's files
- [ ] In `sw-core.js`: Update `getStaticAssets()` with your app's assets

### 5. Update ServiceWorkerManager.js

- [ ] Change log prefix from `[App]` to your app name

### 6. Update DataStore.js

- [ ] Change localStorage key from 'items' to your data type
- [ ] Customize data structure for your needs
- [ ] Add any app-specific methods

### 7. Update main.css

- [ ] Set `--accent-color` in `:root`
- [ ] Customize colors and fonts
- [ ] Add app-specific styles

### 8. Create Icons

- [ ] Generate PWA icons (192x192, 512x512)
- [ ] Create maskable and rounded versions
- [ ] Replace `icon.svg` placeholder
- [ ] Generate `favicon.ico`

### 9. Update Documentation

- [ ] Customize README.md
- [ ] Update AGENTS.md with app-specific patterns
- [ ] Update .cursorrules if needed

### 10. Initialize Git

```bash
git init
git add .
git commit -m "Initial commit from facerix-template"
```

## Architecture Decisions

### Why Vanilla JavaScript?

- No build step required
- Faster development iteration
- Smaller bundle size
- Direct browser APIs
- No framework lock-in

### Why localStorage?

- Simple API
- Synchronous access
- Sufficient for most apps
- Can upgrade to IndexedDB later if needed

### Why Service Workers?

- Offline support
- Fast loading
- App-like experience
- Background updates

### Why Web Components?

- Native browser support
- Scoped styles (Shadow DOM)
- Reusable across projects
- No framework needed

## Common Patterns from Source Projects

### From Personnel (Most Complete)

- ESLint + Prettier configuration
- Comprehensive ServiceWorkerManager
- Multi-cache service worker strategy
- Update notification with progress

### From Brain Crack

- Sync capabilities (optional)
- Mock server in sw-dev.js (optional)
- View transitions

### From Yondr

- Clean, minimal structure
- Custom fonts integration

### From Longbox/Superlatives

- Simple service worker pattern (older style)
- Touch events utilities (optional)

## Optional Enhancements

These patterns exist in some projects but aren't included in the base template:

1. **Sync/Backend Support** (Brain Crack pattern)
   - API clients for collections/records
   - Mock server in sw-dev.js
   - Sync queue and conflict resolution

2. **Touch Events** (Longbox/Superlatives)
   - Swipe gestures
   - Touch-friendly interactions

3. **IndexedDB** (Personnel)
   - MetadataStore pattern
   - For larger datasets

4. **Custom Fonts** (Brain Crack, Yondr)
   - Font files in `/fonts/`
   - Custom font-face declarations

5. **Multiple Pages/Routes** (Personnel)
   - Subdirectories for different sections
   - Shared components

## Version History

- **1.0.0** (2026-03-17) - Initial template based on Personnel and Brain Crack patterns
