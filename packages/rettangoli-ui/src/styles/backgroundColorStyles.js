
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
  :host([bgc="o"]) {
    background-color: var(--color-outline);
  }
  :host([bgc="ov"]) {
    background-color: var(--color-outline-variant);
  }
  :host([h-bgc="p"]:hover) {
    background-color: var(--color-primary);
  }
  :host([h-bgc="pc"]:hover) {
    background-color: var(--color-primary-container);
  }
  :host([h-bgc="s"]:hover) {
    background-color: var(--color-secondary);
  }
  :host([h-bgc="sc"]:hover) {
    background-color: var(--color-secondary-container);
  }
  :host([h-bgc="e"]:hover) {
    background-color: var(--color-error);
  }
  :host([h-bgc="ec"]:hover) {
    background-color: var(--color-error-container);
  }
  :host([h-bgc="su"]:hover) {
    background-color: var(--color-surface);
  }
  :host([h-bgc="sucl"]:hover) {
    background-color: var(--color-surface-container-low);
  }
  :host([h-bgc="suc"]:hover) {
    background-color: var(--color-surface-container);
  }
  :host([h-bgc="such"]:hover) {
    background-color: var(--color-surface-container-high);
  }
  :host([h-bgc="isu"]:hover) {
    background-color: var(--color-inverse-surface);
  }
  :host([h-bgc="o"]:hover) {
    background-color: var(--color-outline);
  }
  :host([h-bgc="ov"]:hover) {
    background-color: var(--color-outline-variant);
  }

`