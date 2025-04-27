import { css } from "../common.js";

export default css`

  :host([d="h"]) {
    flex-direction: row;
  }
  :host([d="v"]) {
    flex-direction: column;
  }
  :host([d="h"]:not([ah])) {
    justify-content: flex-start;
  }
  :host([d="h"][ah="c"]) {
    justify-content: center;
  }
  :host([d="h"][ah="e"]) {
    justify-content: flex-end;
  }
  :host([d="h"]:not([av])) {
    align-items: flex-start;
  }
  :host([d="h"][av="c"]) {
    align-items: center;
    align-content: center;
  }
  :host([d="h"][av="e"]) {
    align-items: flex-end;
    align-content: flex-end;
  }
  
  /* Default/vertical direction - horizontal alignment */
  :host(:not([d]):not([ah])),
  :host([d="v"]:not([ah])) {
    align-items: flex-start;
  }
  :host(:not([d])[ah="c"]),
  :host([d="v"][ah="c"]) {
    align-items: center;
  }
  :host(:not([d])[ah="e"]),
  :host([d="v"][ah="e"]) {
    align-items: flex-end;
  }
  
  :host(:not([d]):not([av])),
  :host([d="v"]:not([av])) {
    justify-content: flex-start;
  }
  :host(:not([d])[av="c"]),
  :host([d="v"][av="c"]) {
    justify-content: center;
  }
  :host(:not([d])[av="e"]),
  :host([d="v"][av="e"]) {
    justify-content: flex-end;
  }
  
  @media screen and (max-width: 640px) {
    :host([s-d="v"]) {
      flex-direction: column;
    }
    :host([s-d="h"]) {
      flex-direction: row;
    }
    :host([s-d="h"][s-av="c"]) {
      align-items: center;
      align-content: center;
    }
    :host([s-d="v"][s-av="c"]) {
      justify-content: center;
    }
  }
`;
