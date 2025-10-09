
import { css } from '../common.js'

export default css`
:host([sh]:not([sv])) {
    overflow-x: scroll;
    flex-wrap: nowrap;
    min-width: 0;
}
:host([sv]:not([sh])) {
    overflow-y: scroll;
    flex-wrap: nowrap;
    min-height: 0;
}
:host([sh][sv]) {
    overflow: scroll;
    flex-wrap: nowrap;
    min-height: 0;
    min-width: 0;
}
:host([overflow="hidden"]) {
    overflow: hidden;
    flex-wrap: nowrap;
}

`
