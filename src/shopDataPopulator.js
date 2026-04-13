/**
 * Browser-based utility to populate values and summary fields for shops.
 * Uses Google Places API (New) via the Maps JavaScript API.
 */

import { VALUES } from "/src/values.js";

const KNOWN_VALUES = VALUES.map((v) => v.value);

const VALUE_PATTERNS = {
  lgbtq_friendly: [
    /lgbtq?\+?[- ]?(friendly|owned|welcoming)/i,
    /pride/i,
    /queer[- ]owned/i,
    /lgbtq?\+? community/i,
    /safe[- ]space/i,
  ],
  women_owned: [
    /woman[- ]owned/i,
    /women[- ]owned/i,
    /female[- ]owned/i,
    /founded by.*she/i,
    /founded by.*her/i,
  ],
  minority_owned: [
    /minority[- ]owned/i,
    /black[- ]owned/i,
    /asian[- ]owned/i,
    /latinx?[- ]owned/i,
    /hispanic[- ]owned/i,
    /bipoc[- ]owned/i,
  ],
  disabled_owned: [/disabled[- ]owned/i, /disability[- ]owned/i],
  veteran_owned: [/veteran[- ]owned/i, /vet[- ]owned/i, /military[- ]owned/i],
  small_business: [
    /small[- ]business/i,
    /independent[- ]business/i,
    /local[- ]business/i,
    /single[- ]location/i,
  ],
  non_profit: [/non[- ]?profit/i, /nonprofit/i, /501\s?\(c\)/i],
  community_owned: [
    /community[- ]owned/i,
    /co[- ]?op(erative)?/i,
    /cooperative/i,
  ],
  fair_labor: [/fair[- ]labor/i, /living[- ]wage/i, /fair[- ]wages?/i],
  fair_trade: [/fair[- ]trade/i, /ethically[- ]sourced/i],
  vegan_friendly: [
    /vegan[- ]friendly/i,
    /vegan[- ]options/i,
    /plant[- ]based/i,
  ],
  direct_trade: [/direct[- ]trade/i, /relationship[- ]coffee/i],
  locally_owned: [
    /locally[- ]owned/i,
    /local(ly)?[- ]roasted/i,
    /family[- ]owned/i,
    /independent(ly)?[- ]owned/i,
    /neighborhood[- ]caf[eé]/i,
    /our family/i,
    /since \d{4}/i,
  ],
  b_corp: [
    /b[- ]?corp/i,
    /certified[- ]b[- ]?corporation/i,
    /benefit corporation/i,
  ],
  vegetarian_friendly: [/vegetarian[- ]friendly/i, /vegetarian[- ]options/i],
  gluten_free: [/gluten[- ]free/i, /gf[- ]options/i],
  kosher: [/\bkosher\b/i, /kosher[- ]certified/i],
  halal: [/\bhalal\b/i, /halal[- ]certified/i],
  organic: [
    /\borganics?\b/i,
    /certified[- ]organic/i,
    /usda[- ]organic/i,
    /organic[- ]coffee/i,
  ],
};

const SF_NEIGHBORHOODS = [
  "Noe Valley",
  "Mission",
  "Castro",
  "Bernal Heights",
  "Glen Park",
  "SOMA",
  "SoMa",
  "Potrero Hill",
  "Dogpatch",
  "Hayes Valley",
  "Marina",
  "North Beach",
  "Chinatown",
  "Financial District",
  "Embarcadero",
  "Sunset",
  "Richmond",
  "Haight",
  "Cole Valley",
  "Inner Sunset",
  "Outer Sunset",
  "Inner Richmond",
  "Outer Richmond",
  "Presidio",
  "Pacific Heights",
  "Fillmore",
  "Japantown",
  "Tenderloin",
  "Union Square",
  "Civic Center",
  "Russian Hill",
  "Telegraph Hill",
  "Nob Hill",
  "Lower Haight",
  "Upper Haight",
  "Duboce Triangle",
  "Mission Dolores",
  "Divisadero",
];

const PLACE_FIELDS = [
  "displayName",
  "formattedAddress",
  "editorialSummary",
  "rating",
  "userRatingCount",
  "websiteURI",
];

/**
 * @param {string} content
 * @returns {{ suggestedValues: string[], reasons: Record<string, string[]> }}
 */
