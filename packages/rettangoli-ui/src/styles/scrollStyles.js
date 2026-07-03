
import { css } from '../common.js'

export default css`
:host([sh]:not([sv])) {
    overflow-x: auto;
    flex-wrap: nowrap;
    min-width: 0;
}
:host([sv]:not([sh])) {
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
:host([sh]),
:host([sv]) {
    -ms-overflow-style: auto;
    scrollbar-gutter: stable both-edges;
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
:host([hsb])::-webkit-scrollbar {
    width: 0;
    height: 0;
}

@media only screen and (max-width: 1280px) {
    :host([xl-hsb])::-webkit-scrollbar {
        width: 0;
        height: 0;
    }
}

@media only screen and (max-width: 1024px) {
    :host([lg-hsb])::-webkit-scrollbar {
        width: 0;
        height: 0;
    }
}

@media only screen and (max-width: 768px) {
    :host([md-hsb])::-webkit-scrollbar {
        width: 0;
        height: 0;
    }
}

@media only screen and (max-width: 640px) {
    :host([sm-hsb])::-webkit-scrollbar {
        width: 0;
        height: 0;
    }
}

`
