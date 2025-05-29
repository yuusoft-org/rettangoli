import { render, html } from "./lib/uhtml.js";

import RettangoliButton from './primitives/button.js'
import RettangoliView from './primitives/view.js';
import RettangoliText from './primitives/text.js';
import RettangoliImage from './primitives/image.js';
import RettangoliSvg from './primitives/svg.js';

customElements.define("rtgl-button", RettangoliButton({ render, html }));
customElements.define("rtgl-view", RettangoliView({ render, html }));
customElements.define("rtgl-text", RettangoliText({ render, html }));
customElements.define("rtgl-image", RettangoliImage({ render, html }));
customElements.define("rtgl-svg", RettangoliSvg({ render, html }));
