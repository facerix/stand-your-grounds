/**
 * Browser-based utility to populate values and summary fields for shops.
 * Uses Google Places API (New) via the Maps JavaScript API.
 */

import { VALUES } from "/src/values.js";

const KNOWN_VALUES = VALUES.map((v) => v.value);

const VALUE_PATTERNS = {
  bipoc_owned: [
    /bipoc[- ]owned/i,
    /black[- ]owned/i,
    /asian[- ]owned/i,
    /latinx?[- ]owned/i,
    /hispanic[- ]owned/i,
    /minority[- ]owned/i,
    /indigenous[- ]owned/i,
  ],
  women_owned: [
    /woman[- ]owned/i,
    /women[- ]owned/i,
    /female[- ]owned/i,
    /founded by.*she/i,
    /founded by.*her/i,
  ],
  lgbtq_owned: [
    /lgbtq?\+?[- ]?(owned|friendly|welcoming)/i,
    /pride/i,
    /queer[- ]owned/i,
    /lgbtq?\+? community/i,
    /gay[- ]owned/i,
  ],
  immigrant_led: [/immigrant[- ](led|owned)/i, /refugee[- ]owned/i],
  worker_owned: [
    /worker[- ]owned/i,
    /co[- ]?op(erative)?/i,
    /cooperative/i,
    /employee[- ]owned/i,
  ],
  independently_owned: [
    /independent(ly)?[- ]owned/i,
    /family[- ](owned|run)/i,
    /locally[- ]owned/i,
    /neighborhood[- ]caf[eé]/i,
    /mom[- ]and[- ]pop/i,
    /single[- ]location/i,
    /our family/i,
  ],
  social_enterprise: [
    /social[- ]enterprise/i,
    /non[- ]?profit/i,
    /nonprofit/i,
    /501\s?\(c\)/i,
  ],
  gender_neutral_restrooms: [
    /gender[- ]neutral[- ]restroom/i,
    /all[- ]gender[- ]restroom/i,
    /gender[- ]inclusive[- ]restroom/i,
    /unisex[- ]restroom/i,
  ],
  universal_accessibility: [
    /wheelchair[- ]accessible/i,
    /\bada\b[- ]accessible/i,
    /\bada\b[- ]compliant/i,
    /accessible[- ]entrance/i,
    /ramp[- ]access/i,
    /universal[- ]accessib/i,
  ],
  neuro_inclusive: [
    /sensory[- ]friendly/i,
    /low[- ]sensory/i,
    /quiet[- ]zone/i,
    /neuro[- ]inclusive/i,
    /neuro[- ]friendly/i,
  ],
  asl_friendly: [
    /\basl\b/i,
    /sign[- ]language/i,
    /non[- ]verbal[- ]friendly/i,
    /deaf[- ]friendly/i,
  ],
  trauma_informed: [/trauma[- ]informed/i, /safe[- ]space/i],
  living_wage: [
    /living[- ]wage/i,
    /no[- ]tip/i,
    /fair[- ]wages?/i,
    /fair[- ]labor/i,
  ],
  direct_trade: [
    /direct[- ]trade/i,
    /relationship[- ]coffee/i,
    /ethically[- ]sourced/i,
  ],
  eco_friendly: [
    /zero[- ]waste/i,
    /eco[- ]friendly/i,
    /sustainable/i,
    /compostable/i,
    /plastic[- ]free/i,
  ],
  halal: [/\bhalal\b/i, /halal[- ]certified/i],
  kosher: [/\bkosher\b/i, /kosher[- ]certified/i],
  vegan_friendly: [
    /vegan[- ]friendly/i,
    /vegan[- ]options/i,
    /plant[- ]based/i,
  ],
  gluten_free: [/gluten[- ]free/i, /gf[- ]options/i],
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
