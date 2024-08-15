
import { css } from '../common.js'

export default css`
:host([shadow="s"]) {
    box-shadow: var(--shadow-s);
}
:host([shadow="m"]) {
    box-shadow: var(--shadow-m);
}
:host([shadow="l"]) {
    box-shadow: var(--shadow-l);
}
`