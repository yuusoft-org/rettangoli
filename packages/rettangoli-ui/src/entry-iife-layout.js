import { render, html } from "./lib/uhtml.js";

import RettangoliButton from './components/button.js'
import RettangoliView from './components/view.js';
import RettangoliText from './components/text.js';
import RettangoliImage from './components/image.js';
import RettangoliSvg from './components/svg.js';

customElements.define("rtgl-button", RettangoliButton({ render, html }));
customElements.define("rtgl-view", RettangoliView({ render, html }));
customElements.define("rtgl-text", RettangoliText({ render, html }));
customElements.define("rtgl-image", RettangoliImage({ render, html }));
customElements.define("rtgl-svg", RettangoliSvg({ render, html }));
