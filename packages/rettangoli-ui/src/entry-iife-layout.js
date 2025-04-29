import { render, html } from "https://cdn.jsdelivr.net/npm/uhtml@4.7.0/keyed.min.js";

import RettangoliButton from './components/button.js'
import RettangoliView from './components/view.js';
import RettangoliText from './components/text.js';
import RettangoliImage from './components/image.js';
import RettangoliSvg from './components/svg.js';
import RettangoliInput from './components/input.js';
import RettangoliTextArea from './components/textarea.js';
import RettangoliSelect from './components/select.js';
import RettangoliPopover from './components/popover.js';
import RettangoliSidebar from './components/sidebar.js';
import RettangoliPageOutline from './components/page-outline.js';

customElements.define("rtgl-button", RettangoliButton({ render, html }));
customElements.define("rtgl-view", RettangoliView({ render, html }));
customElements.define("rtgl-text", RettangoliText({ render, html }));
customElements.define("rtgl-image", RettangoliImage({ render, html }));
customElements.define("rtgl-svg", RettangoliSvg({ render, html }));
customElements.define("rtgl-input", RettangoliInput({ render, html }));
customElements.define("rtgl-textarea", RettangoliTextArea({ render, html }));
customElements.define("rtgl-select", RettangoliSelect({ render, html }));
customElements.define("rtgl-popover", RettangoliPopover({ render, html }));
customElements.define("rtgl-sidebar", RettangoliSidebar({ render, html }));
customElements.define("rtgl-page-outline", RettangoliPageOutline({ render, html }));
