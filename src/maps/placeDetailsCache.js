/**
 * Cached Place Details via Place class (Places API New) + fetchFields.
 */

/** @type {readonly string[]} */
const PLACE_FIELDS = [
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "rating",
  "regularOpeningHours",
  "websiteURI",
  "googleMapsURI",
];

/**
 * Plain object for shop popup (legacy-shaped keys used by shopPopup.js).
 * @param {object} place
 * @returns {object}
 */
function displayNameToString(displayName) {
  if (typeof displayName === "string") {
    return displayName.trim();
  }
  if (displayName && typeof displayName.text === "string") {
    return displayName.text.trim();
  }
  return "";
}

function normalizePlaceForPopup(place) {
  const name = displayNameToString(place.displayName);
  const weekdayDesc = place.regularOpeningHours?.weekdayDescriptions;
  const opening_hours =
    Array.isArray(weekdayDesc) && weekdayDesc.length > 0
      ? { weekday_text: weekdayDesc }
      : undefined;

  return {
    ...(name ? { name } : {}),
    ...(place.formattedAddress
      ? { formatted_address: place.formattedAddress }
      : {}),
    ...(place.nationalPhoneNumber || place.internationalPhoneNumber
      ? {
          formatted_phone_number:
            place.nationalPhoneNumber || place.internationalPhoneNumber,
        }
      : {}),
    ...(place.rating != null ? { rating: place.rating } : {}),
    ...(opening_hours ? { opening_hours } : {}),
    ...(place.websiteURI ? { website: place.websiteURI } : {}),
    ...(place.googleMapsURI ? { url: place.googleMapsURI } : {}),
  };
}

export class PlaceDetailsCache {
  /** @type {Map<string, object>} */
  #cache = new Map();

  /**
   * @param {string} placeId
   * @returns {Promise<object | null>}
   */
  async getDetails(placeId) {
    if (!placeId) {
      return null;
    }
    const hit = this.#cache.get(placeId);
    if (hit) {
      return hit;
    }

    try {
      const place = new google.maps.places.Place({ id: placeId });
      await place.fetchFields({ fields: [...PLACE_FIELDS] });
      const normalized = normalizePlaceForPopup(place);
      this.#cache.set(placeId, normalized);
      return normalized;
    } catch {
      return null;
    }
  }
}
