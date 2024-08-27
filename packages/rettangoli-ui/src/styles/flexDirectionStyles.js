import { css } from "../common.js";

export default css`

  :host([d="h"]) {
    flex-direction: row;
  }
  :host(:not([d])) {
    flex-direction: column;
  }
  :host([d="h"]:not([ah])) {
    justify-content: flex-start;
  }
  :host([d="h"][ah="c"]) {
    justify-content: center;
    /* align-content: center; */
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
  :host(:not([d]):not([ah])) {
    align-items: flex-start;
  }
  :host(:not([d])[ah="c"]) {
    align-items: center;
    align-content: center;
  }
  :host(:not([d])[ah="e"]) {
    align-items: flex-end;
    align-content: flex-end;
  }
  :host(:not([d]):not([av])) {
    justify-content: flex-start;
  }
  :host(:not([d])[av="c"]) {
    justify-content: center;
  }
  :host(:not([d])[av="e"]) {
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
