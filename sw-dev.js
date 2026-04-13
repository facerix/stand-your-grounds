// Service Worker for App - Development Version
const VERSION = "1.1.1-dev";
importScripts(`/sw-core.js?v=${VERSION}`);

const cacheConfig = CacheConfig.create(VERSION);
const CACHE_VERSION = cacheConfig.version;
const CACHE_NAMES = cacheConfig;
const CACHE_PREFIX = cacheConfig.prefix;
const LOG_PREFIX = `[App ${CACHE_VERSION} - Dev]`;

const coreResources = CacheConfig.getCoreResources();
const staticAssets = CacheConfig.getStaticAssets();

/**
 * @param {URL} url
 * @returns {boolean}
 */
function shouldBypassServiceWorkerCache(url) {
  const host = url.hostname;
  return (
    host === "maps.googleapis.com" ||
    host === "maps.gstatic.com" ||
    host === "places.googleapis.com"
  );
}

console.log(`${LOG_PREFIX} Configuration loaded:`, {
  version: CACHE_VERSION,
  versionedCache: CACHE_NAMES.name,
  staticCache: CACHE_NAMES.staticName,
  coreResources: coreResources.length,
  staticAssets: staticAssets.length,
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    ServiceWorkerCore.handleInstall(
      CACHE_NAMES,
      coreResources,
      staticAssets,
      LOG_PREFIX,
      false,
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    ServiceWorkerCore.handleActivate(CACHE_NAMES, CACHE_PREFIX, LOG_PREFIX),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    event.respondWith(fetch(request));
    return;
  }

  const url = new URL(request.url);

  if (shouldBypassServiceWorkerCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname === "/data/shops.json") {
    event.respondWith(
      ServiceWorkerCore.networkFirst(
        request,
        CACHE_NAMES.name,
        LOG_PREFIX,
      ).catch((error) => {
        console.error(`${LOG_PREFIX} shops.json fetch failed:`, error);
        throw error;
      }),
    );
    return;
  }

  event.respondWith(
    // Network-first for HTML/CSS/JS so style and script edits show without hard refresh
    ServiceWorkerCore.handleFetch(
      request,
      CACHE_NAMES,
      LOG_PREFIX,
      false,
      true,
    ).catch((error) => {
      console.error(`${LOG_PREFIX} Fetch failed:`, error);
      if (request.mode === "navigate") {
        return caches.match("/");
      }
      throw error;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    event.waitUntil(
      ServiceWorkerCore.handleMessage(
        event,
        CACHE_NAMES.name,
        CACHE_VERSION,
        LOG_PREFIX,
      ),
    );
  } else {
    ServiceWorkerCore.handleMessage(
      event,
      CACHE_NAMES.name,
      CACHE_VERSION,
      LOG_PREFIX,
    );
  }
});
