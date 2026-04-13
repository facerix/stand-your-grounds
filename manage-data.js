import { h } from "/src/domUtils.js";
import { loadMapsScript } from "/src/maps/loadMapsScript.js";
import {
  fetchPlaceDetails,
  analyzeContentForValues,
  getValueLabel,
} from "/src/shopDataPopulator.js";

/** @type {HTMLElement | null} */
const root = document.getElementById("manage-root");

/**
 * @param {unknown} displayName
 * @returns {string}
 */
function displayNameToString(displayName) {
  if (typeof displayName === "string") {
    return displayName.trim();
  }
  if (displayName && typeof displayName === "object" && "text" in displayName) {
    const t = /** @type {{ text?: string }} */ (displayName).text;
    return typeof t === "string" ? t.trim() : "";
  }
  return "";
}

/**
 * @param {unknown} loc
 * @returns {{ lat: number, lng: number } | null}
 */
function coordsFromLocation(loc) {
  if (!loc || typeof loc !== "object") {
    return null;
  }
  const o = /** @type {Record<string, unknown>} */ (loc);
  if (typeof o.lat === "function" && typeof o.lng === "function") {
    const lat = o.lat();
    const lng = o.lng();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  }
  if (Number.isFinite(o.lat) && Number.isFinite(o.lng)) {
    return {
      lat: /** @type {number} */ (o.lat),
      lng: /** @type {number} */ (o.lng),
    };
  }
  return null;
}

/**
 * @param {string} name
 * @returns {string}
 */
function slugFromName(name) {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s.slice(0, 48) : "new-shop";
}

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h("textarea", { value: text }, []);
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/**
 * @param {string} message
 * @returns {HTMLElement}
 */
