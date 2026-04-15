import { h } from "/src/domUtils.js";
import { VALUES, CATEGORIES } from "/src/values.js";
import DataStore from "/src/DataStore.js";

const valueLabelMap = new Map(VALUES.map((v) => [v.value, v.label]));
const valueCategoryMap = new Map(VALUES.map((v) => [v.value, v.category]));
const categoryOrder = CATEGORIES.map((c) => c.key);

/** @param {string} s */
function text(s) {
  return document.createTextNode(s);
}

/** @param {{ hour: number, minute: number }} point → minutes since midnight */
function pointToMinutes(point) {
  return point.hour * 60 + point.minute;
}

const SOON_THRESHOLD_MIN = 30;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** @param {{ hour: number, minute: number }} point → "7am" / "7:30pm" */
function formatPoint(point) {
  const suffix = point.hour >= 12 ? "pm" : "am";
  const h12 = point.hour % 12 || 12;
  return point.minute === 0
    ? `${h12}${suffix}`
    : `${h12}:${String(point.minute).padStart(2, "0")}${suffix}`;
}

/**
 * Scan all periods to find the soonest opening after the current moment,
 * skipping same-day entries (today is already over).
 *
 * @param {Array} periods  each { open: {day,hour,minute}, close?: {day,hour,minute} }
 * @param {number} jsDay   0-Sun … 6-Sat
 * @returns {string|null}  e.g. "Opens tomorrow at 7am"
 */
function findNextOpen(periods, jsDay) {
  let best = null;
  for (const p of periods) {
    if (!p.open) continue;
    const daysAhead = (p.open.day - jsDay + 7) % 7 || 7;
    const oMin = pointToMinutes(p.open);
    if (
      !best ||
      daysAhead < best.daysAhead ||
      (daysAhead === best.daysAhead && oMin < best.oMin)
    ) {
      best = { daysAhead, oMin, open: p.open };
    }
  }
  if (!best) return null;
  const t = formatPoint(best.open);
  if (best.daysAhead === 1) return `Opens tomorrow at ${t}`;
  return `Opens ${DAY_NAMES[best.open.day]} at ${t}`;
}

/**
 * Derive today's hours text and an open/closed/soon status from the
 * Google Places `opening_hours` object.
 *
 * @param {object} oh - place.opening_hours
 * @returns {{ todayText: string, status: string, statusClass: string, nextOpen: string|null }}
 */
function getTodayHoursInfo(oh) {
  const now = new Date();
  const jsDay = now.getDay(); // 0 = Sun … 6 = Sat
  const curMin = now.getHours() * 60 + now.getMinutes();

  // weekday_text is Mon(0)…Sun(6); JS day 0 = Sun → index 6
  const todayLine = oh.weekday_text?.[(jsDay + 6) % 7];
  const todayText = todayLine
    ? todayLine.replace(/^\w+:\s*/, "")
    : "Hours unavailable";

  const periods = oh.periods;
  if (!Array.isArray(periods) || periods.length === 0) {
    return {
      todayText,
      status: "Closed",
      statusClass: "closed",
      nextOpen: null,
    };
  }

  // Single period with no close → open 24 h
  if (periods.length === 1 && !periods[0].close) {
    return {
      todayText: "Open 24 hours",
      status: "Open",
      statusClass: "open",
      nextOpen: null,
    };
  }

  // Build list of {openMin, closeMin} windows relevant to today
  const windows = [];
  for (const p of periods) {
    if (!p.close) continue;
    const oMin = pointToMinutes(p.open);
    const cMin = pointToMinutes(p.close);

    if (p.open.day === jsDay && p.close.day === jsDay) {
      windows.push({ openMin: oMin, closeMin: cMin });
    } else if (p.open.day === jsDay) {
      // opens today, closes tomorrow
      windows.push({ openMin: oMin, closeMin: 24 * 60 + cMin });
    } else if (p.close.day === jsDay) {
      // opened yesterday, closes today
      windows.push({ openMin: -1, closeMin: cMin });
    }
  }

  for (const w of windows) {
    if (curMin >= w.openMin && curMin < w.closeMin) {
      if (w.closeMin - curMin <= SOON_THRESHOLD_MIN) {
        return {
          todayText,
          status: "Closing soon",
          statusClass: "closing-soon",
          nextOpen: null,
        };
      }
      return { todayText, status: "Open", statusClass: "open", nextOpen: null };
    }
  }

  // Not open — check if opening soon
  for (const w of windows) {
    if (w.openMin > curMin && w.openMin - curMin <= SOON_THRESHOLD_MIN) {
      return {
        todayText,
        status: "Opening soon",
        statusClass: "opening-soon",
        nextOpen: null,
      };
    }
  }

  // Closed — if past all today's windows, find the next opening
  const pastToday = windows.every((w) => w.closeMin <= curMin);
  const nextOpen = pastToday ? findNextOpen(periods, jsDay) : null;

  return { todayText, status: "Closed", statusClass: "closed", nextOpen };
}

/**
 * @param {boolean} isFavorite
 * @returns {HTMLElement}
 */