export function analyzeContentForValues(content) {
  const suggestedValues = [];
  const reasons = {};

  for (const [value, regexes] of Object.entries(VALUE_PATTERNS)) {
    if (!KNOWN_VALUES.includes(value)) {
      continue;
    }
    for (const regex of regexes) {
      const match = content.match(regex);
      if (match) {
        if (!suggestedValues.includes(value)) {
          suggestedValues.push(value);
        }
        reasons[value] = reasons[value] || [];
        reasons[value].push(match[0]);
        break;
      }
    }
  }

  return { suggestedValues, reasons };
}

/**
 * @param {string} address
 * @returns {string | null}
 */
function extractNeighborhood(address) {
  for (const n of SF_NEIGHBORHOODS) {
    if (address.includes(n)) {
      return n;
    }
  }
  return null;
}

/**
 * @param {object} shop
 * @param {object | null} placeDetails
 * @returns {string}
 */
export function generateSummary(shop, placeDetails) {
  if (placeDetails?.editorialSummary?.text) {
    return placeDetails.editorialSummary.text;
  }

  const parts = [];

  if (shop.name) {
    parts.push(shop.name);
  }

  if (placeDetails?.formattedAddress) {
    const neighborhood = extractNeighborhood(placeDetails.formattedAddress);
    if (neighborhood) {
      parts.push(`in ${neighborhood}`);
    }
  }

  if (shop.values?.includes("locally_owned")) {
    parts.push("— locally owned");
  }

  return parts.length > 1 ? parts.join(" ") : "";
}

/**
 * Fetch place details using the Maps JavaScript API Place class.
 * @param {string} placeId
 * @returns {Promise<object | null>}
 */
export async function fetchPlaceDetails(placeId) {
  if (!placeId) {
    return null;
  }

  try {
    const { Place } = await google.maps.importLibrary("places");
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: PLACE_FIELDS });

    return {
      displayName:
        typeof place.displayName === "string"
          ? place.displayName
          : place.displayName?.text || "",
      formattedAddress: place.formattedAddress || "",
      editorialSummary: place.editorialSummary
        ? { text: place.editorialSummary.text || place.editorialSummary }
        : null,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      websiteURI: place.websiteURI || "",
    };
  } catch (err) {
    console.error("[shopDataPopulator] fetchPlaceDetails error:", err);
    return null;
  }
}

/**
 * Process a single shop and return suggestions.
 * @param {object} shop
 * @param {string} [additionalContent] - Optional content from website (pasted by user)
 * @returns {Promise<object>}
 */
export async function processShop(shop, additionalContent = "") {
  const result = {
    id: shop.id,
    name: shop.name,
    currentValues: shop.values || [],
    currentSummary: shop.summary || "",
    suggestedValues: [],
    suggestedSummary: "",
    placeDetails: null,
    valueReasons: {},
    errors: [],
    websiteUrl: shop.links?.[0]?.url || "",
  };

  if (shop.placeId) {
    try {
      result.placeDetails = await fetchPlaceDetails(shop.placeId);
    } catch (err) {
      result.errors.push(`Places API: ${err.message}`);
    }
  }

  const combinedContent = [
    shop.name,
    shop.summary,
    result.placeDetails?.editorialSummary?.text || "",
    additionalContent,
  ].join(" ");

  const analysis = analyzeContentForValues(combinedContent);
  result.suggestedValues = analysis.suggestedValues;
  result.valueReasons = analysis.reasons;

  if (!shop.summary) {
    result.suggestedSummary = generateSummary(shop, result.placeDetails);
  }

  return result;
}

/**
 * Get new values that aren't already in the shop.
 * @param {object} result
 * @returns {string[]}
 */
export function getNewValues(result) {
  return result.suggestedValues.filter(
    (v) => !result.currentValues.includes(v),
  );
}

/**
 * Build updated shop object with merged values and summary.
 * @param {object} shop
 * @param {object} result
 * @returns {object}
 */
export function mergeResultIntoShop(shop, result) {
  const updated = { ...shop };
  const newValues = getNewValues(result);

  if (newValues.length > 0) {
    updated.values = [...(shop.values || []), ...newValues];
  }

  if (!shop.summary && result.suggestedSummary) {
    updated.summary = result.suggestedSummary;
  }

  return updated;
}

/**
 * Get a label for a value from VALUES.
 * @param {string} value
 * @returns {string}
 */
export function getValueLabel(value) {
  const entry = VALUES.find((v) => v.value === value);
  return entry ? entry.label : value;
}
