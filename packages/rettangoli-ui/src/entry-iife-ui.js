import RettangoliButton from './primitives/button.js'
import RettangoliView from './primitives/view.js';
import RettangoliText from './primitives/text.js';
import RettangoliImage from './primitives/image.js';
import RettangoliSvg from './primitives/svg.js';
import RettangoliInput from './primitives/input.js';
import RettangoliInputNumber from './primitives/input-number.js';
import RettangoliTextArea from './primitives/textarea.js';
import RettangoliColorPicker from './primitives/colorPicker.js';
import RettangoliSlider from './primitives/slider.js';
import RettangoliCheckbox from './primitives/checkbox.js';
import RettangoliDialog from './primitives/dialog.js';
import RettangoliPopover from './primitives/popover.js';

customElements.define("rtgl-button", RettangoliButton({}));
customElements.define("rtgl-view", RettangoliView({}));
customElements.define("rtgl-text", RettangoliText({}));
customElements.define("rtgl-image", RettangoliImage({}));
customElements.define("rtgl-svg", RettangoliSvg({}));
customElements.define("rtgl-input", RettangoliInput({}));
customElements.define("rtgl-input-number", RettangoliInputNumber({}));
customElements.define("rtgl-textarea", RettangoliTextArea({}));
customElements.define("rtgl-color-picker", RettangoliColorPicker({}));
customElements.define("rtgl-slider", RettangoliSlider({}));
customElements.define("rtgl-checkbox", RettangoliCheckbox({}));
customElements.define("rtgl-dialog", RettangoliDialog({}));
customElements.define("rtgl-popover", RettangoliPopover({}));

// built from rettangoli cli fe
import '../.temp/dynamicImport.js'
