import { h } from "/src/domUtils.js";
import { VALUES } from "/src/values.js";

const valueLabelMap = new Map(VALUES.map((v) => [v.value, v.label]));

/** @param {string} s */
function text(s) {
  return document.createTextNode(s);
}

/**
 * @param {object} shop
 * @param {(e: Event) => void} onBackdropClick
 * @param {() => void} onClose
 */
function buildCuratedSection(shop, onBackdropClick, onClose) {
  const titleId = "shop-popup-title";
  const values =
    Array.isArray(shop.values) && shop.values.length > 0
      ? h(
          "ul",
          { className: "shop-popup__values" },
          shop.values.map((v) =>
            h("li", { className: "shop-popup__value" }, [
              text(valueLabelMap.get(v) || String(v)),
            ]),
          ),
        )
      : null;

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

  const panelChildren = [
    closeBtn,
    h("h2", { id: titleId, className: "shop-popup__title" }, [text(shop.name)]),
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
    const lines = place.opening_hours.weekday_text.map((line) =>
      h("li", {}, [text(line)]),
    );
    parts.push(
      h("div", { className: "shop-popup__hours" }, [
        h("strong", {}, [text("Hours")]),
        h("ul", {}, lines),
      ]),
    );
  }
  if (place.website) {
    parts.push(
      h("p", {}, [
        h("a", {
          href: place.website,
          target: "_blank",
          rel: "noopener noreferrer",
          textContent: "Website (Google)",
        }),
      ]),
    );
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
