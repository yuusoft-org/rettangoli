import { setFormMessages } from "./common/formMessages.js";
import { setIcons } from "./common/icons.js";
import { setUiMessages } from "./common/uiMessages.js";

// The script-tag bundles have no module exports, so they expose the functions
// that set up the library as window.rtgl.
globalThis.rtgl = Object.freeze({ setFormMessages, setIcons, setUiMessages });
