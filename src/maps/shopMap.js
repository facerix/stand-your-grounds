import { h } from "/src/domUtils.js";
import { loadMapsScript } from "/src/maps/loadMapsScript.js";
import { PlaceDetailsCache } from "/src/maps/placeDetailsCache.js";
import { hideShopPopup, openShopPopup } from "/src/maps/shopPopup.js";
import DataStore from "/src/DataStore.js";

const DEFAULT_CENTER = { lat: 37.75, lng: -122.35 };
const DEFAULT_ZOOM = 10;
const NEARBY_ZOOM = 16;
const GEO_TIMEOUT_MS = 12_000;
/** PinElement scale; default (1) is tight on touch screens — ~1.5 tracks WCAG ~44px targets. */
const SHOP_MARKER_PIN_SCALE = 1.5;

/**
 * @param {GeolocationPositionError} err
 * @returns {string}
 */
function geolocationErrorMessage(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. Allow location for this site to see what’s nearby.";
    case err.POSITION_UNAVAILABLE:
      return "Your position could not be determined. Try again in a moment.";
    case err.TIMEOUT:
      return "Location request timed out. Try again.";
    default:
      return "Could not get your location. Try again.";
  }
}

/**
 * @param {unknown} data
 * @returns {object[]}
 */
function validateShops(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(
    (s) =>
      s &&
      typeof s === "object" &&
      typeof s.id === "string" &&
      typeof s.name === "string" &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng),
  );
}

/**
 * @param {object} options
 * @param {string} options.apiKey
 */
export async function initShopMap({ apiKey }) {
  const mapEl = document.getElementById("map");
  const popupEl = document.getElementById("shop-popup");
  if (!mapEl || !(mapEl instanceof HTMLElement)) {
    throw new Error("#map element missing");
  }
  if (!popupEl || !(popupEl instanceof HTMLElement)) {
    throw new Error("#shop-popup element missing");
  }

  const mapApp = mapEl.parentElement;
  if (!mapApp) {
    throw new Error("#map has no parent");
  }
  const mapShell = h("div", { className: "map-app__map-shell" });
  mapApp.insertBefore(mapShell, mapEl);
  mapShell.appendChild(mapEl);

  const shopsRes = await fetch("/data/shops.json");
  if (!shopsRes.ok) {
    throw new Error(`Failed to load shops (${shopsRes.status})`);
  }
  const shops = validateShops(await shopsRes.json());

  await loadMapsScript(apiKey);

  const map = new google.maps.Map(mapEl, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapId: "DEMO_MAP_ID",
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const placeCache = new PlaceDetailsCache();

  if (shops.length === 1) {
    const s = shops[0];
    map.setCenter({ lat: s.lat, lng: s.lng });
    map.setZoom(14);
  } else if (shops.length > 1) {
    const bounds = new google.maps.LatLngBounds();
    shops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    map.fitBounds(bounds, { top: 56, right: 48, bottom: 160, left: 48 });
  }

  /** @type {Map<string, google.maps.marker.AdvancedMarkerElement>} */
  const markersByShopId = new Map();

  shops.forEach((shop) => {
    const pin = new google.maps.marker.PinElement({
      background: "#b4532a",
      borderColor: "#7a3519",
      glyphColor: "#fff5e6",
      scale: SHOP_MARKER_PIN_SCALE,
    });
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: shop.lat, lng: shop.lng },
      content: pin.element,
      title: shop.name,
      gmpClickable: true,
    });
    marker.addEventListener("gmp-click", () => {
      void openShopPopup({ container: popupEl, shop, placeCache });
    });
    markersByShopId.set(shop.id, marker);
  });

  let showOnlyFavorites = false;

  function updateMarkerVisibility() {
    const favoriteIds = new Set(DataStore.favoriteShopIds);
    markersByShopId.forEach((marker, shopId) => {
      if (showOnlyFavorites) {
        marker.map = favoriteIds.has(shopId) ? map : null;
      } else {
        marker.map = map;
      }
    });
  }

  DataStore.addEventListener("favoritesChange", () => {
    if (showOnlyFavorites) {
      updateMarkerVisibility();
    }
  });

  const favoritesCheckbox = document.getElementById("map-favorites-only");
  if (favoritesCheckbox instanceof HTMLInputElement) {
    favoritesCheckbox.addEventListener("change", () => {
      showOnlyFavorites = favoritesCheckbox.checked;
      updateMarkerVisibility();
      hideShopPopup(popupEl);
    });
  }

  /** @type {google.maps.marker.AdvancedMarkerElement | null} */
  let userMarker = null;

  /**
   * @param {{ lat: number, lng: number }} latLng
   */
  function showUserNearby(latLng) {
    map.panTo(latLng);
    map.setZoom(NEARBY_ZOOM);
    hideShopPopup(popupEl);
    if (!userMarker) {
      const pin = new google.maps.marker.PinElement({
        background: "#1a73e8",
        borderColor: "#1557b0",
        glyphColor: "#ffffff",
      });
      userMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: latLng,
        content: pin.element,
        title: "Your location",
        zIndex: 1000,
      });
    } else {
      userMarker.position = latLng;
    }
  }

  const geoStatus = h("div", {
    className: "map-app__geo-status u-hidden",
    role: "status",
    ariaLive: "polite",
  });
  const nearbyBtn = h(
    "button",
    {
      type: "button",
      className: "btn map-app__nearby-btn",
      textContent: "📍 What’s nearby?",
      title: navigator.geolocation
        ? "Use your device location to center the map on shops near you"
        : "Geolocation is not available in this browser",
    },
    [],
  );

  nearbyBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      geoStatus.textContent =
        "Your browser does not support geolocation, or it is turned off.";
      geoStatus.classList.remove("u-hidden");
      return;
    }
    hideShopPopup(popupEl);
    geoStatus.classList.add("u-hidden");
    nearbyBtn.disabled = true;
    nearbyBtn.setAttribute("aria-busy", "true");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        nearbyBtn.disabled = false;
        nearbyBtn.removeAttribute("aria-busy");
        showUserNearby({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        nearbyBtn.disabled = false;
        nearbyBtn.removeAttribute("aria-busy");
        geoStatus.textContent = geolocationErrorMessage(err);
        geoStatus.classList.remove("u-hidden");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: GEO_TIMEOUT_MS,
      },
    );
  });

  const nearbyWrap = h("div", { className: "map-app__nearby-wrap" }, [
    nearbyBtn,
    geoStatus,
  ]);
  mapShell.appendChild(nearbyWrap);

  map.addListener("click", () => {
    hideShopPopup(popupEl);
  });
}
