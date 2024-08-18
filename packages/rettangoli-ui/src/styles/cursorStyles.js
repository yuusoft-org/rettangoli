import { generateCSS } from '../common.js'

const styleMap = {
    "cur": "cursor",
};

const styles = {
    "cur": {
        "p": "pointer",
        "m": "move",
        "grab": "grab",
        "grabbing": "grabbing",
    },
};


export default generateCSS(styleMap, styles);