function createFavoriteIcon(isFavorite) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", isFavorite ? "currentColor" : "none");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("shop-popup__favorite-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("clip-rule", "evenodd");
  if (isFavorite) {
    path.setAttribute(
      "d",
      "M11.993 5.09691C11.0387 4.25883 9.78328 3.75 8.40796 3.75C5.42122 3.75 3 6.1497 3 9.10988C3 10.473 3.50639 11.7242 4.35199 12.67L12 20.25L19.4216 12.8944L19.641 12.6631C20.4866 11.7172 21 10.473 21 9.10988C21 6.1497 18.5788 3.75 15.592 3.75C14.2167 3.75 12.9613 4.25883 12.007 5.09692L12 5.08998L11.993 5.09691Z",
    );
    path.setAttribute("fill", "currentColor");
  } else {
    path.setAttribute(
      "d",
      "M11.993 5.09691C11.0387 4.25883 9.78328 3.75 8.40796 3.75C5.42122 3.75 3 6.1497 3 9.10988C3 10.473 3.50639 11.7242 4.35199 12.67L12 20.25L19.4216 12.8944L19.641 12.6631C20.4866 11.7172 21 10.473 21 9.10988C21 6.1497 18.5788 3.75 15.592 3.75C14.2167 3.75 12.9613 4.25883 12.007 5.09692L12 5.08998L11.993 5.09691ZM12 7.09938L12.0549 7.14755L12.9079 6.30208L12.9968 6.22399C13.6868 5.61806 14.5932 5.25 15.592 5.25C17.763 5.25 19.5 6.99073 19.5 9.10988C19.5 10.0813 19.1385 10.9674 18.5363 11.6481L18.3492 11.8453L12 18.1381L5.44274 11.6391C4.85393 10.9658 4.5 10.0809 4.5 9.10988C4.5 6.99073 6.23699 5.25 8.40796 5.25C9.40675 5.25 10.3132 5.61806 11.0032 6.22398L11.0921 6.30203L11.9452 7.14752L12 7.09938Z",
    );
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "0.5");
  }

  svg.appendChild(path);
  return svg;
}

/**
 * @param {string} shopId
 * @returns {HTMLButtonElement}
 */
function buildFavoriteButton(shopId) {
  const isFavorite = DataStore.isFavorite(shopId);
  const btn = h("button", {
    type: "button",
    className: "shop-popup__favorite",
    ariaLabel: isFavorite ? "Remove from favorites" : "Add to favorites",
    ariaPressed: String(isFavorite),
  });
  if (isFavorite) {
    btn.classList.add("shop-popup__favorite--active");
  }
  btn.appendChild(createFavoriteIcon(isFavorite));

  btn.addEventListener("click", () => {
    const nowFavorite = DataStore.toggleFavorite(shopId);
    btn.setAttribute("aria-pressed", String(nowFavorite));
    btn.setAttribute(
      "aria-label",
      nowFavorite ? "Remove from favorites" : "Add to favorites",
    );
    btn.classList.toggle("shop-popup__favorite--active", nowFavorite);
    btn.replaceChildren(createFavoriteIcon(nowFavorite));
  });

  return btn;
}

/**
 * @param {object} shop
 * @param {(e: Event) => void} onBackdropClick
 * @param {() => void} onClose
 */
function buildCuratedSection(shop, onBackdropClick, onClose) {
  const titleId = "shop-popup-title";
  let values = null;
  if (Array.isArray(shop.values) && shop.values.length > 0) {
    const grouped = new Map();
    for (const v of shop.values) {
      const cat = valueCategoryMap.get(v) || "other";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(v);
    }
    const groupEls = [];
    for (const catKey of categoryOrder) {
      const vals = grouped.get(catKey);
      if (!vals) continue;
      const pills = vals.map((v) => {
        const li = h("li", { className: "shop-popup__value" }, [
          text(valueLabelMap.get(v) || String(v)),
        ]);
        li.dataset.category = catKey;
        return li;
      });
      groupEls.push(h("ul", { className: "shop-popup__value-group" }, pills));
    }
    if (groupEls.length > 0) {
      values = h("div", { className: "shop-popup__values" }, groupEls);
    }
  }

  const validLinks = Array.isArray(shop.links)
    ? shop.links.filter((link) => link?.url)
    : [];
  const links =
    validLinks.length > 0
      ? h(
          "div",
          { className: "shop-popup__links" },
          validLinks.map((link) =>
            h("a", {
              className: "shop-popup__link",
              href: link.url,
              target: "_blank",
              rel: "noopener noreferrer",
              textContent: link.label || link.url,
            }),
          ),
        )
      : null;

  const backdrop = h("button", {
    type: "button",
    className: "shop-popup__backdrop",
    ariaLabel: "Close shop details",
  });
  backdrop.addEventListener("click", onBackdropClick);

  const closeBtn = h("button", {
    type: "button",
    className: "shop-popup__close",
    ariaLabel: "Close",
    textContent: "×",
  });
  closeBtn.addEventListener("click", () => onClose());

  const favoriteBtn = buildFavoriteButton(shop.id);

  const summaryBlock = shop.summary
    ? h("p", { className: "shop-popup__summary" }, [text(shop.summary)])
    : null;

  const googleBlock = h(
    "div",
    { className: "shop-popup__google", dataset: { googleSlot: "true" } },
    [
      h("h3", { className: "shop-popup__subhead" }, [text("Google listing")]),
      h(
        "div",
        {
          className: "shop-popup__google-body",
          dataset: { googleBody: "true" },
        },
        [],
      ),
    ],
  );

  const attribution = h("p", { className: "shop-popup__attribution" }, [
    text("Map data © "),
    h("a", {
      href: "https://www.google.com/maps",
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "Google",
    }),
    text(" (see "),
    h("a", {
      href: "https://developers.google.com/maps/documentation/javascript/policies",
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: "policies",
    }),
    text(")."),
  ]);

  const titleRow = h("div", { className: "shop-popup__title-row" }, [
    h("h2", { id: titleId, className: "shop-popup__title" }, [text(shop.name)]),
    favoriteBtn,
  ]);

  const panelChildren = [
    closeBtn,
    titleRow,
    summaryBlock,
    values,
    links,
    googleBlock,
    attribution,
  ].filter(Boolean);

  const panel = h(
    "div",
    {
      className: "shop-popup__panel",
      role: "dialog",
      ariaModal: "true",
      ariaLabelledby: titleId,
    },
    panelChildren,
  );

  panel.addEventListener("click", (e) => e.stopPropagation());

  return h("div", { className: "shop-popup__inner" }, [backdrop, panel]);
}

