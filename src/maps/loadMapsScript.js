/** @type {Promise<void> | null} */
let mapsScriptLoad = null;

/**
 * Load Google Maps JavaScript API once (Places + Advanced Marker libraries).
 * With loading=async, use the callback query param — script "load" fires before Map is usable.
 * @param {string} apiKey
 * @returns {Promise<void>}
 */

export function loadMapsScript(apiKey) {
  if (typeof window.google?.maps?.Map === "function") {
    return Promise.resolve();
  }

  if (mapsScriptLoad) {
    return mapsScriptLoad;
  }

  let resolve;
  let reject;
  mapsScriptLoad = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const callbackName = `__groundsMapsCb_${Math.random().toString(36).slice(2)}`;
  window[callbackName] = () => {
    delete window[callbackName];
    mapsScriptLoad = null;
    resolve();
  };

  const script = document.createElement("script");
  script.dataset.groundsMaps = "true";
  script.async = true;
  script.defer = true;
  const params = new URLSearchParams({
    key: apiKey,
    v: "weekly",
    libraries: "places,marker",
    loading: "async",
    callback: callbackName,
  });
  script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
  script.onerror = () => {
    delete window[callbackName];
    mapsScriptLoad = null;
    reject(new Error("Failed to load Google Maps JavaScript API"));
  };
  document.head.appendChild(script);

  return mapsScriptLoad;
}
