import { loadMapsScript } from "/src/maps/loadMapsScript.js";
import { PlaceDetailsCache } from "/src/maps/placeDetailsCache.js";
import { hideShopPopup, openShopPopup } from "/src/maps/shopPopup.js";

const DEFAULT_CENTER = { lat: 37.75, lng: -122.35 };
const DEFAULT_ZOOM = 10;

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

  const shopsRes = await fetch("/data/shops.json");
  if (!shopsRes.ok) {
    throw new Error(`Failed to load shops (${shopsRes.status})`);
  }
  const shops = validateShops(await shopsRes.json());

  await loadMapsScript(apiKey);

  const map = new google.maps.Map(mapEl, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const placeCache = new PlaceDetailsCache(map);

  if (shops.length === 1) {
    const s = shops[0];
    map.setCenter({ lat: s.lat, lng: s.lng });
    map.setZoom(14);
  } else if (shops.length > 1) {
    const bounds = new google.maps.LatLngBounds();
    shops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    map.fitBounds(bounds, { top: 56, right: 48, bottom: 160, left: 48 });
  }

  shops.forEach((shop) => {
    const marker = new google.maps.Marker({
      position: { lat: shop.lat, lng: shop.lng },
      map,
      title: shop.name,
    });
    marker.addListener("click", () => {
      void openShopPopup({ container: popupEl, shop, placeCache });
    });
  });

  map.addListener("click", () => {
    hideShopPopup(popupEl);
  });
}