function elError(message) {
  return h("div", { className: "manage-msg manage-msg--error" }, [
    document.createTextNode(message),
  ]);
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
 * Extract domain from URL for link label
 * @param {string} url
 * @returns {string}
 */
function domainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function main() {
  if (!root) {
    return;
  }

  root.replaceChildren();

  const res = await fetch("/config.json");
  if (!res.ok) {
    root.appendChild(
      elError(
        "Missing config.json. Copy config.example.json to config.json and add your Google Maps API key.",
      ),
    );
    return;
  }
  const config = await res.json();
  const apiKey =
    typeof config.googleMapsApiKey === "string"
      ? config.googleMapsApiKey.trim()
      : "";
  if (!apiKey) {
    root.appendChild(
      elError("Set googleMapsApiKey in config.json (see config.example.json)."),
    );
    return;
  }

  const shopsRes = await fetch("/data/shops.json");
  if (!shopsRes.ok) {
    root.appendChild(
      elError(`Could not load /data/shops.json (${shopsRes.status}).`),
    );
    return;
  }
  const shops = validateShops(await shopsRes.json());

  const listSection = h("section", { className: "manage-section" }, [
    h("h2", {}, [document.createTextNode("Current entries (data/shops.json)")]),
  ]);

  const tableWrap = h("div", { className: "manage-table-wrap" }, []);
  const table = h("table", { className: "manage-table" }, [
    h("thead", {}, [
      h("tr", {}, [
        h("th", {}, [document.createTextNode("id")]),
        h("th", {}, [document.createTextNode("name")]),
        h("th", {}, [document.createTextNode("lat")]),
        h("th", {}, [document.createTextNode("lng")]),
        h("th", {}, [document.createTextNode("placeId")]),
      ]),
    ]),
    h(
      "tbody",
      {},
      shops.map((s) =>
        h("tr", {}, [
          h("td", {}, [h("code", {}, [document.createTextNode(s.id)])]),
          h("td", {}, [document.createTextNode(s.name)]),
          h("td", {}, [
            h("code", {}, [document.createTextNode(String(s.lat))]),
          ]),
          h("td", {}, [
            h("code", {}, [document.createTextNode(String(s.lng))]),
          ]),
          h("td", {}, [
            h("code", {}, [document.createTextNode(s.placeId ?? "")]),
          ]),
        ]),
      ),
    ),
  ]);
  tableWrap.appendChild(table);
  listSection.appendChild(tableWrap);

  const lookupSection = h("section", { className: "manage-section" }, [
    h("h2", {}, [document.createTextNode("Add new shop (Places Text Search)")]),
    h("p", { className: "manage-msg manage-msg--hint" }, [
      document.createTextNode(
        'Search by business name and area (e.g. "Ritual Coffee Valencia San Francisco"). ' +
          "Results include Place details, suggested summary, and detected values. " +
          "Copy the JSON stub and merge into shops.json.",
      ),
    ]),
  ]);

  const resultsEl = h("div", { id: "manage-lookup-results" }, []);
  const input = h("input", {
    type: "search",
    className: "manage-lookup__input",
    placeholder: "Search query…",
    autocomplete: "off",
  });
  const searchBtn = h(
    "button",
    {
      type: "button",
      className: "manage-lookup__btn",
    },
    [document.createTextNode("Search")],
  );

  const formRow = h("div", { className: "manage-lookup__row" }, [
    input,
    searchBtn,
  ]);
  lookupSection.appendChild(formRow);
  lookupSection.appendChild(resultsEl);

  root.appendChild(listSection);
  root.appendChild(lookupSection);

  try {
    await loadMapsScript(apiKey);
  } catch (err) {
    console.error("[manage-data]", err);
    resultsEl.appendChild(
      elError(
        "Failed to load Google Maps JavaScript API. Check the key and API enablement.",
      ),
    );
    searchBtn.disabled = true;
    return;
  }

  /**
   * Build a complete shop JSON stub with Place details
   * @param {object} place - Basic place from text search
   * @param {object|null} details - Detailed place info
   * @returns {object}
   */
  function buildEnrichedShopStub(place, details) {
    const name = displayNameToString(place.displayName);
    const coords = coordsFromLocation(place.location);

    const stub = {
      id: slugFromName(name),
      name: name || "Shop name",
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      placeId: typeof place.id === "string" ? place.id : "",
      summary: "",
      values: [],
      links: [],
    };

    if (details) {
      const editorialText = details.editorialSummary?.text || "";
      const contentToAnalyze = [name, editorialText].join(" ");
      const analysis = analyzeContentForValues(contentToAnalyze);
      stub.values = analysis.suggestedValues;

      if (details.websiteURI) {
        stub.links.push({
          label: domainFromUrl(details.websiteURI),
          url: details.websiteURI,
        });
      }
    }

    return stub;
  }

  /**
   * @param {string} query
   */
  async function runSearch(query) {
    resultsEl.replaceChildren();
    const q = query.trim();
    if (!q) {
      resultsEl.appendChild(elError("Enter a search query."));
      return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";

    try {
      const { Place } = await google.maps.importLibrary("places");
      const { LatLngBounds } = await google.maps.importLibrary("core");
      const bounds = new LatLngBounds(
        { lat: 37.2, lng: -122.65 },
        { lat: 38.15, lng: -121.5 },
      );

      const request = {
        textQuery: q,
        fields: ["displayName", "formattedAddress", "location", "id"],
        maxResultCount: 10,
        region: "us",
        locationBias: bounds,
      };

      const { places } = await Place.searchByText(request);

      if (!places.length) {
        resultsEl.appendChild(
          h("p", { className: "manage-msg manage-msg--hint" }, [
            document.createTextNode(
              "No results. Try a longer query or include city/neighborhood.",
            ),
          ]),
        );
        return;
      }

      for (const place of places) {
        const name = displayNameToString(place.displayName);
        const coords = coordsFromLocation(place.location);
        const pid = typeof place.id === "string" ? place.id : "";
        const addr =
          typeof place.formattedAddress === "string"
            ? place.formattedAddress
            : "";

        const resultEl = h("article", { className: "manage-result" }, [
          h("h3", {}, [document.createTextNode(name || "(no name)")]),
          h("p", { className: "manage-result__meta" }, [
            document.createTextNode(addr),
          ]),
          h("p", { className: "manage-result__meta" }, [
            document.createTextNode(
              `lat: ${coords?.lat ?? "—"} · lng: ${coords?.lng ?? "—"} · placeId: ${pid || "—"}`,
            ),
          ]),
        ]);

        const detailsContainer = h("div", {}, [
          h("p", { className: "manage-result__meta" }, [
            document.createTextNode("Loading details..."),
          ]),
        ]);
        resultEl.appendChild(detailsContainer);
        resultsEl.appendChild(resultEl);

        fetchPlaceDetails(pid).then((details) => {
          detailsContainer.replaceChildren();

          const stub = buildEnrichedShopStub(place, details);

          if (details) {
            if (details.editorialSummary?.text) {
              detailsContainer.appendChild(
                h("div", { className: "manage-result__section" }, [
                  h("div", { className: "manage-result__section-title" }, [
                    document.createTextNode(
                      "Google Summary (use as reference, do not copy verbatim)",
                    ),
                  ]),
                  h("p", { className: "manage-result__summary-text" }, [
                    document.createTextNode(
                      `"${details.editorialSummary.text}"`,
                    ),
                  ]),
                ]),
              );
            }

            if (details.rating) {
              detailsContainer.appendChild(
                h("p", { className: "manage-result__meta" }, [
                  document.createTextNode(
                    `Rating: ${details.rating} (${details.userRatingCount || 0} reviews)`,
                  ),
                ]),
              );
            }

            if (details.websiteURI) {
              const link = h(
                "a",
                {
                  href: details.websiteURI,
                  target: "_blank",
                  rel: "noopener",
                  className: "manage-result__link",
                },
                [document.createTextNode(details.websiteURI)],
              );
              detailsContainer.appendChild(
                h("p", { className: "manage-result__meta" }, [link]),
              );
            }
          }

          if (stub.values.length > 0) {
            const valuesEl = h(
              "div",
              { className: "manage-result__values" },
              stub.values.map((v) =>
                h(
                  "span",
                  {
                    className: "manage-result__value manage-result__value--new",
                  },
                  [document.createTextNode(getValueLabel(v))],
                ),
              ),
            );
            detailsContainer.appendChild(
              h("div", { className: "manage-result__section" }, [
                h("div", { className: "manage-result__section-title" }, [
                  document.createTextNode("Detected Values"),
                ]),
                valuesEl,
              ]),
            );
          }

          const jsonBlock = JSON.stringify(stub, null, 2) + ",";
          const copyBtn = h(
            "button",
            { type: "button", className: "manage-result__copy" },
            [document.createTextNode("Copy shops.json stub")],
          );
          const copyDone = h(
            "span",
            { className: "manage-result__copy-done", hidden: true },
            [document.createTextNode("Copied")],
          );

          copyBtn.addEventListener("click", async () => {
            await copyToClipboard(jsonBlock);
            copyDone.hidden = false;
            setTimeout(() => {
              copyDone.hidden = true;
            }, 2000);
          });

          detailsContainer.appendChild(
            h("div", { className: "manage-result__section" }, [
              h("div", { className: "manage-result__section-title" }, [
                document.createTextNode("JSON Stub"),
              ]),
              h("pre", { className: "manage-result__pre" }, [
                document.createTextNode(jsonBlock),
              ]),
              h("div", { className: "manage-result__actions" }, [
                copyBtn,
                copyDone,
              ]),
            ]),
          );
        });
      }
    } catch (err) {
      console.error("[manage-data] search", err);
      resultsEl.appendChild(
        elError(
          "Search failed. Confirm Places API (New) is enabled for your project and this key is allowed to use it.",
        ),
      );
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  }

  searchBtn.addEventListener("click", () => {
    void runSearch(/** @type {HTMLInputElement} */ (input).value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      void runSearch(/** @type {HTMLInputElement} */ (input).value);
    }
  });
}

void main();
