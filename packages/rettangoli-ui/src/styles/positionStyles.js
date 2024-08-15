
import { css } from '../common.js'

export default css`
:host([pos="rel"]) {
  position: relative;
}
:host([pos="abs"]) {
  position: absolute;
}
:host([pos="fix"]) {
  position: fixed;
}
:host([cor="full"]) {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  height: 100%;
}
:host([cor="top"]) {
  top: 0;
  right: 0;
  left: 0;
}
:host([cor="right"]) {
  top: 0;
  right: 0;
  bottom: 0;
  /* it does not automatically stretch unlike left right */
  height: 100%;
}
:host([cor="bottom"]) {
  right: 0;
  bottom: 0;
  left: 0;
}
:host([cor="left"]) {
  bottom: 0;
  left: 0;
  top: 0;
  /* it does not automatically stretch unlike left right */
  height: 100%;
}
`