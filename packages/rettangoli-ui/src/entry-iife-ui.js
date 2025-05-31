import { render, html } from "./lib/uhtml.js";

import RettangoliButton from './primitives/button.js'
import RettangoliView from './primitives/view.js';
import RettangoliText from './primitives/text.js';
import RettangoliImage from './primitives/image.js';
import RettangoliSvg from './primitives/svg.js';
import RettangoliInput from './primitives/input.js';
import RettangoliTextArea from './primitives/textarea.js';
import RettangoliSelect from './components/select.js';
import RettangoliPopover from './components/popover.js';
import RettangoliSidebar from './components/sidebar.js';
import RettangoliPageOutline from './components/page-outline.js';
import RettangoliNavbar from './components/navbar.js';
import RettangoliForm from './components/form.js';

customElements.define("rtgl-button", RettangoliButton({}));
customElements.define("rtgl-view", RettangoliView({}));
customElements.define("rtgl-text", RettangoliText({}));
customElements.define("rtgl-image", RettangoliImage({}));
customElements.define("rtgl-svg", RettangoliSvg({}));
customElements.define("rtgl-input", RettangoliInput({}));
customElements.define("rtgl-textarea", RettangoliTextArea({}));
customElements.define("rtgl-select", RettangoliSelect({ render, html }));
customElements.define("rtgl-popover", RettangoliPopover({ render, html }));
// customElements.define("rtgl-sidebar", RettangoliSidebar({ render, html }));
customElements.define("rtgl-page-outline", RettangoliPageOutline({ render, html }));
// customElements.define("rtgl-navbar", RettangoliNavbar({ render, html }));
customElements.define("rtgl-form", RettangoliForm({ render, html }));
