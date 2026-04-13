// BurgerButton -- Web Component used to trigger a hamburger menu opening and closing

// bleh, I hate that we have to do our CSS/HTML in a JS TTL.
const template = `
<style>
/*
 * Adapted from pure-CSS hamgurger menu, by Erik Terwan
 * https://codepen.io/erikterwan/pen/EVzeRP?editors=1100
 * MIT License
 */
 
  .burgerButton {
    display: block;
    position: relative;
    
    z-index: 50;
    
    -webkit-user-select: none;
    user-select: none;

    /* remove default button styling */
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;

    input {
      display: block;
      width: 40px;
      height: 32px;
      position: absolute;
      top: -7px;
      left: -5px;
      
      cursor: pointer;
      
      opacity: 0; /* hide this */
      z-index: 2; /* and place it over the hamburger */
      
      -webkit-touch-callout: none;
    }

    /*
     * Just a quick hamburger
     */
     span {
       display: block;
       width: 33px;
       height: 4px;
       margin-bottom: 5px;
       position: relative;
   
       background: #f5e6d3;
       border-radius: 3px;
       transform-origin: center;
   
       z-index: 1;
   
       transition: transform 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
                   background 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
                   opacity 0.55s ease;
     }

     /* Rotate the top "bun" */
     input:checked ~ span:first-of-type {
       transform: rotate(45deg) translate(6px, 6px);
       background: var(--accent-color, #2ec6fe);
     }
    
     /* Hide the "meat" */
     input:checked ~ span:nth-of-type(2) {
       opacity: 0;
       transform: rotate(0deg) scale(0.2, 0.2);
     }
    
     /* And rotate the bottom "bun" the other way */
     input:checked ~ span:nth-of-type(3) {
       transform: translate(0px, -9px) rotate(-45deg);
       background: var(--accent-color, #2ec6fe);
     }
  }
</style>

<button class="burgerButton" aria-haspopup="menu" aria-expanded="false">
    <input type="checkbox" />

    <!-- spans to render the hamburger -->
    <span></span>
    <span></span>
    <span></span>
</button>`;

class BurgerButton extends HTMLElement {
  innerButton = null;
  innerCheckbox = null;

  connectedCallback() {
    this.innerHTML = template;
    this.innerButton = this.querySelector("button");
    this.innerCheckbox = this.querySelector("input");

    // a11y support
    this.innerCheckbox.addEventListener("change", (e) => {
      this.innerButton.ariaExpanded = e.target.checked;
    });
    this.addEventListener("keydown", (evt) => {
      if (evt.code === "Enter" || evt.code === "Space") {
        this.toggle();
      }
    });
  }

  toggle() {
    this.innerCheckbox.checked = !this.innerCheckbox.checked;
    this.emitClickEvent();
  }

  emitClickEvent() {
    const event = new Event("click");
    this.dispatchEvent(event);
  }

  reset() {
    // reset to initial state
    this.innerCheckbox.checked = false;
  }

  get active() {
    return this.innerCheckbox.checked;
  }
}

// Define the custom element
customElements.define("burger-button", BurgerButton);
