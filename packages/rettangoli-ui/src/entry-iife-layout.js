import RettangoliButton from './primitives/button.js'
import RettangoliView from './primitives/view.js';
import RettangoliText from './primitives/text.js';
import RettangoliImage from './primitives/image.js';
import RettangoliSvg from './primitives/svg.js';

customElements.define("rtgl-button", RettangoliButton({}));
customElements.define("rtgl-view", RettangoliView({}));
customElements.define("rtgl-text", RettangoliText({}));
customElements.define("rtgl-image", RettangoliImage({}));
customElements.define("rtgl-svg", RettangoliSvg({}));
