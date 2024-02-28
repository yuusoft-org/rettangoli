
import { css } from '../common.js';

export default css`
:host([bgc="p"]) {
    background-color: var(--color-primary);
  }
  :host([bgc="pc"]) {
    background-color: var(--color-primary-container);
  }
  :host([bgc="s"]) {
    background-color: var(--color-secondary);
  }
  :host([bgc="sc"]) {
    background-color: var(--color-secondary-container);
  }
  :host([bgc="e"]) {
    background-color: var(--color-error);
  }
  :host([bgc="ec"]) {
    background-color: var(--color-error-container);
  }
  :host([bgc="su"]) {
    background-color: var(--color-surface);
  }
  :host([bgc="sucl"]) {
    background-color: var(--color-surface-container-low);
  }
  :host([bgc="suc"]) {
    background-color: var(--color-surface-container);
  }
  :host([bgc="such"]) {
    background-color: var(--color-surface-container-high);
  }
  :host([bgc="isu"]) {
    background-color: var(--color-inverse-surface);
  }
`