/** @param {object} place */
function buildGoogleBody(place) {
  const parts = [];

  if (place.name) {
    parts.push(
      h("p", { className: "shop-popup__place-name" }, [text(place.name)]),
    );
  }
  if (place.formatted_address) {
    parts.push(
      h("p", { className: "shop-popup__address" }, [
        text(place.formatted_address),
      ]),
    );
  }
  if (place.formatted_phone_number) {
    parts.push(
      h("p", { className: "shop-popup__phone" }, [
        text(place.formatted_phone_number),
      ]),
    );
  }
  if (place.rating != null) {
    parts.push(
      h("p", { className: "shop-popup__rating" }, [
        text(`Rating: ${place.rating}`),
      ]),
    );
  }
  if (place.opening_hours?.weekday_text?.length) {
    const { todayText, status, statusClass, nextOpen } = getTodayHoursInfo(
      place.opening_hours,
    );
    const badge = h(
      "span",
      { className: `shop-popup__status shop-popup__status--${statusClass}` },
      [text(status)],
    );
    const hoursChildren = [
      h("p", { className: "shop-popup__hours-today" }, [
        badge,
        text(` · Today: ${todayText}`),
      ]),
    ];
    if (nextOpen) {
      hoursChildren.push(
        h("p", { className: "shop-popup__hours-next" }, [text(nextOpen)]),
      );
    }
    parts.push(h("div", { className: "shop-popup__hours" }, hoursChildren));
  }
  if (place.url) {
    parts.push(
      h("p", {}, [
        h("a", {
          href: place.url,
          target: "_blank",
          rel: "noopener noreferrer",
          textContent: "View on Google Maps",
        }),
      ]),
    );
  }

  return parts.length > 0
    ? parts
    : [
        h("p", { className: "shop-popup__muted" }, [
          text("No extra details returned."),
        ]),
      ];
}

let escapeHandler = null;

/**
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {object} options.shop
 * @param {object} options.placeCache
 */
export async function openShopPopup({ container, shop, placeCache }) {
  hideShopPopup(container);

  const onClose = () => hideShopPopup(container);
  const onBackdrop = (e) => {
    e.preventDefault();
    onClose();
  };

  const root = buildCuratedSection(shop, onBackdrop, onClose);
  container.replaceChildren(root);
  container.classList.remove("u-hidden");
  container.setAttribute("aria-hidden", "false");

  if (!shop.placeId) {
    container.querySelector(".shop-popup__google")?.remove();
  }

  const googleBody = container.querySelector("[data-google-body]");

  if (shop.placeId && googleBody) {
    googleBody.replaceChildren(
      h("p", { className: "shop-popup__loading" }, [
        text("Loading place details…"),
      ]),
    );
    const place = await placeCache.getDetails(shop.placeId);
    if (!place) {
      googleBody.replaceChildren(
        h("p", { className: "shop-popup__error" }, [
          text(
            "Could not load Google place details. Check API keys and Places API access.",
          ),
        ]),
      );
    } else {
      googleBody.replaceChildren(...buildGoogleBody(place));
    }
  }

  escapeHandler = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

/** @param {HTMLElement} container */
export function hideShopPopup(container) {
  if (escapeHandler) {
    document.removeEventListener("keydown", escapeHandler);
    escapeHandler = null;
  }
  container.classList.add("u-hidden");
  container.setAttribute("aria-hidden", "true");
  container.replaceChildren();
}
