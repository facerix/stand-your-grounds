import "/components/BurgerMenu.js";
import "/components/UpdateNotification.js";

import DataStore from "/src/DataStore.js";
import { serviceWorkerManager } from "/src/ServiceWorkerManager.js";

const whenLoaded = Promise.all([
  customElements.whenDefined("update-notification"),
]);

/**
 * @param {string} message
 */
function showMapError(message) {
  const el = document.getElementById("map-error");
  if (!el) {
    return;
  }
  el.textContent = message;
  el.classList.remove("u-hidden");
}

async function loadConfigAndMap() {
  const res = await fetch("/config.json");
  if (!res.ok) {
    showMapError(
      "Missing config.json. Copy config.example.json to config.json and add your Google Maps API key.",
    );
    throw new Error("config.json missing or not ok");
  }
  const config = await res.json();
  const key =
    typeof config.googleMapsApiKey === "string"
      ? config.googleMapsApiKey.trim()
      : "";
  if (!key) {
    showMapError(
      "Set googleMapsApiKey in config.json (see config.example.json).",
    );
    throw new Error("Empty googleMapsApiKey");
  }
  const { initShopMap } = await import("/src/maps/shopMap.js");
  await initShopMap({ apiKey: key });
}

whenLoaded.then(async () => {
  const updateNotification = document.querySelector("update-notification");

  window.addEventListener("sw-update-available", (event) => {
    console.log("Service worker update available, showing notification");
    updateNotification.show(event.detail.pendingWorker);
  });

  await DataStore.init();
  await serviceWorkerManager.register();

  try {
    await loadConfigAndMap();
  } catch (err) {
    console.error("[grounds]", err);
  }
});
