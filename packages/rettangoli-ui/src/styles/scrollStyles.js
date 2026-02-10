
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
:host([sh]),
:host([sv]) {
    -ms-overflow-style: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb, var(--muted-foreground)) var(--scrollbar-track, transparent);
}
:host([sh])::-webkit-scrollbar,
:host([sv])::-webkit-scrollbar {
    width: var(--scrollbar-size, 6px);
    height: var(--scrollbar-size, 6px);
    background: var(--scrollbar-track, transparent);
}
:host([sh])::-webkit-scrollbar-track,
:host([sv])::-webkit-scrollbar-track {
    background: var(--scrollbar-track, transparent);
}
:host([sh])::-webkit-scrollbar-thumb,
:host([sv])::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, var(--muted-foreground));
    border-radius: 9999px;
}
:host([sh])::-webkit-scrollbar-thumb:hover,
:host([sv])::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, var(--ring));
}
:host([overflow="hidden"]) {
    overflow: hidden;
    flex-wrap: nowrap;
}

`
