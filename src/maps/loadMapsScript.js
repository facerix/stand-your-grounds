/**
 * Load Google Maps JavaScript API once (with Places library).
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export function loadMapsScript(apiKey) {
  if (typeof window.google?.maps?.Map === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-grounds-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Maps")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.groundsMaps = "true";
    script.async = true;
    script.defer = true;
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "places",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps JavaScript API"));
    document.head.appendChild(script);
  });
}
