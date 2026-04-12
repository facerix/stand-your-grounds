/**
 * Cached Place Details via legacy PlacesService (Maps JS + Places library).
 */
export class PlaceDetailsCache {
  /** @type {Map<string, object>} */
  #cache = new Map();

  #service = null;

  /** @param {object} map */
  constructor(map) {
    this.#service = new google.maps.places.PlacesService(map);
  }

  /**
   * @param {string} placeId
   * @returns {Promise<object | null>}
   */
  getDetails(placeId) {
    if (!placeId || !this.#service) {
      return Promise.resolve(null);
    }
    const hit = this.#cache.get(placeId);
    if (hit) {
      return Promise.resolve(hit);
    }

    return new Promise((resolve) => {
      const request = {
        placeId,
        fields: [
          "name",
          "formatted_address",
          "formatted_phone_number",
          "website",
          "rating",
          "opening_hours",
          "url",
        ],
      };

      this.#service.getDetails(request, (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result) {
          this.#cache.set(placeId, result);
          resolve(result);
        } else {
          resolve(null);
        }
      });
    });
  }
}
