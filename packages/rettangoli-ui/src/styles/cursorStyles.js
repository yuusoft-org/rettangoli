import { generateCSS } from '../common.js'

const styles = {
    "cur": {
        "alias": "alias",
        "all-scroll": "all-scroll",
        "auto": "auto",
        "cell": "cell",
        "col-resize": "col-resize",
        "context-menu": "context-menu",
        "copy": "copy",
        "crosshair": "crosshair",
        "default": "default",
        "e-resize": "e-resize",
        "ew-resize": "ew-resize",
        "grab": "grab",
        "grabbing": "grabbing",
        "help": "help",
        "move": "move",
        "n-resize": "n-resize",
        "ne-resize": "ne-resize",
        "nesw-resize": "nesw-resize",
        "ns-resize": "ns-resize",
        "nw-resize": "nw-resize",
        "nwse-resize": "nwse-resize",
        "no-drop": "no-drop",
        "none": "none",
        "not-allowed": "not-allowed",
        "pointer": "pointer",
        "progress": "progress",
        "row-resize": "row-resize",
        "s-resize": "s-resize",
        "se-resize": "se-resize",
        "sw-resize": "sw-resize",
        "text": "text",
        "url": "url",
        "w-resize": "w-resize",
        "wait": "wait",
        "zoom-in": "zoom-in",
        "zoom-out": "zoom-out",
        
        // Keep short aliases for common cursors
        "p": "pointer",
        "m": "move",
    },
};

export default generateCSS(styles);