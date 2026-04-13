// BurgerMenu -- Web Component used to render a slide-out menu as activated by a BurgerButton
/*
 * Adapted from pure-CSS hamgurger menu, by Erik Terwan
 * https://codepen.io/erikterwan/pen/EVzeRP?editors=1100
 * MIT License
 */
import "./BurgerButton.js";

const CSS = `<style>
burger-menu {
	display: inline-flex;
	align-items: center;
	position: relative;
	z-index: 200;
}

burger-menu .burger-menu__list {
	position: absolute;
	top: calc(100% + 6px);
	right: 0;
	margin: 0;
	padding: 0.6em 0;
	z-index: 199;
	min-width: min(280px, calc(100vw - 24px));
	background: #3d2914;
	color: #f5e6d3;
	border: 1px solid rgba(46, 198, 254, 0.35);
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	-webkit-font-smoothing: antialiased;
	opacity: 0;
	width: 0;
	max-width: 0;
	overflow: hidden;
	pointer-events: none;
	transition:
		opacity 0.35s cubic-bezier(0.77, 0.2, 0.05, 1),
		width 0.5s cubic-bezier(0.77, 0.2, 0.05, 1),
		max-width 0.5s cubic-bezier(0.77, 0.2, 0.05, 1);
}

burger-menu .burger-menu__list.active {
	opacity: 1;
	width: auto;
	max-width: min(280px, calc(100vw - 24px));
	padding-left: 1rem;
	padding-right: 1rem;
	pointer-events: auto;
}

burger-menu .burger-menu__list > * {
	padding: 0.45em 0;
	font-size: 1rem;
	line-height: 1.3;
	white-space: nowrap;
	display: flex;
	align-items: center;
	gap: 0.4em;
}

burger-menu .burger-menu__list a,
burger-menu .burger-menu__list a:visited {
	color: inherit;
	text-decoration: none;
}

burger-menu .burger-menu__list a:hover,
burger-menu .burger-menu__list a:focus-visible {
	color: var(--accent-color, #2ec6fe);
}

burger-menu .burger-menu__list .map-app__favorites-filter {
	margin-right: 0;
	width: 100%;
	justify-content: flex-start;
}
</style>`;

class BurgerMenu extends HTMLElement {
  whenLoaded = Promise.all([customElements.whenDefined("burger-button")]);

  initialize() {
    this.whenLoaded.then(() => {
      // only init after the `whenLoaded` promise resolves
      const existingBurgerCount =
        document.querySelectorAll("burger-button").length;
      this.buttonId = `burgerButton${existingBurgerCount}`;
      this.menuId = `burgerMenu${existingBurgerCount}`;
      this.isOpen = false;
      this.innerHTML = `${CSS}<burger-button id="${this.buttonId}"></burger-button>
<div id="${this.menuId}" class="burger-menu__list" role="menu">${this.menuItems}</div>`;

      this.button = this.querySelector("burger-button");
      this.menu = this.querySelector(".burger-menu__list");
      const innerBtn = this.button.querySelector("button");
      if (innerBtn) {
        innerBtn.setAttribute("aria-controls", this.menuId);
      }
      this.button.addEventListener("click", () => {
        this.menu.classList[this.button.active ? "add" : "remove"]("active");
      });
      this.menu.addEventListener("click", () => {
        this.button.reset();
        this.menu.classList.remove("active");
      });
    });
  }

  connectedCallback() {
    this.menuItems = this.innerHTML;
    this.initialize();
  }
}

// Define the custom element
customElements.define("burger-menu", BurgerMenu);
