
import { css } from '../common.js'

export default css`
:host([sh]:not([sv])) {
    overflow-x: scroll;
    flex-wrap: nowrap;
}
:host([sv]:not([sh])) {
    overflow-y: scroll;
    flex-wrap: nowrap;
}
/* :host([sh][sv]) {
    overflow: scroll;
    flex-wrap: nowrap;
} */
`