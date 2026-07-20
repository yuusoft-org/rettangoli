
import { css } from '../common.js'

export default css`
:host([sh]:not([sv])) {
    overflow-x: auto;
    overflow-y: hidden;
    flex-wrap: nowrap;
    min-width: 0;
}
:host([sv]:not([sh])) {
    overflow-x: hidden;
    overflow-y: auto;
    flex-wrap: nowrap;
    min-height: 0;
}
:host([sh][sv]) {
    overflow: auto;
    flex-wrap: nowrap;
    min-height: 0;
    min-width: 0;
}
:host([overflow="hidden"]) {
    overflow: hidden;
    flex-wrap: nowrap;
}

`
