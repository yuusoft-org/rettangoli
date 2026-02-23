var rettangoli = (() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/common/link.js
  var overlayLinkStyles = `
  :host([href]) {
    cursor: pointer;
    position: relative;
  }

  :host([href]) a {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
`;
  var applyLinkAttributes = ({ linkElement, href, newTab, rel }) => {
    linkElement.href = href;
    if (newTab) {
      linkElement.target = "_blank";
    } else {
      linkElement.removeAttribute("target");
    }
    if (rel != null) {
      linkElement.rel = rel;
    } else if (newTab) {
      linkElement.rel = "noopener noreferrer";
    } else {
      linkElement.removeAttribute("rel");
    }
  };
  var syncLinkOverlay = ({
    shadowRoot,
    slotElement,
    linkElement,
    href,
    newTab,
    rel
  }) => {
    if (slotElement.parentNode !== shadowRoot) {
      shadowRoot.appendChild(slotElement);
    }
    if (!href) {
      if (linkElement && linkElement.parentNode === shadowRoot) {
        shadowRoot.removeChild(linkElement);
      }
      return null;
    }
    const nextLinkElement = linkElement || document.createElement("a");
    applyLinkAttributes({
      linkElement: nextLinkElement,
      href,
      newTab,
      rel
    });
    if (nextLinkElement.parentNode !== shadowRoot) {
      shadowRoot.appendChild(nextLinkElement);
    }
    return nextLinkElement;
  };
  var syncLinkWrapper = ({
    shadowRoot,
    childElement,
    linkElement,
    href,
    newTab,
    rel
  }) => {
    if (!href) {
      if (linkElement) {
        if (childElement.parentNode === linkElement) {
          shadowRoot.appendChild(childElement);
        }
        if (linkElement.parentNode === shadowRoot) {
          shadowRoot.removeChild(linkElement);
        }
        return null;
      }
      if (childElement.parentNode !== shadowRoot) {
        shadowRoot.appendChild(childElement);
      }
      return null;
    }
    const nextLinkElement = linkElement || document.createElement("a");
    applyLinkAttributes({
      linkElement: nextLinkElement,
      href,
      newTab,
      rel
    });
    if (childElement.parentNode !== nextLinkElement) {
      nextLinkElement.appendChild(childElement);
    }
    if (nextLinkElement.parentNode !== shadowRoot) {
      shadowRoot.appendChild(nextLinkElement);
    }
    return nextLinkElement;
  };

  // src/common/responsive.js
  var responsiveStyleSizes = ["default", "sm", "md", "lg", "xl"];
  var createResponsiveStyleBuckets = () => {
    return responsiveStyleSizes.reduce((acc, size) => {
      acc[size] = {};
      return acc;
    }, {});
  };
  var responsiveBreakpointsSmallToLarge = ["sm", "md", "lg", "xl"];
  var getResponsiveAttributeName = ({ size, attr }) => {
    return size === "default" ? attr : `${size}-${attr}`;
  };
  var getResponsiveFallbackSizes = ({
    size,
    includeDefault = true
  }) => {
    if (size === "default") {
      return ["default"];
    }
    const sizeIndex = responsiveBreakpointsSmallToLarge.indexOf(size);
    if (sizeIndex === -1) {
      return includeDefault ? ["default"] : [];
    }
    const fallbackSizes = responsiveBreakpointsSmallToLarge.slice(sizeIndex);
    if (includeDefault) {
      fallbackSizes.push("default");
    }
    return fallbackSizes;
  };
  var getResponsiveAttribute = ({
    element,
    size,
    attr,
    includeDefault = true
  }) => {
    const fallbackSizes = getResponsiveFallbackSizes({
      size,
      includeDefault
    });
    for (const fallbackSize of fallbackSizes) {
      const attrName = getResponsiveAttributeName({
        size: fallbackSize,
        attr
      });
      const value = element.getAttribute(attrName);
      if (value !== null) {
        return value;
      }
    }
    return null;
  };

  // src/common/dimensions.js
  var FLEX_GROW_DIMENSION_REGEX = /^([1-9]|1[0-2])fg$/;
  var FLEX_BASIS_DIMENSION_REGEX = /^([1-9]\d*)\/([1-9]\d*)fb$/;
  var isFlexGrowDimension = (dimension) => {
    return typeof dimension === "string" && FLEX_GROW_DIMENSION_REGEX.test(dimension);
  };
  var parseFlexBasisDimension = (dimension) => {
    if (typeof dimension !== "string") {
      return null;
    }
    const match = dimension.match(FLEX_BASIS_DIMENSION_REGEX);
    if (!match) {
      return null;
    }
    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0 || numerator > denominator) {
      return null;
    }
    return { numerator, denominator };
  };
  function toFlexBasisCss({ numerator, denominator, gapVar }) {
    if (numerator === denominator) {
      return "100%";
    }
    if (numerator === 1) {
      return `calc((100% - ((${denominator} - 1) * ${gapVar})) / ${denominator})`;
    }
    return `calc(((100% - ((${denominator} - 1) * ${gapVar})) * ${numerator}) / ${denominator})`;
  }
  var applyDimensionToStyleBucket = ({
    styleBucket,
    axis,
    dimension,
    fillValue,
    allowFlexGrow = false,
    flexMinDimension = "0",
    lockBounds = true
  }) => {
    const resetWidthFlexBasisState = () => {
      if (!allowFlexGrow || axis !== "width") {
        return;
      }
      styleBucket["flex-grow"] = "0";
      styleBucket["flex-shrink"] = "1";
      styleBucket["flex-basis"] = "auto";
    };
    const clearAxisBounds = () => {
      styleBucket[`min-${axis}`] = "unset";
      styleBucket[`max-${axis}`] = "unset";
    };
    if (dimension === void 0) {
      return;
    }
    if (dimension === "f") {
      resetWidthFlexBasisState();
      styleBucket[axis] = fillValue;
      clearAxisBounds();
      return;
    }
    if (allowFlexGrow && isFlexGrowDimension(dimension)) {
      styleBucket["flex-grow"] = dimension.slice(0, -2);
      styleBucket["flex-basis"] = "0%";
      styleBucket[`min-${axis}`] = flexMinDimension;
      styleBucket[`max-${axis}`] = "unset";
      return;
    }
    const flexBasis = allowFlexGrow ? parseFlexBasisDimension(dimension) : null;
    if (flexBasis) {
      styleBucket["flex-grow"] = "0";
      styleBucket["flex-shrink"] = "0";
      styleBucket["flex-basis"] = toFlexBasisCss({
        ...flexBasis,
        gapVar: "var(--rtgl-flex-gap, 0px)"
      });
      styleBucket[`min-${axis}`] = flexMinDimension;
      styleBucket[`max-${axis}`] = "unset";
      return;
    }
    resetWidthFlexBasisState();
    styleBucket[axis] = dimension;
    if (lockBounds) {
      styleBucket[`min-${axis}`] = dimension;
      styleBucket[`max-${axis}`] = dimension;
    }
  };
  var applyInlineWidthDimension = ({
    style,
    width,
    fillValue = "var(--width-stretch)",
    allowFlexGrow = true,
    flexMinWidth = "0"
  }) => {
    if (width === "f") {
      style.width = fillValue;
      style.flexGrow = "";
      style.flexBasis = "";
      style.minWidth = "";
      return;
    }
    if (allowFlexGrow && isFlexGrowDimension(width)) {
      style.width = "";
      style.flexGrow = width.slice(0, -2);
      style.flexShrink = "";
      style.flexBasis = "0%";
      style.minWidth = flexMinWidth;
      return;
    }
    const inlineFlexBasis = allowFlexGrow ? parseFlexBasisDimension(width) : null;
    if (inlineFlexBasis) {
      style.width = "";
      style.flexGrow = "0";
      style.flexShrink = "0";
      style.flexBasis = toFlexBasisCss({
        ...inlineFlexBasis,
        gapVar: "var(--rtgl-flex-gap, 0px)"
      });
      style.minWidth = flexMinWidth;
      return;
    }
    if (width != null) {
      style.width = width;
      style.flexGrow = "";
      style.flexShrink = "";
      style.flexBasis = "";
      style.minWidth = "";
      return;
    }
    style.width = "";
    style.flexGrow = "";
    style.flexShrink = "";
    style.flexBasis = "";
    style.minWidth = "";
  };

  // src/common.js
  function css(strings, ...values) {
    let str = "";
    strings.forEach((string, i) => {
      str += string + (values[i] || "");
    });
    return str;
  }
  var breakpoints = ["sm", "md", "lg", "xl"];
  var styleMap = {
    mt: "margin-top",
    mr: "margin-right",
    mb: "margin-bottom",
    ml: "margin-left",
    m: "margin",
    mh: "margin-left margin-right",
    mv: "margin-top margin-bottom",
    pt: "padding-top",
    pr: "padding-right",
    pb: "padding-bottom",
    pl: "padding-left",
    p: "padding",
    ph: "padding-left padding-right",
    pv: "padding-top padding-bottom",
    g: "gap --rtgl-flex-gap",
    gv: "row-gap --rtgl-flex-gap",
    gh: "column-gap --rtgl-flex-gap",
    bw: "border-width",
    bwt: "border-top-width",
    bwr: "border-right-width",
    bwb: "border-bottom-width",
    bwl: "border-left-width",
    bc: "border-color",
    br: "border-radius",
    pos: "position",
    shadow: "box-shadow",
    cur: "cursor"
  };
  var styleMapKeys = Object.keys(styleMap);
  var permutateBreakpoints = (keys) => {
    return keys.concat(
      breakpoints.flatMap(
        (breakpoint) => keys.map((key) => `${breakpoint}-${key}`)
      )
    );
  };
  var mediaQueries = {
    default: void 0,
    xl: "@media only screen and (max-width: 1280px)",
    lg: "@media only screen and (max-width: 1024px)",
    md: "@media only screen and (max-width: 768px)",
    sm: "@media only screen and (max-width: 640px)"
  };
  var generateCSS = (styles9, descendants = {}, targetSelector = null) => {
    let css2 = "";
    for (const [size, mediaQuery] of Object.entries(mediaQueries)) {
      if (size !== "default") {
        css2 += `${mediaQuery} {`;
      }
      for (const [attr, values] of Object.entries(styles9)) {
        for (const [value, rule] of Object.entries(values)) {
          const cssProperties = styleMap[attr];
          const cssRule = rule.startsWith("--") ? `var(${rule})` : rule;
          const attributeWithBreakpoint = size === "default" ? attr : `${size}-${attr}`;
          const hoverAttributeWithBreakpoint = size === "default" ? `h-${attr}` : `${size}-h-${attr}`;
          const buildSelector = (attrStr, includeHover = false) => {
            const base = includeHover ? `:host([${attrStr}="${value}"]:hover)` : `:host([${attrStr}="${value}"])`;
            if (targetSelector) {
              return targetSelector.split(",").map((target) => `${base} ${target.trim()}`).join(", ");
            }
            const descendant = descendants[attr];
            if (descendant) {
              return `${base} ${descendant}`;
            }
            return base;
          };
          if (cssProperties) {
            const properties = cssProperties.split(" ");
            let propertyRules = properties.map((property) => `${property}: ${cssRule};`).join(" ");
            css2 += `
            ${buildSelector(attributeWithBreakpoint)}{
              ${propertyRules}
            }
            ${buildSelector(hoverAttributeWithBreakpoint, true)}{
              ${propertyRules}
            }
          `;
          } else {
            css2 += `
            ${buildSelector(attributeWithBreakpoint)}{
              ${rule}
            }
            ${buildSelector(hoverAttributeWithBreakpoint, true)}{
              ${rule}
            }
          `;
          }
        }
      }
      if (size !== "default") {
        css2 += `}`;
      }
    }
    return css2;
  };
  function endsWithDigit(inputValue) {
    if (inputValue === null) {
      return false;
    }
    if (inputValue.includes("/")) {
      return false;
    }
    const inputStr = String(inputValue);
    return /[0-9]$/.test(inputStr);
  }
  var endsWithPercentage = (inputStr) => {
    return /%$/.test(inputStr);
  };
  var endsWithFlexGrowUnit = (inputStr) => {
    return /^([1-9]|1[0-2])fg$/.test(inputStr);
  };
  var dimensionWithUnit = (dimension) => {
    if (dimension === void 0 || dimension === null) {
      return;
    }
    if (endsWithFlexGrowUnit(dimension)) {
      return dimension;
    }
    if (endsWithPercentage(dimension)) {
      return dimension;
    }
    if (endsWithDigit(dimension)) {
      return `${dimension}px`;
    }
    if (Object.keys(spacing).includes(dimension)) {
      return `var(${spacing[dimension]})`;
    }
    return dimension;
  };
  var spacing = {
    xs: "--spacing-xs",
    sm: "--spacing-sm",
    md: "--spacing-md",
    lg: "--spacing-lg",
    xl: "--spacing-xl"
  };
  function convertObjectToCssString(styleObject, selector = ":host") {
    let result = "";
    const orderedSizes = ["default", "xl", "lg", "md", "sm"];
    for (const size of orderedSizes) {
      const mediaQuery = mediaQueries[size];
      if (!styleObject[size] || Object.keys(styleObject[size]).length === 0) {
        continue;
      }
      if (size !== "default") {
        result += `${mediaQuery} {
`;
      }
      let cssString = "";
      for (const [key, value] of Object.entries(styleObject[size])) {
        if (value !== void 0 && value !== null) {
          cssString += `${key}: ${value} !important;
`;
        }
      }
      result += `${selector} {
    ${cssString.trim()}
    }
`;
      if (size !== "default") {
        result += `}
`;
      }
    }
    return result;
  }
  var deepEqual = (a, b) => {
    if (a === b)
      return true;
    if (a == null || b == null)
      return false;
    if (typeof a !== "object" || typeof b !== "object")
      return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
      return false;
    for (const key of keysA) {
      if (!keysB.includes(key))
        return false;
      if (!deepEqual(a[key], b[key]))
        return false;
    }
    return true;
  };

  // src/styles/buttonMarginStyles.js
  var styles = {
    mt: spacing,
    mr: spacing,
    mb: spacing,
    ml: spacing,
    m: spacing,
    mh: spacing,
    mv: spacing,
    s: {
      sm: `
    height: 28px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 4px;
    font-size: var(--xs-font-size);
    font-weight: var(--xs-font-weight);
    line-height: var(--xs-line-height);
    letter-spacing: var(--xs-letter-spacing);
    gap: var(--spacing-sm);
    `,
      md: `
    height: 32px;
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 4px;
    font-size: var(--sm-font-size);
    font-weight: var(--sm-font-weight);
    line-height: var(--sm-line-height);
    letter-spacing: var(--sm-letter-spacing);
    gap: var(--spacing-md);
    `,
      lg: `
    height: 40px;
    padding-left: 20px;
    padding-right: 20px;
    border-radius: 4px;
    font-size: var(--md-font-size);
    font-weight: var(--md-font-weight);
    line-height: var(--md-line-height);
    letter-spacing: var(--md-letter-spacing);
    gap: var(--spacing-md);
    `
    },
    v: {
      pr: `
      background-color: var(--primary);
      color: var(--primary-foreground);
    `,
      se: `
      background-color: var(--secondary);
      color: var(--secondary-foreground);
    `,
      de: `
      background-color: var(--destructive);
      color: var(--primary-foreground);
    `,
      ol: `
      background-color: transparent;
      color: var(--foreground);
      border-width: 1px;
    `,
      gh: `
      background-color: transparent;
      color: var(--foreground);
    `,
      lk: `
      background-color: transparent;
      color: var(--foreground);
    `
    }
  };
  var buttonMarginStyles_default = generateCSS(styles, {}, ".surface");

  // src/primitives/button.js
  var responsiveSizeBreakpoints = [
    { prefix: "sm", maxWidth: 640 },
    { prefix: "md", maxWidth: 768 },
    { prefix: "lg", maxWidth: 1024 },
    { prefix: "xl", maxWidth: 1280 }
  ];
  var RettangoliButtonElement = class _RettangoliButtonElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliButtonElement.styleSheet) {
        _RettangoliButtonElement.styleSheet = new CSSStyleSheet();
        _RettangoliButtonElement.styleSheet.replaceSync(css`
        :host {
          display: inline-flex;
        }
        slot {
          display: contents;
        }

        .surface {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          border-width: 0px;
          border-style: solid;
          border-color: var(--border);
          padding: 0px;
          height: 32px;
          padding-left: 16px;
          padding-right: 16px;
          border-radius: 4px;

          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);

          background-color: var(--primary);
          color: var(--primary-foreground);
          text-decoration: none;
        }

        a.surface,
        a.surface:link,
        a.surface:visited,
        a.surface:hover,
        a.surface:active {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          border-width: 0px;
          border-style: solid;
          border-color: var(--border);
          height: 32px;
          padding-left: 16px;
          padding-right: 16px;
          border-radius: 4px;
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          background-color: var(--primary);
          color: var(--primary-foreground);
          text-decoration: none;
        }

        .surface:hover {
          cursor: pointer;
          background-color: color-mix(
            in srgb,
            var(--primary) 85%,
            white 15%
          );
        }

        :host([disabled]) .surface {
          cursor: not-allowed;
        }

        .surface:active {
          cursor: pointer;
          background-color: color-mix(
            in srgb,
            var(--primary) 80%,
            white 20%
          );
        }

        :host([v="pr"]) .surface:hover {
          background-color: color-mix(
              in srgb,
              var(--primary) 85%,
              white 15%
            );
        }

        :host([v="pr"]) .surface:active {
          background-color: color-mix(
              in srgb,
              var(--primary) 80%,
              white 20%
            );
        }

        :host([v="se"]) .surface:hover {
          background-color: color-mix(
              in srgb,
              var(--secondary) 85%,
              white 15%
            );
        }

        :host([v="se"]) .surface:active {
          background-color: color-mix(
              in srgb,
              var(--secondary) 80%,
              white 20%
            );
        }

        :host([v="de"]) .surface:hover {
          background-color: color-mix(
              in srgb,
              var(--destructive) 85%,
              white 15%
            );
        }

        :host([v="de"]) .surface:active {
          background-color: color-mix(
              in srgb,
              var(--destructive) 80%,
              white 20%
            );
        }

        :host([v="ol"]) .surface:hover {
          background-color: var(--accent);
        }

        :host([v="gh"]) .surface:hover {
          background-color: var(--accent);
        }

        :host([v="lk"]) .surface:hover {
          text-decoration: underline;
        }

        /* Square button styles */
        :host([sq]) .surface {
          width: 32px;
          height: 32px;
          padding: 0;
          gap: 0;
        }

        :host([sq][s="sm"]) .surface {
          width: 24px;
          height: 24px;
          padding: 0;
          gap: 0;
        }

        :host([sq][s="lg"]) .surface {
          width: 40px;
          height: 40px;
          padding: 0;
          gap: 0;
        }

        .surface rtgl-svg {
          color: inherit;
        }

        ${buttonMarginStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliButtonElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliButtonElement.styleSheet];
      this._containerElement = null;
      this._surfaceElement = document.createElement("button");
      this._slotElement = document.createElement("slot");
      this._prefixIcon = null;
      this._suffixIcon = null;
      this._surfaceElement.className = "surface";
      this._surfaceElement.appendChild(this._slotElement);
      this._onWindowResize = this._onWindowResize.bind(this);
    }
    static get observedAttributes() {
      return [
        "key",
        "href",
        "new-tab",
        "rel",
        "w",
        "pre",
        "suf",
        "disabled",
        "v",
        "s",
        "sq",
        "sm-s",
        "md-s",
        "lg-s",
        "xl-s"
      ];
    }
    connectedCallback() {
      window.addEventListener("resize", this._onWindowResize);
      this._updateButton();
    }
    disconnectedCallback() {
      window.removeEventListener("resize", this._onWindowResize);
    }
    attributeChangedCallback(name, oldValue, newValue) {
      this._updateButton();
    }
    _onWindowResize() {
      if (this.hasAttribute("sm-s") || this.hasAttribute("md-s") || this.hasAttribute("lg-s") || this.hasAttribute("xl-s")) {
        this._updateIcon();
      }
    }
    _resolveResponsiveSizeToken() {
      const viewportWidth = window.innerWidth;
      for (const { prefix, maxWidth } of responsiveSizeBreakpoints) {
        const responsiveAttrName = `${prefix}-s`;
        if (viewportWidth <= maxWidth && this.hasAttribute(responsiveAttrName)) {
          return this.getAttribute(responsiveAttrName);
        }
      }
      return this.getAttribute("s");
    }
    _updateButton() {
      this.shadow.innerHTML = "";
      const isDisabled = this.hasAttribute("disabled");
      const href = this.getAttribute("href");
      const newTab = this.hasAttribute("new-tab");
      const rel = this.getAttribute("rel");
      const shouldUseAnchor = href && !isDisabled;
      const requiredTag = shouldUseAnchor ? "a" : "button";
      if (this._surfaceElement.tagName.toLowerCase() !== requiredTag) {
        const nextSurfaceElement = document.createElement(requiredTag);
        nextSurfaceElement.className = "surface";
        nextSurfaceElement.appendChild(this._slotElement);
        this._surfaceElement = nextSurfaceElement;
      }
      this._updateIcon();
      if (!this.hasAttribute("sq")) {
        this._updateWidth();
      } else {
        this.style.width = "";
        this.style.minWidth = "";
        this.style.maxWidth = "";
        this._surfaceElement.style.width = "";
        this._surfaceElement.style.minWidth = "";
        this._surfaceElement.style.maxWidth = "";
      }
      if (shouldUseAnchor) {
        applyLinkAttributes({
          linkElement: this._surfaceElement,
          href,
          newTab,
          rel
        });
        this._surfaceElement.removeAttribute("disabled");
      } else {
        this._surfaceElement.removeAttribute("href");
        this._surfaceElement.removeAttribute("target");
        this._surfaceElement.removeAttribute("rel");
        if (isDisabled) {
          this._surfaceElement.setAttribute("disabled", "");
        } else {
          this._surfaceElement.removeAttribute("disabled");
        }
      }
      this.shadow.appendChild(this._surfaceElement);
      this._containerElement = this._surfaceElement;
    }
    _updateIcon() {
      if (this._prefixIcon) {
        this._prefixIcon.remove();
        this._prefixIcon = null;
      }
      if (this._suffixIcon) {
        this._suffixIcon.remove();
        this._suffixIcon = null;
      }
      const iconSizeMap = {
        sm: 14,
        md: 18,
        lg: 22
      };
      const resolvedSizeToken = this._resolveResponsiveSizeToken();
      let size = 18;
      if (this.hasAttribute("sq")) {
        const buttonSizeMap = {
          sm: 14,
          lg: 22
        };
        size = buttonSizeMap[resolvedSizeToken] || 18;
      } else {
        size = iconSizeMap[resolvedSizeToken] || 18;
      }
      const prefixIcon = this.getAttribute("pre");
      if (prefixIcon) {
        this._prefixIcon = document.createElement("rtgl-svg");
        this._prefixIcon.setAttribute("svg", prefixIcon);
        this._prefixIcon.setAttribute("wh", size.toString());
        this._prefixIcon.style.color = "inherit";
        this._surfaceElement.insertBefore(this._prefixIcon, this._slotElement);
      }
      const suffixIcon = this.getAttribute("suf");
      if (suffixIcon) {
        this._suffixIcon = document.createElement("rtgl-svg");
        this._suffixIcon.setAttribute("svg", suffixIcon);
        this._suffixIcon.setAttribute("wh", size.toString());
        this._suffixIcon.style.color = "inherit";
        this._surfaceElement.appendChild(this._suffixIcon);
      }
    }
    _updateWidth() {
      const width = dimensionWithUnit(this.getAttribute("w"));
      if (width === "f") {
        this.style.width = "var(--width-stretch)";
        this.style.minWidth = "";
        this.style.maxWidth = "";
        this._surfaceElement.style.width = "100%";
        this._surfaceElement.style.minWidth = "";
        this._surfaceElement.style.maxWidth = "";
      } else if (width !== void 0 && width !== null) {
        this.style.width = width;
        this.style.minWidth = width;
        this.style.maxWidth = width;
        this._surfaceElement.style.width = "100%";
        this._surfaceElement.style.minWidth = "";
        this._surfaceElement.style.maxWidth = "";
      } else {
        this.style.width = "";
        this.style.minWidth = "";
        this.style.maxWidth = "";
        this._surfaceElement.style.width = "";
        this._surfaceElement.style.minWidth = "";
        this._surfaceElement.style.maxWidth = "";
      }
    }
    // Public method to get the actual button's bounding rect
    // This is needed because the host element has display: contents
    getBoundingClientRect() {
      if (this._surfaceElement) {
        return this._surfaceElement.getBoundingClientRect();
      }
      return super.getBoundingClientRect();
    }
  };
  var button_default = ({ render: render3, html }) => {
    return RettangoliButtonElement;
  };

  // src/styles/flexDirectionStyles.js
  var flexDirectionStyles_default = css`

  :host([d="h"]) {
    flex-direction: row;
  }
  :host([d="v"]) {
    flex-direction: column;
  }
  :host([d="h"]:not([ah])) {
    justify-content: flex-start;
  }
  :host([d="h"][ah="c"]) {
    justify-content: center;
  }
  :host([d="h"][ah="e"]) {
    justify-content: flex-end;
  }
  :host([d="h"]:not([av])) {
    align-items: flex-start;
  }
  :host([d="h"][av="c"]) {
    align-items: center;
    align-content: center;
  }
  :host([d="h"][av="e"]) {
    align-items: flex-end;
    align-content: flex-end;
  }
  
  /* Default/vertical direction - horizontal alignment */
  :host(:not([d]):not([ah])),
  :host([d="v"]:not([ah])) {
    align-items: flex-start;
  }
  :host(:not([d])[ah="c"]),
  :host([d="v"][ah="c"]) {
    align-items: center;
  }
  :host(:not([d])[ah="e"]),
  :host([d="v"][ah="e"]) {
    align-items: flex-end;
  }
  
  :host(:not([d]):not([av])),
  :host([d="v"]:not([av])) {
    justify-content: flex-start;
  }
  :host(:not([d])[av="c"]),
  :host([d="v"][av="c"]) {
    justify-content: center;
  }
  :host(:not([d])[av="e"]),
  :host([d="v"][av="e"]) {
    justify-content: flex-end;
  }
  
  @media screen and (max-width: 640px) {
    :host([sm-d="v"]) {
      flex-direction: column;
    }
    :host([sm-d="h"]) {
      flex-direction: row;
    }
    :host([sm-d="h"][sm-av="c"]) {
      align-items: center;
      align-content: center;
    }
    :host([sm-d="v"][sm-av="c"]) {
      justify-content: center;
    }
  }
`;

  // src/styles/cursorStyles.js
  var styles2 = {
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
      "zoom-out": "zoom-out"
    }
  };
  var cursorStyles_default = generateCSS(styles2);

  // src/styles/scrollStyles.js
  var scrollStyles_default = css`
:host([sh]:not([sv])) {
    overflow-x: scroll;
    flex-wrap: nowrap;
    min-width: 0;
}
:host([sv]:not([sh])) {
    overflow-y: scroll;
    flex-wrap: nowrap;
    min-height: 0;
}
:host([sh][sv]) {
    overflow: scroll;
    flex-wrap: nowrap;
    min-height: 0;
    min-width: 0;
}
:host([sh]),
:host([sv]) {
    -ms-overflow-style: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb, var(--muted-foreground)) var(--scrollbar-track, transparent);
}
:host([sh])::-webkit-scrollbar,
:host([sv])::-webkit-scrollbar {
    width: var(--scrollbar-size, 6px);
    height: var(--scrollbar-size, 6px);
    background: var(--scrollbar-track, transparent);
}
:host([sh])::-webkit-scrollbar-track,
:host([sv])::-webkit-scrollbar-track {
    background: var(--scrollbar-track, transparent);
}
:host([sh])::-webkit-scrollbar-thumb,
:host([sv])::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, var(--muted-foreground));
    border-radius: 9999px;
}
:host([sh])::-webkit-scrollbar-thumb:hover,
:host([sv])::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, var(--ring));
}
:host([overflow="hidden"]) {
    overflow: hidden;
    flex-wrap: nowrap;
}

`;

  // src/styles/viewStyles.js
  var borderWidth = {
    none: "0",
    xs: "--border-width-xs",
    sm: "--border-width-sm",
    md: "--border-width-md",
    lg: "--border-width-lg",
    xl: "--border-width-xl"
  };
  var styles3 = {
    bgc: {
      pr: `
    background-color: var(--primary);
    `,
      se: `
    background-color: var(--secondary);
    `,
      de: `
    background-color: var(--destructive);
    `,
      fg: `
    background-color: var(--foreground);
    `,
      bg: `
    background-color: var(--background);
    `,
      mu: `
    background-color: var(--muted);
    `,
      ac: `
    background-color: var(--accent);
    `,
      bo: `
    background-color: var(--border);
    `
    },
    pos: {
      rel: "relative",
      abs: "absolute",
      fix: "fixed"
    },
    edge: {
      f: `
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        height: 100%;
        `,
      t: `
        top: 0;
        right: 0;
        left: 0;
        `,
      r: `
        top: 0;
        right: 0;
        bottom: 0;
        height: 100%;
        `,
      b: `
        right: 0;
        bottom: 0;
        left: 0;
        `,
      l: `
        bottom: 0;
        left: 0;
        top: 0;
        height: 100%;
        `
    },
    shadow: {
      sm: "--shadow-sm",
      md: "--shadow-md",
      lg: "--shadow-lg"
    },
    pt: spacing,
    pr: spacing,
    pb: spacing,
    pl: spacing,
    p: spacing,
    ph: spacing,
    pv: spacing,
    g: spacing,
    gv: spacing,
    gh: spacing,
    bw: borderWidth,
    bwt: borderWidth,
    bwr: borderWidth,
    bwb: borderWidth,
    bwl: borderWidth,
    bc: {
      pr: "--primary",
      se: "--secondary",
      de: "--destructive",
      fg: "--foreground",
      bg: "--background",
      mu: "--muted",
      ac: "--accent",
      bo: "--border",
      tr: "transparent"
    },
    br: {
      xs: "--border-radius-xs",
      sm: "--border-radius-sm",
      md: "--border-radius-md",
      lg: "--border-radius-lg",
      xl: "--border-radius-xl",
      f: "--border-radius-f"
    }
  };
  var viewStyles_default = generateCSS(styles3);

  // src/styles/marginStyles.js
  var styles4 = {
    mt: spacing,
    mr: spacing,
    mb: spacing,
    ml: spacing,
    m: spacing,
    mh: spacing,
    mv: spacing
  };
  var marginStyles_default = generateCSS(styles4);

  // src/styles/anchorStyles.js
  var anchorStyles_default = css`
  a, a:link, a:visited, a:hover, a:active {
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
  }
`;

  // src/primitives/view.js
  var RettangoliViewElement = class _RettangoliViewElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliViewElement.styleSheet) {
        _RettangoliViewElement.styleSheet = new CSSStyleSheet();
        _RettangoliViewElement.styleSheet.replaceSync(css`
        slot {
          display: contents;
        }
        :host {
          display: flex;
          flex-direction: column;
          align-self: auto;
          align-content: flex-start;
          border-style: solid;
          border-width: 0;
          box-sizing: border-box;
          border-color: var(--border);
        }


        ${scrollStyles_default}
        ${flexDirectionStyles_default}
        ${marginStyles_default}
        ${cursorStyles_default}
        ${viewStyles_default}
        ${anchorStyles_default}
        ${overlayLinkStyles}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliViewElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliViewElement.styleSheet];
      this._styleElement = document.createElement("style");
      this._slotElement = document.createElement("slot");
      this._linkElement = null;
      this.shadow.appendChild(this._styleElement);
      this._updateDOM();
    }
    static get observedAttributes() {
      return [
        "href",
        "new-tab",
        "rel",
        ...permutateBreakpoints([
          ...styleMapKeys,
          "op",
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "sh",
          "sv",
          "z",
          "d",
          "ah",
          "av",
          "wrap",
          "no-wrap",
          "overflow"
        ])
      ];
    }
    _styles = createResponsiveStyleBuckets();
    _lastStyleString = "";
    _updateDOM() {
      const href = this.getAttribute("href");
      const newTab = this.hasAttribute("new-tab");
      const rel = this.getAttribute("rel");
      this._linkElement = syncLinkOverlay({
        shadowRoot: this.shadow,
        slotElement: this._slotElement,
        linkElement: this._linkElement,
        href,
        newTab,
        rel
      });
    }
    connectedCallback() {
      this.updateStyles();
    }
    updateStyles() {
      this._styles = createResponsiveStyleBuckets();
      responsiveStyleSizes.forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "width",
          dimension: width,
          fillValue: "var(--width-stretch)",
          allowFlexGrow: true
        });
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "height",
          dimension: height,
          fillValue: "100%",
          allowFlexGrow: true
        });
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "flex";
        }
        const direction = this.getAttribute(addSizePrefix("d"));
        const alignHorizontal = this.getAttribute(addSizePrefix("ah"));
        const alignVertical = this.getAttribute(addSizePrefix("av"));
        const effectiveDirection = getResponsiveAttribute({
          element: this,
          size,
          attr: "d"
        });
        if (direction === "h") {
          this._styles[size]["flex-direction"] = "row";
        } else if (direction === "v") {
          this._styles[size]["flex-direction"] = "column";
        } else if (size === "default" && !direction) {
          const hasResponsiveDirection = ["sm", "md", "lg", "xl"].some(
            (breakpoint) => this.hasAttribute(`${breakpoint}-d`)
          );
          if (hasResponsiveDirection) {
            this._styles[size]["flex-direction"] = "column";
          }
        }
        const isHorizontal = effectiveDirection === "h";
        const isVerticalOrDefault = effectiveDirection === "v" || !effectiveDirection;
        if (isHorizontal) {
          if (alignHorizontal === "c") {
            this._styles[size]["justify-content"] = "center";
          } else if (alignHorizontal === "e") {
            this._styles[size]["justify-content"] = "flex-end";
          } else if (alignHorizontal === "s") {
            this._styles[size]["justify-content"] = "flex-start";
          }
          if (alignVertical === "c") {
            this._styles[size]["align-items"] = "center";
            this._styles[size]["align-content"] = "center";
          } else if (alignVertical === "e") {
            this._styles[size]["align-items"] = "flex-end";
            this._styles[size]["align-content"] = "flex-end";
          } else if (alignVertical === "s") {
            this._styles[size]["align-items"] = "flex-start";
          }
        }
        if (isVerticalOrDefault && (alignHorizontal !== null || alignVertical !== null)) {
          if (alignHorizontal === "c") {
            this._styles[size]["align-items"] = "center";
          } else if (alignHorizontal === "e") {
            this._styles[size]["align-items"] = "flex-end";
          } else if (alignHorizontal === "s") {
            this._styles[size]["align-items"] = "flex-start";
          }
          if (alignVertical === "c") {
            this._styles[size]["justify-content"] = "center";
          } else if (alignVertical === "e") {
            this._styles[size]["justify-content"] = "flex-end";
          } else if (alignVertical === "s") {
            this._styles[size]["justify-content"] = "flex-start";
          }
        }
        const isWrap = this.hasAttribute(addSizePrefix("wrap"));
        const isNoWrap = this.hasAttribute(addSizePrefix("no-wrap"));
        if (isWrap) {
          this._styles[size]["flex-wrap"] = "wrap";
        }
        if (isNoWrap) {
          this._styles[size]["flex-wrap"] = "nowrap";
        }
        const scrollHorizontal = this.hasAttribute(addSizePrefix("sh"));
        const scrollVertical = this.hasAttribute(addSizePrefix("sv"));
        const overflow = this.getAttribute(addSizePrefix("overflow"));
        if (scrollHorizontal && scrollVertical) {
          this._styles[size]["overflow"] = "scroll";
          this._styles[size]["flex-wrap"] = "nowrap";
        } else if (scrollHorizontal) {
          this._styles[size]["overflow-x"] = "scroll";
          this._styles[size]["flex-wrap"] = "nowrap";
        } else if (scrollVertical) {
          this._styles[size]["overflow-y"] = "scroll";
          this._styles[size]["flex-wrap"] = "nowrap";
        }
        if (overflow === "hidden") {
          this._styles[size]["overflow"] = "hidden";
          this._styles[size]["flex-wrap"] = "nowrap";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles);
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "href" || name === "new-tab" || name === "rel") {
        this._updateDOM();
        return;
      }
      if (oldValue !== newValue) {
        this.updateStyles();
      }
    }
  };
  var view_default = ({ render: render3, html }) => {
    return RettangoliViewElement;
  };

  // src/styles/textStyles.js
  var styles5 = {
    ta: {
      s: "text-align: start;",
      c: "text-align: center;",
      e: "text-align: end;",
      j: "text-align: justify;"
    },
    s: {
      h1: `
      font-size: var(--h1-font-size);
      font-weight: var(--h1-font-weight);
      line-height: var(--h1-line-height);
      letter-spacing: var(--h1-letter-spacing);
    `,
      h2: `
      font-size: var(--h2-font-size);
      font-weight: var(--h2-font-weight);
      line-height: var(--h2-line-height);
      letter-spacing: var(--h2-letter-spacing);
    `,
      h3: `
      font-size: var(--h3-font-size);
      font-weight: var(--h3-font-weight);
      line-height: var(--h3-line-height);
      letter-spacing: var(--h3-letter-spacing);
    `,
      h4: `
      font-size: var(--h4-font-size);
      font-weight: var(--h4-font-weight);
      line-height: var(--h4-line-height);
      letter-spacing: var(--h4-letter-spacing);
    `,
      lg: `
      font-size: var(--lg-font-size);
      font-weight: var(--lg-font-weight);
      line-height: var(--lg-line-height);
      letter-spacing: var(--lg-letter-spacing);
    `,
      md: `
      font-size: var(--md-font-size);
      font-weight: var(--md-font-weight);
      line-height: var(--md-line-height);
      letter-spacing: var(--md-letter-spacing);
    `,
      sm: `
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
    `,
      xs: `
      font-size: var(--xs-font-size);
      font-weight: var(--xs-font-weight);
      line-height: var(--xs-line-height);
      letter-spacing: var(--xs-letter-spacing);
    `
    }
  };
  var textStyles_default = generateCSS(styles5);

  // src/styles/textColorStyles.js
  var styles6 = {
    c: {
      "pr": "color: var(--primary);",
      "se": "color: var(--secondary);",
      "de": "color: var(--destructive);",
      "fg": "color: var(--foreground);",
      "bg": "color: var(--background);",
      "mu": "color: var(--muted-foreground);",
      "ac": "color: var(--accent);",
      "bo": "color: var(--border);",
      "tr": "color: transparent;",
      "pr-fg": "color: var(--primary-foreground);",
      "se-fg": "color: var(--secondary-foreground);",
      "de-fg": "color: var(--destructive-foreground);",
      "mu-fg": "color: var(--muted-foreground);",
      "ac-fg": "color: var(--accent-foreground);"
    }
  };
  var textColorStyles_default = generateCSS(styles6);

  // src/primitives/text.js
  var RettangoliTextElement = class _RettangoliTextElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliTextElement.styleSheet) {
        _RettangoliTextElement.styleSheet = new CSSStyleSheet();
        _RettangoliTextElement.styleSheet.replaceSync(css`
        :host {
          display: block;
          font-size: var(--md-font-size);
          font-weight: var(--md-font-weight);
          line-height: var(--md-line-height);
          letter-spacing: var(--md-letter-spacing);
        }
        slot {
          display: contents;
        }
        :host ::slotted(a) {
          text-decoration: var(--anchor-text-decoration);
          color: var(--anchor-color);
        }
        :host ::slotted(a:hover) {
          text-decoration: var(--anchor-text-decoration-hover);
          color: var(--anchor-color-hover);
        }
        ${overlayLinkStyles}
        ${textStyles_default}
        ${textColorStyles_default}
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliTextElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliTextElement.styleSheet];
      this._slotElement = document.createElement("slot");
      this._linkElement = null;
      this._updateDOM();
    }
    static get observedAttributes() {
      return ["key", "w", "ellipsis", "href", "new-tab", "rel"];
    }
    connectedCallback() {
      this._updateStyling();
      this._updateDOM();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "href" || name === "new-tab" || name === "rel") {
        this._updateDOM();
      } else {
        this._updateStyling();
      }
    }
    _updateStyling() {
      const width = dimensionWithUnit(this.getAttribute("w"));
      const ellipsis = this.hasAttribute("ellipsis");
      if (ellipsis) {
        this.style.overflow = "hidden";
        this.style.textOverflow = "ellipsis";
        this.style.whiteSpace = "nowrap";
      } else {
        this.style.overflow = "";
        this.style.textOverflow = "";
        this.style.whiteSpace = "";
      }
      applyInlineWidthDimension({
        style: this.style,
        width,
        flexMinWidth: "0"
      });
    }
    _updateDOM() {
      const href = this.getAttribute("href");
      const newTab = this.hasAttribute("new-tab");
      const rel = this.getAttribute("rel");
      this._linkElement = syncLinkOverlay({
        shadowRoot: this.shadow,
        slotElement: this._slotElement,
        linkElement: this._linkElement,
        href,
        newTab,
        rel
      });
    }
  };
  var text_default = ({ render: render3, html }) => {
    return RettangoliTextElement;
  };

  // src/styles/viewStylesForTarget.js
  var borderWidth2 = {
    none: "0",
    xs: "--border-width-xs",
    sm: "--border-width-sm",
    md: "--border-width-md",
    lg: "--border-width-lg",
    xl: "--border-width-xl"
  };
  var styles7 = {
    bgc: {
      pr: `background-color: var(--primary);`,
      se: `background-color: var(--secondary);`,
      de: `background-color: var(--destructive);`,
      fg: `background-color: var(--foreground);`,
      bg: `background-color: var(--background);`,
      mu: `background-color: var(--muted);`,
      ac: `background-color: var(--accent);`,
      bo: `background-color: var(--border);`
    },
    pos: {
      rel: "relative",
      abs: "absolute",
      fix: "fixed"
    },
    shadow: {
      sm: "--shadow-sm",
      md: "--shadow-md",
      lg: "--shadow-lg"
    },
    bw: borderWidth2,
    bwt: borderWidth2,
    bwr: borderWidth2,
    bwb: borderWidth2,
    bwl: borderWidth2,
    bc: {
      pr: "--primary",
      se: "--secondary",
      de: "--destructive",
      fg: "--foreground",
      bg: "--background",
      mu: "--muted",
      ac: "--accent",
      bo: "--border",
      tr: "transparent"
    },
    br: {
      xs: "--border-radius-xs",
      sm: "--border-radius-sm",
      md: "--border-radius-md",
      lg: "--border-radius-lg",
      xl: "--border-radius-xl",
      f: "--border-radius-f"
    }
  };
  var viewStylesForTarget_default = (targetSelector) => generateCSS(styles7, {}, targetSelector);

  // src/styles/marginStylesForTarget.js
  var styles8 = {
    mt: spacing,
    mr: spacing,
    mb: spacing,
    ml: spacing,
    m: spacing,
    mh: spacing,
    mv: spacing
  };
  var marginStylesForTarget_default = (targetSelector) => generateCSS(styles8, {}, targetSelector);

  // src/primitives/image.js
  var RettangoliImageElement = class _RettangoliImageElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliImageElement.styleSheet) {
        _RettangoliImageElement.styleSheet = new CSSStyleSheet();
        _RettangoliImageElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        img, a {
          border-style: solid;
          box-sizing: border-box;
          overflow: hidden;
          border-width: 0;
        }
        :host([of="con"]) img {
          object-fit: contain;
        }
        :host([of="cov"]) img {
          object-fit: cover;
        }
        :host([of="none"]) img {
          object-fit: none;
        }
        :host([w]:not([h]):not([wh])) img,
        :host([sm-w]:not([sm-h]):not([sm-wh])) img,
        :host([md-w]:not([md-h]):not([md-wh])) img,
        :host([lg-w]:not([lg-h]):not([lg-wh])) img,
        :host([xl-w]:not([xl-h]):not([xl-wh])) img {
          height: auto;
        }

        ${anchorStyles_default}

        a {
          display: block;
          height: 100%;
          width: 100%;
        }

        ${viewStylesForTarget_default("img, a")}
        ${marginStylesForTarget_default("img, a")}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliImageElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliImageElement.styleSheet];
      this._styleElement = document.createElement("style");
      this._imgElement = document.createElement("img");
      this._linkElement = null;
      this.shadow.appendChild(this._styleElement);
      this._updateDOM();
    }
    static get observedAttributes() {
      return permutateBreakpoints([
        ...styleMapKeys,
        "key",
        "src",
        "alt",
        "href",
        "new-tab",
        "rel",
        "wh",
        "w",
        "h",
        "hide",
        "show",
        "op",
        "z",
        "of"
      ]);
    }
    _styles = createResponsiveStyleBuckets();
    _lastStyleString = "";
    _updateDOM() {
      const href = this.getAttribute("href");
      const newTab = this.hasAttribute("new-tab");
      const rel = this.getAttribute("rel");
      this._linkElement = syncLinkWrapper({
        shadowRoot: this.shadow,
        childElement: this._imgElement,
        linkElement: this._linkElement,
        href,
        newTab,
        rel
      });
    }
    connectedCallback() {
      this._updateImageAttributes();
      this.updateStyles();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "href" || name === "new-tab" || name === "rel") {
        this._updateDOM();
        return;
      }
      if (name === "src" || name === "alt") {
        this._updateImageAttributes();
        return;
      }
      if (oldValue !== newValue) {
        this.updateStyles();
      }
    }
    updateStyles() {
      this._styles = createResponsiveStyleBuckets();
      responsiveStyleSizes.forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "width",
          dimension: width,
          fillValue: "var(--width-stretch)"
        });
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "height",
          dimension: height,
          fillValue: "100%"
        });
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none !important";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block !important";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, "img, a");
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    _updateImageAttributes() {
      const src = this.getAttribute("src");
      const alt = this.getAttribute("alt");
      if (src !== null) {
        this._imgElement.setAttribute("src", src);
      } else {
        this._imgElement.removeAttribute("src");
      }
      if (alt !== null) {
        this._imgElement.setAttribute("alt", alt);
      } else {
        this._imgElement.removeAttribute("alt");
      }
    }
  };
  var image_default = ({ render: render3, html }) => {
    return RettangoliImageElement;
  };

  // src/styles/paddingSvgStyles.js
  var paddingSvgStyles_default = css`
:host([pt="xs"]) svg {
  padding-top: var(--spacing-xs);
}
:host([pt="sm"]) svg {
  padding-top: var(--spacing-sm);
}
:host([pt="md"]) svg {
  padding-top: var(--spacing-md);
}
:host([pt="lg"]) svg {
  padding-top: var(--spacing-lg);
}
:host([pt="xl"]) svg {
  padding-top: var(--spacing-xl);
}
:host([pr="xs"]) svg {
  padding-right: var(--spacing-xs);
}
:host([pr="sm"]) svg {
  padding-right: var(--spacing-sm);
}
:host([pr="md"]) svg {
  padding-right: var(--spacing-md);
}
:host([pr="lg"]) svg {
  padding-right: var(--spacing-lg);
}
:host([pr="xl"]) svg {
  padding-right: var(--spacing-xl);
}
:host([pb="xs"]) svg {
  padding-bottom: var(--spacing-xs);
}
:host([pb="sm"]) svg {
  padding-bottom: var(--spacing-sm);
}
:host([pb="md"]) svg {
  padding-bottom: var(--spacing-md);
}
:host([pb="lg"]) svg {
  padding-bottom: var(--spacing-lg);
}
:host([pb="xl"]) svg {
  padding-bottom: var(--spacing-xl);
}
:host([pl="xs"]) svg {
  padding-left: var(--spacing-xs);
}
:host([pl="sm"]) svg {
  padding-left: var(--spacing-sm);
}
:host([pl="md"]) svg {
  padding-left: var(--spacing-md);
}
:host([pl="lg"]) svg {
  padding-left: var(--spacing-lg);
}
:host([pl="xl"]) svg {
  padding-left: var(--spacing-xl);
}
:host([p="xs"]) svg {
  padding: var(--spacing-xs);
}
:host([p="sm"]) svg {
  padding: var(--spacing-sm);
}
:host([p="md"]) svg {
  padding: var(--spacing-md);
}
:host([p="lg"]) svg {
  padding: var(--spacing-lg);
}
:host([p="xl"]) svg {
  padding: var(--spacing-xl);
}
:host([ph="xs"]) svg {
  padding-left: var(--spacing-xs);
  padding-right: var(--spacing-xs);
}
:host([ph="sm"]) svg {
  padding-left: var(--spacing-sm);
  padding-right: var(--spacing-sm);
}
:host([ph="md"]) svg {
  padding-left: var(--spacing-md);
  padding-right: var(--spacing-md);
}
:host([ph="lg"]) svg {
  padding-left: var(--spacing-lg);
  padding-right: var(--spacing-lg);
}
:host([ph="xl"]) svg {
  padding-left: var(--spacing-xl);
  padding-right: var(--spacing-xl);
}
:host([pv="xs"]) svg {
  padding-top: var(--spacing-xs);
  padding-bottom: var(--spacing-xs);
}
:host([pv="sm"]) svg {
  padding-top: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
}
:host([pv="md"]) svg {
  padding-top: var(--spacing-md);
  padding-bottom: var(--spacing-md);
}
:host([pv="lg"]) svg {
  padding-top: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
}
:host([pv="xl"]) svg {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
}
`;

  // src/primitives/svg.js
  var RettangoliSvgElement = class _RettangoliSvgElement extends HTMLElement {
    static styleSheet = null;
    static _icons = {};
    static initializeStyleSheet() {
      if (!_RettangoliSvgElement.styleSheet) {
        _RettangoliSvgElement.styleSheet = new CSSStyleSheet();
        _RettangoliSvgElement.styleSheet.replaceSync(css`
        :host {
          color: var(--foreground);
          flex-shrink: 0;
        }
        ${textColorStyles_default}
        ${paddingSvgStyles_default}
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliSvgElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliSvgElement.styleSheet];
    }
    static get observedAttributes() {
      return ["key", "svg", "w", "h", "wh"];
    }
    static get icons() {
      return _RettangoliSvgElement._icons;
    }
    static addIcon(iconName, icon) {
      _RettangoliSvgElement._icons[iconName] = icon;
    }
    connectedCallback() {
      this._updateSizing();
      this._render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      this._updateSizing();
      this._render();
    }
    _updateSizing() {
      const wh = this.getAttribute("wh");
      const width = dimensionWithUnit(wh === null ? this.getAttribute("w") : wh);
      const height = dimensionWithUnit(wh === null ? this.getAttribute("h") : wh);
      if (width != null) {
        this.style.width = width;
      } else {
        this.style.width = "";
      }
      if (height != null) {
        this.style.height = height;
      } else {
        this.style.height = "";
      }
    }
    _render() {
      try {
        const iconName = this.getAttribute("svg");
        const svgStringContent = _RettangoliSvgElement._icons[iconName] || (window["rtglIcons"] || {})[iconName];
        if (svgStringContent) {
          this.shadow.innerHTML = svgStringContent;
          return;
        }
      } catch (error) {
        console.log("error in rtgl-svg render", error);
      }
      this.shadow.innerHTML = "";
    }
  };
  var svg_default = ({ render: render3, html }) => {
    return RettangoliSvgElement;
  };

  // src/primitives/input.js
  var inputStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];
  var RettangoliInputElement = class _RettangoliInputElement extends HTMLElement {
    static styleSheet = null;
    static inputSpecificAttributes = [
      "type",
      "disabled",
      "min",
      "max",
      "step",
      "s"
    ];
    static initializeStyleSheet() {
      if (!_RettangoliInputElement.styleSheet) {
        _RettangoliInputElement.styleSheet = new CSSStyleSheet();
        _RettangoliInputElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input {
          background-color: var(--background);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 32px;
          color: var(--foreground);
          outline: none;
        }
        :host([s="sm"]) input {
          font-size: var(--xs-font-size);
          font-weight: var(--xs-font-weight);
          line-height: var(--xs-line-height);
          letter-spacing: var(--xs-letter-spacing);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 24px;
        }
        input:focus {
          border-color: var(--foreground);
        }
        input:disabled {
          cursor: not-allowed;
        }
        input[type="date"],
        input[type="time"],
        input[type="datetime-local"] {
          color: var(--foreground);
          min-width: 0;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          border-radius: var(--border-radius-sm);
          opacity: 1;
          padding: 2px;
        }
        input[type="date"]::-webkit-datetime-edit,
        input[type="time"]::-webkit-datetime-edit,
        input[type="datetime-local"]::-webkit-datetime-edit {
          color: var(--foreground);
        }
        input[type="date"]::-webkit-datetime-edit-fields-wrapper,
        input[type="time"]::-webkit-datetime-edit-fields-wrapper,
        input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper {
          padding: 0;
        }
        input[type="date"]::-webkit-date-and-time-value,
        input[type="time"]::-webkit-date-and-time-value,
        input[type="datetime-local"]::-webkit-date-and-time-value {
          text-align: left;
        }
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliInputElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliInputElement.styleSheet];
      this._styles = createResponsiveStyleBuckets();
      this._lastStyleString = "";
      this._inputElement = document.createElement("input");
      this._styleElement = document.createElement("style");
      this.shadow.appendChild(this._styleElement);
      this.shadow.appendChild(this._inputElement);
      this._inputElement.addEventListener("input", this._onInput);
      this._inputElement.addEventListener("change", this._onChange);
    }
    static get observedAttributes() {
      return [
        "key",
        "type",
        "placeholder",
        "disabled",
        "value",
        "min",
        "max",
        "step",
        "s",
        ...permutateBreakpoints([
          ...inputStyleMapKeys,
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "op",
          "z"
        ])
      ];
    }
    get value() {
      return this._inputElement.value;
    }
    set value(newValue) {
      this._inputElement.value = newValue;
    }
    focus() {
      this._inputElement.focus();
    }
    _onInput = () => {
      this.dispatchEvent(new CustomEvent("value-input", {
        detail: {
          value: this._inputElement.value
        },
        bubbles: true
      }));
    };
    _onChange = () => {
      this.dispatchEvent(new CustomEvent("value-change", {
        detail: {
          value: this._inputElement.value
        },
        bubbles: true
      }));
    };
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }
      if (name === "key") {
        this._syncValueAttribute();
        return;
      }
      if (name === "value") {
        this._syncValueAttribute();
        return;
      }
      if (name === "placeholder") {
        this._syncPlaceholderAttribute();
        return;
      }
      if (_RettangoliInputElement.inputSpecificAttributes.includes(name)) {
        this._updateInputAttributes();
        return;
      }
      this.updateStyles();
    }
    updateStyles() {
      this._styles = createResponsiveStyleBuckets();
      responsiveStyleSizes.forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "width",
          dimension: width,
          fillValue: "var(--width-stretch)"
        });
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "height",
          dimension: height,
          fillValue: "100%"
        });
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, "input");
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    _setOrRemoveInputAttribute(name, value) {
      if (value === null || value === void 0 || value === "null") {
        this._inputElement.removeAttribute(name);
        return;
      }
      this._inputElement.setAttribute(name, value);
    }
    _syncValueAttribute() {
      this._inputElement.value = this.getAttribute("value") ?? "";
    }
    _syncPlaceholderAttribute() {
      this._setOrRemoveInputAttribute("placeholder", this.getAttribute("placeholder"));
    }
    _updateInputAttributes() {
      const requestedType = this.getAttribute("type");
      const allowedTypes = /* @__PURE__ */ new Set(["text", "password", "date", "time", "datetime-local"]);
      const type = allowedTypes.has(requestedType) ? requestedType : "text";
      const min = this.getAttribute("min");
      const max = this.getAttribute("max");
      const step = this.getAttribute("step");
      const isDisabled = this.hasAttribute("disabled");
      this._setOrRemoveInputAttribute("type", type);
      this._setOrRemoveInputAttribute("min", min);
      this._setOrRemoveInputAttribute("max", max);
      this._setOrRemoveInputAttribute("step", step);
      if (isDisabled) {
        this._inputElement.setAttribute("disabled", "");
      } else {
        this._inputElement.removeAttribute("disabled");
      }
    }
    connectedCallback() {
      this._updateInputAttributes();
      this._syncValueAttribute();
      this._syncPlaceholderAttribute();
      this.updateStyles();
    }
  };
  var input_default = ({ render: render3, html }) => {
    return RettangoliInputElement;
  };

  // src/primitives/input-date.js
  var BaseInputElement = input_default({});
  var FORCED_TYPE = "date";
  var RettangoliInputDateElement = class extends BaseInputElement {
    connectedCallback() {
      if (this.getAttribute("type") !== FORCED_TYPE) {
        super.setAttribute("type", FORCED_TYPE);
      }
      if (super.connectedCallback) {
        super.connectedCallback();
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "type" && newValue !== FORCED_TYPE) {
        if (this.getAttribute("type") !== FORCED_TYPE) {
          super.setAttribute("type", FORCED_TYPE);
        }
        return;
      }
      if (super.attributeChangedCallback) {
        super.attributeChangedCallback(name, oldValue, newValue);
      }
    }
  };
  var input_date_default = ({ render: render3, html }) => {
    return RettangoliInputDateElement;
  };

  // src/primitives/input-time.js
  var BaseInputElement2 = input_default({});
  var FORCED_TYPE2 = "time";
  var RettangoliInputTimeElement = class extends BaseInputElement2 {
    connectedCallback() {
      if (this.getAttribute("type") !== FORCED_TYPE2) {
        super.setAttribute("type", FORCED_TYPE2);
      }
      if (super.connectedCallback) {
        super.connectedCallback();
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "type" && newValue !== FORCED_TYPE2) {
        if (this.getAttribute("type") !== FORCED_TYPE2) {
          super.setAttribute("type", FORCED_TYPE2);
        }
        return;
      }
      if (super.attributeChangedCallback) {
        super.attributeChangedCallback(name, oldValue, newValue);
      }
    }
  };
  var input_time_default = ({ render: render3, html }) => {
    return RettangoliInputTimeElement;
  };

  // src/primitives/input-datetime.js
  var BaseInputElement3 = input_default({});
  var FORCED_TYPE3 = "datetime-local";
  var RettangoliInputDateTimeElement = class extends BaseInputElement3 {
    connectedCallback() {
      if (this.getAttribute("type") !== FORCED_TYPE3) {
        super.setAttribute("type", FORCED_TYPE3);
      }
      if (super.connectedCallback) {
        super.connectedCallback();
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "type" && newValue !== FORCED_TYPE3) {
        if (this.getAttribute("type") !== FORCED_TYPE3) {
          super.setAttribute("type", FORCED_TYPE3);
        }
        return;
      }
      if (super.attributeChangedCallback) {
        super.attributeChangedCallback(name, oldValue, newValue);
      }
    }
  };
  var input_datetime_default = ({ render: render3, html }) => {
    return RettangoliInputDateTimeElement;
  };

  // src/primitives/input-number.js
  var inputNumberStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];
  var RettangoliInputNumberElement = class _RettangoliInputNumberElement extends HTMLElement {
    static styleSheet = null;
    static inputSpecificAttributes = [
      "disabled",
      "step",
      "min",
      "max",
      "s"
    ];
    static initializeStyleSheet() {
      if (!_RettangoliInputNumberElement.styleSheet) {
        _RettangoliInputNumberElement.styleSheet = new CSSStyleSheet();
        _RettangoliInputNumberElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input {
          background-color: var(--background);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 32px;
          color: var(--foreground);
          outline: none;
        }
        :host([s="sm"]) input {
          font-size: var(--xs-font-size);
          font-weight: var(--xs-font-weight);
          line-height: var(--xs-line-height);
          letter-spacing: var(--xs-letter-spacing);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 24px;
        }
        input:focus {
          border-color: var(--foreground);
        }
        input:disabled {
          cursor: not-allowed;
        }
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliInputNumberElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliInputNumberElement.styleSheet];
      this._styles = createResponsiveStyleBuckets();
      this._lastStyleString = "";
      this._inputElement = document.createElement("input");
      this._styleElement = document.createElement("style");
      this.shadow.appendChild(this._styleElement);
      this.shadow.appendChild(this._inputElement);
      this._inputElement.addEventListener("input", this._onInput);
      this._inputElement.addEventListener("change", this._onChange);
    }
    static get observedAttributes() {
      return [
        "key",
        "placeholder",
        "disabled",
        "value",
        "step",
        "min",
        "max",
        "s",
        ...permutateBreakpoints([
          ...inputNumberStyleMapKeys,
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "op",
          "z"
        ])
      ];
    }
    get value() {
      return this._inputElement.value;
    }
    set value(newValue) {
      this._inputElement.value = newValue;
    }
    focus() {
      this._inputElement.focus();
    }
    _emitValueEvent = (eventName) => {
      const inputValue = this._inputElement.value;
      if (inputValue.trim() === "") {
        this.dispatchEvent(new CustomEvent(eventName, {
          detail: {
            value: null
          },
          bubbles: true
        }));
        return;
      }
      let numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue)) {
        numericValue = this._clampValueToBounds(numericValue);
        this._inputElement.value = numericValue.toString();
        this.dispatchEvent(new CustomEvent(eventName, {
          detail: {
            value: numericValue
          },
          bubbles: true
        }));
      }
    };
    _onInput = () => {
      this._emitValueEvent("value-input");
    };
    _onChange = () => {
      this._emitValueEvent("value-change");
    };
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }
      if (name === "key") {
        this._syncValueAttribute();
        return;
      }
      if (name === "value") {
        this._syncValueAttribute();
        return;
      }
      if (name === "placeholder") {
        this._syncPlaceholderAttribute();
        return;
      }
      if (_RettangoliInputNumberElement.inputSpecificAttributes.includes(name)) {
        this._updateInputAttributes();
        if (name === "min" || name === "max") {
          this._syncValueAttribute();
        }
        return;
      }
      this.updateStyles();
    }
    updateStyles() {
      this._styles = createResponsiveStyleBuckets();
      responsiveStyleSizes.forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "width",
          dimension: width,
          fillValue: "var(--width-stretch)"
        });
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "height",
          dimension: height,
          fillValue: "100%"
        });
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, "input");
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    _setOrRemoveInputAttribute(name, value) {
      if (value === null || value === void 0 || value === "null") {
        this._inputElement.removeAttribute(name);
        return;
      }
      this._inputElement.setAttribute(name, value);
    }
    _clampValueToBounds(value) {
      let nextValue = value;
      const minAttr = this.getAttribute("min");
      if (minAttr !== null) {
        const minValue = parseFloat(minAttr);
        if (!isNaN(minValue)) {
          nextValue = Math.max(nextValue, minValue);
        }
      }
      const maxAttr = this.getAttribute("max");
      if (maxAttr !== null) {
        const maxValue = parseFloat(maxAttr);
        if (!isNaN(maxValue)) {
          nextValue = Math.min(nextValue, maxValue);
        }
      }
      return nextValue;
    }
    _syncValueAttribute() {
      const value = this.getAttribute("value");
      if (value === null || value === void 0 || value === "") {
        this._inputElement.value = "";
        return;
      }
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        this._inputElement.value = "";
        return;
      }
      const clampedValue = this._clampValueToBounds(numericValue);
      this._inputElement.value = clampedValue.toString();
    }
    _syncPlaceholderAttribute() {
      this._setOrRemoveInputAttribute("placeholder", this.getAttribute("placeholder"));
    }
    _updateInputAttributes() {
      const step = this.getAttribute("step");
      const min = this.getAttribute("min");
      const max = this.getAttribute("max");
      const isDisabled = this.hasAttribute("disabled");
      this._inputElement.setAttribute("type", "number");
      this._setOrRemoveInputAttribute("step", step);
      this._setOrRemoveInputAttribute("min", min);
      this._setOrRemoveInputAttribute("max", max);
      if (isDisabled) {
        this._inputElement.setAttribute("disabled", "");
      } else {
        this._inputElement.removeAttribute("disabled");
      }
    }
    connectedCallback() {
      this._updateInputAttributes();
      this._syncValueAttribute();
      this._syncPlaceholderAttribute();
      this.updateStyles();
    }
  };
  var input_number_default = ({ render: render3, html }) => {
    return RettangoliInputNumberElement;
  };

  // src/primitives/textarea.js
  var RettangoliTextAreaElement = class _RettangoliTextAreaElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliTextAreaElement.styleSheet) {
        _RettangoliTextAreaElement.styleSheet = new CSSStyleSheet();
        _RettangoliTextAreaElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        textarea {
          font-family: inherit;
          background-color: var(--background);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding-top: var(--spacing-md);
          padding-bottom: var(--spacing-md);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          color: var(--foreground);
          outline: none;
        }
        textarea:focus {
          border-color: var(--foreground);
        }
        textarea:disabled {
          cursor: not-allowed;
        }
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliTextAreaElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliTextAreaElement.styleSheet];
      this._styles = {
        default: {},
        sm: {},
        md: {},
        lg: {},
        xl: {}
      };
      this._lastStyleString = "";
      this._textareaElement = document.createElement("textarea");
      this._styleElement = document.createElement("style");
      this.shadow.appendChild(this._styleElement);
      this.shadow.appendChild(this._textareaElement);
      this._textareaElement.addEventListener("input", this._onInput);
      this._textareaElement.addEventListener("change", this._onChange);
    }
    _onInput = () => {
      this.dispatchEvent(new CustomEvent("value-input", {
        detail: {
          value: this._textareaElement.value
        },
        bubbles: true
      }));
    };
    _onChange = () => {
      this.dispatchEvent(new CustomEvent("value-change", {
        detail: {
          value: this._textareaElement.value
        },
        bubbles: true
      }));
    };
    static get observedAttributes() {
      return [
        "key",
        "placeholder",
        "disabled",
        "value",
        "cols",
        "rows",
        ...permutateBreakpoints([
          ...styleMapKeys,
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "op",
          "z"
        ])
      ];
    }
    get value() {
      return this._textareaElement.value;
    }
    set value(val) {
      this._textareaElement.value = val;
    }
    connectedCallback() {
      this._updateTextareaAttributes();
    }
    // Public methods to proxy focus and select to internal textarea
    focus() {
      if (this._textareaElement) {
        this._textareaElement.focus();
      }
    }
    select() {
      if (this._textareaElement) {
        this._textareaElement.select();
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "key") {
        requestAnimationFrame(() => {
          const value = this.getAttribute("value");
          this._textareaElement.value = value ?? "";
        });
        return;
      }
      if (name === "value") {
        requestAnimationFrame(() => {
          const value = this.getAttribute("value");
          this._textareaElement.value = value ?? "";
        });
      }
      if (name === "placeholder") {
        requestAnimationFrame(() => {
          const placeholder = this.getAttribute("placeholder");
          if (placeholder === void 0 || placeholder === "null") {
            this._textareaElement.removeAttribute("placeholder");
          } else {
            this._textareaElement.setAttribute("placeholder", placeholder ?? "");
          }
        });
      }
      if (["cols", "rows", "disabled"].includes(name)) {
        this._updateTextareaAttributes();
        return;
      }
      this._styles = {
        default: {},
        sm: {},
        md: {},
        lg: {},
        xl: {}
      };
      ["default", "sm", "md", "lg", "xl"].forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        if (width === "f") {
          this._styles[size].width = "var(--width-stretch)";
        } else if (width !== void 0) {
          this._styles[size].width = width;
          this._styles[size]["min-width"] = width;
          this._styles[size]["max-width"] = width;
        }
        if (height === "f") {
          this._styles[size].height = "100%";
        } else if (height !== void 0) {
          this._styles[size].height = height;
          this._styles[size]["min-height"] = height;
          this._styles[size]["max-height"] = height;
        }
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, "textarea");
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    _updateTextareaAttributes() {
      const cols = this.getAttribute("cols");
      const rows = this.getAttribute("rows");
      const isDisabled = this.hasAttribute("disabled");
      if (cols !== null) {
        this._textareaElement.setAttribute("cols", cols);
      } else {
        this._textareaElement.removeAttribute("cols");
      }
      if (rows !== null) {
        this._textareaElement.setAttribute("rows", rows);
      } else {
        this._textareaElement.removeAttribute("rows");
      }
      if (isDisabled) {
        this._textareaElement.setAttribute("disabled", "");
      } else {
        this._textareaElement.removeAttribute("disabled");
      }
    }
  };
  var textarea_default = ({ render: render3, html }) => {
    return RettangoliTextAreaElement;
  };

  // src/primitives/colorPicker.js
  var colorPickerStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];
  var HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
  var RettangoliColorPickerElement = class _RettangoliColorPickerElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliColorPickerElement.styleSheet) {
        _RettangoliColorPickerElement.styleSheet = new CSSStyleSheet();
        _RettangoliColorPickerElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input[type="color"] {
          background-color: var(--background);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding: 2px;
          height: 32px;
          width: 32px;
          cursor: pointer;
          outline: none;
        }
        input[type="color"]:focus {
          border-color: var(--foreground);
        }
        input[type="color"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliColorPickerElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliColorPickerElement.styleSheet];
      this._styles = createResponsiveStyleBuckets();
      this._lastStyleString = "";
      this._inputElement = document.createElement("input");
      this._inputElement.type = "color";
      this._styleElement = document.createElement("style");
      this.shadow.appendChild(this._styleElement);
      this.shadow.appendChild(this._inputElement);
      this._inputElement.addEventListener("change", this._onChange);
      this._inputElement.addEventListener("input", this._onInput);
    }
    static get observedAttributes() {
      return [
        "key",
        "value",
        "disabled",
        ...permutateBreakpoints([
          ...colorPickerStyleMapKeys,
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "op",
          "z"
        ])
      ];
    }
    get value() {
      return this._inputElement.value;
    }
    set value(newValue) {
      this._inputElement.value = newValue;
    }
    _onChange = () => {
      this.dispatchEvent(new CustomEvent("value-change", {
        detail: {
          value: this._inputElement.value
        },
        bubbles: true
      }));
    };
    _onInput = () => {
      this.dispatchEvent(new CustomEvent("value-input", {
        detail: {
          value: this._inputElement.value
        },
        bubbles: true
      }));
    };
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }
      if (name === "key") {
        this._syncValueAttribute();
        return;
      }
      if (["value", "disabled"].includes(name)) {
        this._updateInputAttributes();
        return;
      }
      this.updateStyles();
    }
    updateStyles() {
      this._styles = createResponsiveStyleBuckets();
      responsiveStyleSizes.forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "width",
          dimension: width,
          fillValue: "var(--width-stretch)"
        });
        applyDimensionToStyleBucket({
          styleBucket: this._styles[size],
          axis: "height",
          dimension: height,
          fillValue: "100%"
        });
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, 'input[type="color"]');
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    _syncValueAttribute() {
      const value = this.getAttribute("value");
      if (value === null) {
        this._inputElement.value = "#000000";
        return;
      }
      this._inputElement.value = HEX_COLOR_REGEX.test(value) ? value : "#000000";
    }
    _updateInputAttributes() {
      const isDisabled = this.hasAttribute("disabled");
      this._syncValueAttribute();
      if (isDisabled) {
        this._inputElement.setAttribute("disabled", "");
      } else {
        this._inputElement.removeAttribute("disabled");
      }
    }
    connectedCallback() {
      this._updateInputAttributes();
      this.updateStyles();
    }
  };
  var colorPicker_default = ({ render: render3, html }) => {
    return RettangoliColorPickerElement;
  };

  // src/primitives/slider.js
  var RettangoliSliderElement = class _RettangoliSliderElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliSliderElement.styleSheet) {
        _RettangoliSliderElement.styleSheet = new CSSStyleSheet();
        _RettangoliSliderElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          background: var(--muted);
          border-radius: var(--border-radius-full);
          outline: none;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--foreground);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--foreground);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        input[type="range"]:hover::-webkit-slider-thumb {
          transform: scale(1.1);
        }
        input[type="range"]:hover::-moz-range-thumb {
          transform: scale(1.1);
        }
        input[type="range"]:focus {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
        }
        input[type="range"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        input[type="range"]:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }
        input[type="range"]:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliSliderElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliSliderElement.styleSheet];
      this._styles = {
        default: {},
        sm: {},
        md: {},
        lg: {},
        xl: {}
      };
      this._lastStyleString = "";
      this._inputElement = document.createElement("input");
      this._inputElement.type = "range";
      this._styleElement = document.createElement("style");
      this.shadow.appendChild(this._styleElement);
      this.shadow.appendChild(this._inputElement);
      this._inputElement.addEventListener("input", this._onInput);
      this._inputElement.addEventListener("change", this._onChange);
    }
    static get observedAttributes() {
      return [
        "key",
        "value",
        "min",
        "max",
        "step",
        "disabled",
        ...permutateBreakpoints([
          ...styleMapKeys,
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "op",
          "z"
        ])
      ];
    }
    get value() {
      return this._inputElement.value;
    }
    set value(newValue) {
      this._inputElement.value = newValue;
    }
    _onInput = () => {
      this.dispatchEvent(new CustomEvent("value-input", {
        detail: {
          value: Number(this._inputElement.value)
        },
        bubbles: true
      }));
    };
    _onChange = () => {
      this.dispatchEvent(new CustomEvent("value-change", {
        detail: {
          value: Number(this._inputElement.value)
        },
        bubbles: true
      }));
    };
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "key" && oldValue !== newValue) {
        requestAnimationFrame(() => {
          const value = this.getAttribute("value");
          const min = this.getAttribute("min") || "0";
          this._inputElement.value = value ?? min;
        });
        return;
      }
      if (["value", "min", "max", "step", "disabled"].includes(name)) {
        this._updateInputAttributes();
        return;
      }
      this._styles = {
        default: {},
        sm: {},
        md: {},
        lg: {},
        xl: {}
      };
      ["default", "sm", "md", "lg", "xl"].forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        if (width === "f") {
          this._styles[size].width = "var(--width-stretch)";
        } else if (width !== void 0) {
          this._styles[size].width = width;
          this._styles[size]["min-width"] = width;
          this._styles[size]["max-width"] = width;
        }
        if (height === "f") {
          this._styles[size].height = "100%";
        } else if (height !== void 0) {
          this._styles[size].height = height;
          this._styles[size]["min-height"] = height;
          this._styles[size]["max-height"] = height;
        }
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, 'input[type="range"]');
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    _updateInputAttributes() {
      const value = this.getAttribute("value");
      const min = this.getAttribute("min");
      const max = this.getAttribute("max");
      const step = this.getAttribute("step");
      const isDisabled = this.hasAttribute("disabled");
      if (value !== null) {
        this._inputElement.value = value;
      } else {
        this._inputElement.value = min ?? 0;
      }
      if (min !== null) {
        this._inputElement.min = min;
      } else {
        this._inputElement.min = "0";
      }
      if (max !== null) {
        this._inputElement.max = max;
      } else {
        this._inputElement.max = "100";
      }
      if (step !== null) {
        this._inputElement.step = step;
      } else {
        this._inputElement.step = "1";
      }
      if (isDisabled) {
        this._inputElement.setAttribute("disabled", "");
      } else {
        this._inputElement.removeAttribute("disabled");
      }
    }
    connectedCallback() {
      this._updateInputAttributes();
    }
  };
  var slider_default = ({ render: render3, html }) => {
    return RettangoliSliderElement;
  };

  // src/primitives/checkbox.js
  var RettangoliCheckboxElement = class _RettangoliCheckboxElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliCheckboxElement.styleSheet) {
        _RettangoliCheckboxElement.styleSheet = new CSSStyleSheet();
        _RettangoliCheckboxElement.styleSheet.replaceSync(css`
        :host {
          display: inline-flex;
        }
        .checkbox-wrapper {
          display: inline-flex;
          align-items: flex-start;
          cursor: pointer;
          color: var(--foreground);
        }
        :host([has-label]) .checkbox-wrapper {
          gap: var(--spacing-sm);
        }
        :host([disabled]) .checkbox-wrapper {
          cursor: not-allowed;
        }
        .checkbox-label {
          display: none;
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          user-select: none;
        }
        :host([has-label]) .checkbox-label {
          display: block;
        }
        input[type="checkbox"] {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid var(--muted-foreground);
          border-radius: var(--border-radius-sm);
          background: var(--muted);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          margin: 0;
          flex-shrink: 0;
        }
        input[type="checkbox"]:checked {
          background: var(--muted);
          border-color: var(--foreground);
        }
        input[type="checkbox"]:checked::after {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 6px;
          height: 10px;
          border: solid var(--foreground);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        input[type="checkbox"]:hover {
          border-color: var(--foreground);
        }
        input[type="checkbox"]:focus {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
        }
        input[type="checkbox"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        ${marginStyles_default}
        ${cursorStyles_default}
      `);
      }
    }
    constructor() {
      super();
      _RettangoliCheckboxElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliCheckboxElement.styleSheet];
      this._styles = {
        default: {},
        sm: {},
        md: {},
        lg: {},
        xl: {}
      };
      this._lastStyleString = "";
      this._inputElement = document.createElement("input");
      this._inputElement.type = "checkbox";
      this._wrapperElement = document.createElement("label");
      this._wrapperElement.className = "checkbox-wrapper";
      this._labelElement = document.createElement("span");
      this._labelElement.className = "checkbox-label";
      this._labelSlotElement = document.createElement("slot");
      this._labelSlotElement.addEventListener("slotchange", () => {
        this._updateLabelState();
      });
      this._labelElement.appendChild(this._labelSlotElement);
      this._styleElement = document.createElement("style");
      this.shadow.appendChild(this._styleElement);
      this._wrapperElement.appendChild(this._inputElement);
      this._wrapperElement.appendChild(this._labelElement);
      this.shadow.appendChild(this._wrapperElement);
      this._inputElement.addEventListener("change", this._onChange);
    }
    static get observedAttributes() {
      return [
        "key",
        "checked",
        "disabled",
        "label",
        ...permutateBreakpoints([
          ...styleMapKeys,
          "wh",
          "w",
          "h",
          "hide",
          "show",
          "op",
          "z"
        ])
      ];
    }
    get checked() {
      return this._inputElement.checked;
    }
    set checked(val) {
      this._inputElement.checked = Boolean(val);
    }
    get value() {
      return this._inputElement.checked;
    }
    set value(val) {
      this._inputElement.checked = Boolean(val);
    }
    _onChange = () => {
      this.dispatchEvent(new CustomEvent("value-change", {
        detail: {
          value: this._inputElement.checked
        },
        bubbles: true
      }));
    };
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "key" && oldValue !== newValue) {
        requestAnimationFrame(() => {
          const checked = this.hasAttribute("checked");
          this._inputElement.checked = checked;
        });
        return;
      }
      if (name === "checked") {
        this._inputElement.checked = newValue !== null;
        return;
      }
      if (name === "disabled") {
        if (newValue !== null) {
          this._inputElement.setAttribute("disabled", "");
        } else {
          this._inputElement.removeAttribute("disabled");
        }
        return;
      }
      if (name === "label") {
        this._updateLabelState();
        return;
      }
      this._styles = {
        default: {},
        sm: {},
        md: {},
        lg: {},
        xl: {}
      };
      ["default", "sm", "md", "lg", "xl"].forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };
        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("op"));
        const zIndex = this.getAttribute(addSizePrefix("z"));
        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }
        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }
        if (width === "f") {
          this._styles[size].width = "var(--width-stretch)";
        } else if (width !== void 0) {
          this._styles[size].width = width;
          this._styles[size]["min-width"] = width;
          this._styles[size]["max-width"] = width;
        }
        if (height === "f") {
          this._styles[size].height = "100%";
        } else if (height !== void 0) {
          this._styles[size].height = height;
          this._styles[size]["min-height"] = height;
          this._styles[size]["max-height"] = height;
        }
        if (this.hasAttribute(addSizePrefix("hide"))) {
          this._styles[size].display = "none";
        }
        if (this.hasAttribute(addSizePrefix("show"))) {
          this._styles[size].display = "block";
        }
      });
      const newStyleString = convertObjectToCssString(this._styles, 'input[type="checkbox"]');
      if (newStyleString !== this._lastStyleString) {
        this._styleElement.textContent = newStyleString;
        this._lastStyleString = newStyleString;
      }
    }
    connectedCallback() {
      const checked = this.hasAttribute("checked");
      this._inputElement.checked = checked;
      if (this.hasAttribute("disabled")) {
        this._inputElement.setAttribute("disabled", "");
      }
      this._updateLabelState();
    }
    _updateLabelState() {
      const fallbackLabel = this.getAttribute("label");
      this._labelSlotElement.textContent = fallbackLabel ?? "";
      const assignedNodes = this._labelSlotElement.assignedNodes({ flatten: true });
      const hasAssignedLabel = assignedNodes.some((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.trim().length > 0;
        }
        return node.nodeType === Node.ELEMENT_NODE;
      });
      const hasFallbackLabel = typeof fallbackLabel === "string" && fallbackLabel.trim().length > 0;
      if (hasAssignedLabel || hasFallbackLabel) {
        this.setAttribute("has-label", "");
      } else {
        this.removeAttribute("has-label");
      }
    }
  };
  var checkbox_default = ({ render: render3, html }) => {
    return RettangoliCheckboxElement;
  };

  // src/primitives/dialog.js
  var MIN_MARGIN_PX = 40;
  var MAX_LAYOUT_RETRIES = 6;
  var RettangoliDialogElement = class _RettangoliDialogElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliDialogElement.styleSheet) {
        _RettangoliDialogElement.styleSheet = new CSSStyleSheet();
        _RettangoliDialogElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }

        dialog {
          padding: 0;
          border: none;
          background: transparent;
          margin: auto;
          overflow-y: scroll;
          color: inherit;
          max-height: 100vh;
          height: 100vh;
          max-width: 100vw;
          scrollbar-width: none;
          outline: none;
        }

        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }

        slot[name="content"] {
          background-color: var(--background) !important;
          display: block;
          padding: var(--spacing-lg);
          border: 1px solid var(--border);
          border-radius: var(--border-radius-md);
          margin-left: var(--spacing-lg);
          margin-right: var(--spacing-lg);
          width: fit-content;
          max-width: calc(100vw - 2 * var(--spacing-lg));
          /* Default margins will be set dynamically via JavaScript for adaptive centering */
          margin-top: 40px;
          margin-bottom: 40px;
        }

        /* Size attribute styles */
        :host([s="sm"]) slot[name="content"] {
          width: 33vw;
        }

        :host([s="md"]) slot[name="content"] {
          width: 50vw;
        }

        :host([s="lg"]) slot[name="content"] {
          width: 80vw;
        }

        :host([s="f"]) slot[name="content"] {
          width: 100vw;
          margin-left: 0;
          margin-right: 0;
        }

        @keyframes dialog-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        dialog[open] slot[name="content"] {
          animation: dialog-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          dialog[open] slot[name="content"] {
            animation: none;
          }
        }
      `);
      }
    }
    constructor() {
      super();
      _RettangoliDialogElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliDialogElement.styleSheet];
      this._dialogElement = document.createElement("dialog");
      this.shadow.appendChild(this._dialogElement);
      this._slotElement = null;
      this._isConnected = false;
      this._adaptiveFrameId = null;
      this._layoutRetryCount = 0;
      this._observedContentElement = null;
      this._resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
        this._scheduleAdaptiveCentering();
      }) : null;
      this._onSlotChange = () => {
        this._observeAssignedContent();
        this._scheduleAdaptiveCentering({ resetRetries: true });
      };
      this._onWindowResize = () => {
        this._scheduleAdaptiveCentering({ resetRetries: true });
      };
      this._mouseDownInContent = false;
      this._dialogElement.addEventListener("mousedown", (e) => {
        this._mouseDownInContent = e.target !== this._dialogElement;
      });
      this._dialogElement.addEventListener("click", (e) => {
        if (e.target === this._dialogElement && !this._mouseDownInContent) {
          this._attemptClose();
        }
        this._mouseDownInContent = false;
      });
      this._dialogElement.addEventListener("contextmenu", (e) => {
        if (e.target === this._dialogElement && !this._mouseDownInContent) {
          e.preventDefault();
          this._attemptClose();
        }
        this._mouseDownInContent = false;
      });
      this._dialogElement.addEventListener("cancel", (e) => {
        e.preventDefault();
        this._attemptClose();
      });
    }
    _attemptClose() {
      this.dispatchEvent(new CustomEvent("close", {
        detail: {},
        bubbles: true
      }));
    }
    static get observedAttributes() {
      return ["open", "w", "s"];
    }
    connectedCallback() {
      this._updateDialog();
      this._isConnected = true;
      if (this.hasAttribute("open")) {
        this._showModal();
      }
    }
    disconnectedCallback() {
      this._isConnected = false;
      this._stopAdaptiveObservers();
      if (this._slotElement) {
        this._slotElement.removeEventListener("slotchange", this._onSlotChange);
      }
      if (this._dialogElement.open) {
        this._dialogElement.close();
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "open") {
        if (newValue !== null && !this._dialogElement.open && this._isConnected) {
          this._showModal();
        } else if (newValue === null && this._dialogElement.open) {
          this._hideModal();
        }
      } else if (name === "w") {
        this._updateWidth();
      } else if (name === "s") {
      }
    }
    _updateDialog() {
      this._updateWidth();
    }
    _updateWidth() {
      const width = this.getAttribute("w");
      if (width) {
        this._dialogElement.style.width = width;
      } else {
        this._dialogElement.style.width = "";
      }
    }
    // Internal methods
    _showModal() {
      if (!this._dialogElement.open) {
        if (!this._slotElement) {
          this._slotElement = document.createElement("slot");
          this._slotElement.setAttribute("name", "content");
          this._slotElement.addEventListener("slotchange", this._onSlotChange);
          this._dialogElement.appendChild(this._slotElement);
        }
        this._dialogElement.showModal();
        this._dialogElement.scrollTop = 0;
        window.addEventListener("resize", this._onWindowResize);
        this._observeAssignedContent();
        this._scheduleAdaptiveCentering({ resetRetries: true });
      }
    }
    _hideModal() {
      if (this._dialogElement.open) {
        this._stopAdaptiveObservers();
        this._dialogElement.close();
        if (this._slotElement) {
          this._slotElement.removeEventListener("slotchange", this._onSlotChange);
          this._slotElement.style.marginTop = "";
          this._slotElement.style.marginBottom = "";
          this._dialogElement.removeChild(this._slotElement);
          this._slotElement = null;
        }
        this._dialogElement.style.height = "";
      }
    }
    _stopAdaptiveObservers() {
      if (this._adaptiveFrameId !== null) {
        cancelAnimationFrame(this._adaptiveFrameId);
        this._adaptiveFrameId = null;
      }
      this._layoutRetryCount = 0;
      window.removeEventListener("resize", this._onWindowResize);
      if (this._resizeObserver && this._observedContentElement) {
        this._resizeObserver.unobserve(this._observedContentElement);
      }
      this._observedContentElement = null;
    }
    _getAssignedContentElement() {
      if (!this._slotElement) {
        return null;
      }
      const assignedElements = this._slotElement.assignedElements({ flatten: true });
      return assignedElements.length > 0 ? assignedElements[0] : null;
    }
    _observeAssignedContent() {
      if (!this._resizeObserver) {
        return;
      }
      const nextContentElement = this._getAssignedContentElement();
      if (this._observedContentElement === nextContentElement) {
        return;
      }
      if (this._observedContentElement) {
        this._resizeObserver.unobserve(this._observedContentElement);
      }
      this._observedContentElement = nextContentElement;
      if (this._observedContentElement) {
        this._resizeObserver.observe(this._observedContentElement);
      }
    }
    _scheduleAdaptiveCentering({ resetRetries = false } = {}) {
      if (!this._slotElement || !this._dialogElement.open) {
        return;
      }
      if (resetRetries) {
        this._layoutRetryCount = 0;
      }
      if (this._adaptiveFrameId !== null) {
        cancelAnimationFrame(this._adaptiveFrameId);
      }
      this._adaptiveFrameId = requestAnimationFrame(() => {
        this._adaptiveFrameId = requestAnimationFrame(() => {
          this._adaptiveFrameId = null;
          this._applyAdaptiveCentering();
        });
      });
    }
    _applyAdaptiveCentering() {
      if (!this._slotElement || !this._dialogElement.open) {
        return;
      }
      this._observeAssignedContent();
      const contentElement = this._getAssignedContentElement();
      const contentHeight = contentElement ? Math.round(contentElement.getBoundingClientRect().height) : 0;
      if (contentHeight <= 0) {
        if (this._layoutRetryCount < MAX_LAYOUT_RETRIES) {
          this._layoutRetryCount += 1;
          this._scheduleAdaptiveCentering();
        }
        return;
      }
      this._layoutRetryCount = 0;
      const viewportHeight = window.innerHeight;
      if (contentHeight >= viewportHeight - 2 * MIN_MARGIN_PX) {
        this._slotElement.style.marginTop = `${MIN_MARGIN_PX}px`;
        this._slotElement.style.marginBottom = `${MIN_MARGIN_PX}px`;
        this._dialogElement.style.height = "100vh";
        return;
      }
      const totalMargin = viewportHeight - contentHeight;
      const margin = Math.floor(totalMargin / 2);
      this._slotElement.style.marginTop = `${margin}px`;
      this._slotElement.style.marginBottom = `${margin}px`;
      this._dialogElement.style.height = "auto";
    }
    // Expose dialog element for advanced usage
    get dialog() {
      return this._dialogElement;
    }
  };
  var dialog_default = ({ render: render3, html }) => {
    return RettangoliDialogElement;
  };

  // src/primitives/popover.js
  var RettangoliPopoverElement = class _RettangoliPopoverElement extends HTMLElement {
    static styleSheet = null;
    static initializeStyleSheet() {
      if (!_RettangoliPopoverElement.styleSheet) {
        _RettangoliPopoverElement.styleSheet = new CSSStyleSheet();
        _RettangoliPopoverElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }

        dialog {
          padding: 0;
          border: none;
          background: transparent;
          margin: 0;
          overflow: visible;
          color: inherit;
          scrollbar-width: none;
          outline: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          /* Prevent dialog from being focused */
          pointer-events: none;
        }

        dialog::backdrop {
          background-color: transparent;
          /* Allow backdrop to receive clicks */
          pointer-events: auto;
        }

        .popover-container {
          position: fixed;
          z-index: 1000;
          outline: none;
          pointer-events: auto;
        }

        :host([open]) .popover-container {
          display: block;
          visibility: hidden;
        }

        :host([open][positioned]) .popover-container {
          visibility: visible;
        }

        slot[name="content"] {
          display: block;
          background-color: var(--muted);
          border: 1px solid var(--border);
          border-radius: var(--border-radius-md);
          padding: var(--spacing-md);
          min-width: 200px;
          max-width: 400px;
        }
      `);
      }
    }
    constructor() {
      super();
      _RettangoliPopoverElement.initializeStyleSheet();
      this.shadow = this.attachShadow({ mode: "open" });
      this.shadow.adoptedStyleSheets = [_RettangoliPopoverElement.styleSheet];
      this._dialogElement = document.createElement("dialog");
      this.shadow.appendChild(this._dialogElement);
      this._dialogElement.addEventListener("click", (e) => {
        e.stopPropagation();
        const path = e.composedPath();
        const clickedOnBackdrop = path[0] === this._dialogElement || path[0].nodeName === "DIALOG" && path[0] === this._dialogElement;
        if (clickedOnBackdrop) {
          this._emitClose();
        }
      });
      this._dialogElement.addEventListener("contextmenu", (e) => {
        const path = e.composedPath();
        const clickedOnBackdrop = path[0] === this._dialogElement || path[0].nodeName === "DIALOG" && path[0] === this._dialogElement;
        if (clickedOnBackdrop) {
          e.preventDefault();
          this._emitClose();
        }
      });
      this._dialogElement.addEventListener("cancel", (e) => {
        e.preventDefault();
        this._emitClose();
      });
      this._popoverContainer = document.createElement("div");
      this._popoverContainer.className = "popover-container";
      this._dialogElement.appendChild(this._popoverContainer);
      this._slotElement = null;
      this._isOpen = false;
    }
    _emitClose() {
      this.dispatchEvent(new CustomEvent("close", {
        detail: {},
        bubbles: true
      }));
    }
    static get observedAttributes() {
      return ["open", "x", "y", "place", "no-overlay"];
    }
    connectedCallback() {
      if (this.hasAttribute("open")) {
        this._show();
      }
    }
    disconnectedCallback() {
      if (this._isOpen && this._dialogElement.open) {
        this._dialogElement.close();
      }
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "open") {
        if (newValue !== null && !this._isOpen) {
          if (this.isConnected) {
            this._show();
          }
        } else if (newValue === null && this._isOpen) {
          this._hide();
        }
      } else if ((name === "x" || name === "y" || name === "place") && this._isOpen) {
        this._updatePosition();
      } else if (name === "no-overlay" && oldValue !== newValue && this._isOpen) {
        this._hide();
        this._show();
      }
    }
    _show() {
      if (!this._isOpen) {
        if (!this._slotElement) {
          this._slotElement = document.createElement("slot");
          this._slotElement.setAttribute("name", "content");
          this._popoverContainer.appendChild(this._slotElement);
        }
        this._isOpen = true;
        if (!this._dialogElement.open) {
          setTimeout(() => {
            if (this._dialogElement && !this._dialogElement.open) {
              if (this.hasAttribute("no-overlay")) {
                this._dialogElement.show();
              } else {
                this._dialogElement.showModal();
              }
            }
          }, 0);
        }
        requestAnimationFrame(() => {
          this._updatePosition();
        });
      }
    }
    _hide() {
      if (this._isOpen) {
        this._isOpen = false;
        if (this._dialogElement.open) {
          this._dialogElement.close();
        }
        if (this._slotElement) {
          this._popoverContainer.removeChild(this._slotElement);
          this._slotElement = null;
        }
      }
    }
    _updatePosition() {
      const x = parseFloat(this.getAttribute("x") || "0");
      const y = parseFloat(this.getAttribute("y") || "0");
      const place = this.getAttribute("place") || "bs";
      this.removeAttribute("positioned");
      requestAnimationFrame(() => {
        const rect = this._popoverContainer.getBoundingClientRect();
        const { left, top } = this._calculatePosition(x, y, rect.width, rect.height, place);
        this._popoverContainer.style.left = `${left}px`;
        this._popoverContainer.style.top = `${top}px`;
        requestAnimationFrame(() => {
          this.setAttribute("positioned", "");
        });
      });
    }
    _calculatePosition(x, y, width, height, place) {
      const offset = 8;
      let left = x;
      let top = y;
      switch (place) {
        case "t":
          left = x - width / 2;
          top = y - height - offset;
          break;
        case "ts":
          left = x;
          top = y - height - offset;
          break;
        case "te":
          left = x - width;
          top = y - height - offset;
          break;
        case "r":
          left = x + offset;
          top = y - height / 2;
          break;
        case "rs":
          left = x + offset;
          top = y;
          break;
        case "re":
          left = x + offset;
          top = y - height;
          break;
        case "b":
          left = x - width / 2;
          top = y + offset;
          break;
        case "bs":
          left = x;
          top = y + offset;
          break;
        case "be":
          left = x - width;
          top = y + offset;
          break;
        case "l":
          left = x - width - offset;
          top = y - height / 2;
          break;
        case "ls":
          left = x - width - offset;
          top = y;
          break;
        case "le":
          left = x - width - offset;
          top = y - height;
          break;
        default:
          left = x;
          top = y + offset;
          break;
      }
      const padding = 8;
      left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - height - padding));
      return { left, top };
    }
    // Expose popover container for advanced usage
    get popover() {
      return this._popoverContainer;
    }
  };
  var popover_default = ({ render: render3, html }) => {
    return RettangoliPopoverElement;
  };

  // src/components/accordionItem/accordionItem.handlers.js
  var accordionItem_handlers_exports = {};
  __export(accordionItem_handlers_exports, {
    handleClickHeader: () => handleClickHeader
  });
  var handleClickHeader = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    store.toggleOpen({});
    render3();
  };

  // .temp/components/accordionItem.schema.js
  var accordionItem_schema_default = { "componentName": "rtgl-accordion-item", "propsSchema": { "type": "object", "properties": { "label": { "type": "string" }, "content": { "type": "string" }, "w": { "type": "string" } } }, "events": [], "methods": { "type": "object", "properties": {} } };

  // src/components/accordionItem/accordionItem.store.js
  var accordionItem_store_exports = {};
  __export(accordionItem_store_exports, {
    createInitialState: () => createInitialState,
    selectViewData: () => selectViewData,
    toggleOpen: () => toggleOpen
  });
  var createInitialState = () => Object.freeze({
    open: false
  });
  var blacklistedAttrs = ["id", "class", "style", "slot", "label", "content"];
  var stringifyAttrs = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var selectViewData = ({ state, props }) => {
    return {
      label: props.label || "",
      content: props.content || "",
      openClass: state.open ? "content-wrapper open" : "content-wrapper",
      chevronIcon: state.open ? "chevronUp" : "chevronDown",
      containerAttrString: stringifyAttrs(props)
    };
  };
  var toggleOpen = ({ state }) => {
    state.open = !state.open;
  };

  // .temp/components/accordionItem.view.js
  var accordionItem_view_default = { "refs": { "header": { "eventListeners": { "click": { "handler": "handleClickHeader" } } } }, "styles": { ".content-wrapper": { "display": "grid", "grid-template-rows": "0fr", "transition": "grid-template-rows 0.2s ease-out" }, ".content-wrapper.open": { "grid-template-rows": "1fr" }, ".content-inner": { "overflow": "hidden" } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=v ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#header d=h av=c w=f pv=md cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text", "value": { "type": 1, "path": "label" } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view w=1fg", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-svg svg=${chevronIcon} wh=16 c=mu-fg", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg svg=", { "type": 1, "path": "chevronIcon" }, " wh=16 c=mu-fg"] } }], "fast": true }], "fast": true } }], "fast": true }, { "type": 8, "properties": [{ "key": 'div class="${openClass}"', "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "div class=content-inner", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view pb=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=mu-fg", "value": { "type": 1, "path": "content" } }], "fast": true }, { "type": 8, "properties": [{ "key": "slot name=content", "value": { "type": 0, "value": null } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ['div class="', { "type": 1, "path": "openClass" }, '"'] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view d=v ", { "type": 1, "path": "containerAttrString" }] } }], "fast": true }], "fast": true } };

  // src/components/breadcrumb/breadcrumb.handlers.js
  var breadcrumb_handlers_exports = {};
  __export(breadcrumb_handlers_exports, {
    handleClickItem: () => handleClickItem
  });
  var handleClickItem = (deps2, payload) => {
    const { dispatchEvent, props } = deps2;
    const event = payload._event;
    const index = Number(event.currentTarget.dataset.index);
    const item = Array.isArray(props.items) ? props.items[index] : void 0;
    if (!item) {
      return;
    }
    if (item.disabled || item.current) {
      event.preventDefault();
      return;
    }
    const hasHref = typeof item.href === "string" && item.href.length > 0;
    if (!hasHref) {
      event.preventDefault();
    }
    dispatchEvent(new CustomEvent("item-click", {
      detail: {
        id: item.id,
        path: item.path,
        href: item.href,
        item,
        index,
        trigger: event.type
      }
    }));
  };

  // .temp/components/breadcrumb.schema.js
  var breadcrumb_schema_default = { "componentName": "rtgl-breadcrumb", "propsSchema": { "type": "object", "properties": { "items": { "type": "array", "items": { "type": "object", "properties": { "label": { "type": "string" }, "id": { "type": "string" }, "href": { "type": "string" }, "path": { "type": "string" }, "current": { "type": "boolean" }, "disabled": { "type": "boolean" }, "click": { "type": "boolean" }, "newTab": { "type": "boolean" }, "rel": { "type": "string" } } } }, "sep": { "type": "string", "default": "breadcrumb-arrow" }, "max": { "type": "number" } } }, "events": { "item-click": { "type": "object", "properties": { "id": { "type": "string" }, "path": { "type": "string" }, "href": { "type": "string" }, "item": { "type": "object" }, "index": { "type": "number" }, "trigger": { "type": "string" } } } }, "methods": { "type": "object", "properties": {} } };

  // src/components/breadcrumb/breadcrumb.store.js
  var breadcrumb_store_exports = {};
  __export(breadcrumb_store_exports, {
    createInitialState: () => createInitialState2,
    selectViewData: () => selectViewData2
  });
  var createInitialState2 = () => Object.freeze({});
  var blacklistedAttrs2 = ["id", "class", "style", "slot", "items", "sep", "max", "separator"];
  var stringifyAttrs2 = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedAttrs2.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var toNumber = (value) => {
    if (value === void 0 || value === null || value === "") {
      return void 0;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? void 0 : parsed;
  };
  var escapeAttrValue = (value) => `${value}`.replace(/"/g, "&quot;");
  var collapseItems = (items, max) => {
    if (!max || max < 3 || items.length <= max) {
      return items;
    }
    const tailCount = max - 2;
    return [
      items[0],
      { isEllipsis: true, label: "..." },
      ...items.slice(-tailCount)
    ];
  };
  var normalizeItems = (items) => {
    return items.map((item, index) => {
      const hasHref = typeof item.href === "string" && item.href.length > 0;
      const hasPath = item.path !== void 0 && item.path !== null && `${item.path}` !== "";
      const isCurrent = !!item.current;
      const isDisabled = !!item.disabled;
      const isInteractive = !isCurrent && !isDisabled && (hasHref || hasPath || !!item.click);
      const relValue = item.rel || (item.newTab ? "noopener noreferrer" : "");
      const linkExtraAttrs = [
        item.newTab ? 'target="_blank"' : "",
        relValue ? `rel="${escapeAttrValue(relValue)}"` : ""
      ].filter(Boolean).join(" ");
      return {
        ...item,
        label: item.label || "",
        index,
        href: hasHref ? item.href : void 0,
        path: hasPath ? item.path : void 0,
        isCurrent,
        isDisabled,
        isInteractive,
        linkExtraAttrs,
        c: isCurrent ? "fg" : "mu-fg"
      };
    });
  };
  var selectViewData2 = ({ props }) => {
    const containerAttrString = stringifyAttrs2(props);
    const items = Array.isArray(props.items) ? props.items : [];
    const max = toNumber(props.max);
    const sep = props.sep || "breadcrumb-arrow";
    const normalizedItems = normalizeItems(items);
    const collapsedItems = collapseItems(normalizedItems, max);
    const itemsWithSeparators = [];
    collapsedItems.forEach((item, index) => {
      itemsWithSeparators.push(item);
      if (index < collapsedItems.length - 1) {
        itemsWithSeparators.push({ isSeparator: true });
      }
    });
    return {
      containerAttrString,
      items: itemsWithSeparators,
      sep
    };
  };

  // .temp/components/breadcrumb.view.js
  var breadcrumb_view_default = { "refs": { "item*": { "eventListeners": { "click": { "handler": "handleClickItem" } } } }, "styles": { "a": { "text-decoration": "none", "color": "inherit" } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h av=c g=md p=sm ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "item", "indexVar": "i", "iterable": { "type": 1, "path": "items" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if item.isSeparator", "value": { "type": 6, "conditions": [{ "type": 1, "path": "item.isSeparator" }, { "type": 1, "path": "item.isEllipsis" }, { "type": 4, "op": 6, "left": { "type": 1, "path": "item.isInteractive" }, "right": { "type": 1, "path": "item.href" } }, { "type": 1, "path": "item.isInteractive" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-svg wh=16 svg=${sep} c=mu-fg", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg wh=16 svg=", { "type": 1, "path": "sep" }, " c=mu-fg"] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=mu-fg", "value": { "type": 1, "path": "item.label" } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "a#item${i} href=${item.href} ${item.linkExtraAttrs} data-index=${item.index}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text s=sm c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["a#item", { "type": 1, "path": "i" }, " href=", { "type": 1, "path": "item.href" }, " ", { "type": 1, "path": "item.linkExtraAttrs" }, " data-index=", { "type": 1, "path": "item.index" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#item${i} data-index=${item.index} cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text s=sm c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view#item", { "type": 1, "path": "i" }, " data-index=", { "type": 1, "path": "item.index" }, " cur=pointer"] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text s=sm c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view d=h av=c g=md p=sm ", { "type": 1, "path": "containerAttrString" }] } }], "fast": false }], "fast": false } };

  // src/components/dropdownMenu/dropdownMenu.handlers.js
  var dropdownMenu_handlers_exports = {};
  __export(dropdownMenu_handlers_exports, {
    handleClickMenuItem: () => handleClickMenuItem,
    handleClosePopover: () => handleClosePopover
  });
  var handleClosePopover = (deps2, payload) => {
    const { dispatchEvent } = deps2;
    dispatchEvent(new CustomEvent("close"));
  };
  var handleClickMenuItem = (deps2, payload) => {
    const { dispatchEvent, props } = deps2;
    const event = payload._event;
    const index = Number(event.currentTarget.dataset.index ?? event.currentTarget.id.slice("option".length));
    const item = props.items[index];
    const itemType = item?.type || "item";
    if (!item || itemType !== "item" || item.disabled) {
      event.preventDefault();
      return;
    }
    if (!item.href) {
      event.preventDefault();
    }
    dispatchEvent(new CustomEvent("item-click", {
      detail: {
        index,
        item,
        id: item.id,
        path: item.path,
        href: item.href,
        trigger: event.type
      }
    }));
  };

  // .temp/components/dropdownMenu.schema.js
  var dropdownMenu_schema_default = { "componentName": "rtgl-dropdown-menu", "propsSchema": { "type": "object", "properties": { "items": { "type": "array", "items": { "type": "object", "properties": { "label": { "type": "string" }, "type": { "type": "string", "enum": ["label", "item", "separator"] }, "id": { "type": "string" }, "path": { "type": "string" }, "href": { "type": "string" }, "disabled": { "type": "boolean" }, "newTab": { "type": "boolean" }, "rel": { "type": "string" }, "testId": { "type": "string" } } } }, "open": { "type": "boolean" }, "x": { "type": "string" }, "y": { "type": "string" }, "place": { "type": "string" }, "w": { "type": "string" }, "h": { "type": "string" } } }, "events": { "close": { "type": "object" }, "item-click": { "type": "object", "properties": { "index": { "type": "number" }, "item": { "type": "object" }, "id": { "type": "string" }, "path": { "type": "string" }, "href": { "type": "string" }, "trigger": { "type": "string" } } } }, "methods": { "type": "object", "properties": {} } };

  // src/components/dropdownMenu/dropdownMenu.store.js
  var dropdownMenu_store_exports = {};
  __export(dropdownMenu_store_exports, {
    createInitialState: () => createInitialState3,
    selectViewData: () => selectViewData3
  });
  var createInitialState3 = () => Object.freeze({});
  var escapeAttrValue2 = (value) => `${value}`.replace(/"/g, "&quot;");
  var normalizeItems2 = (items) => {
    return items.map((item, index) => {
      const type = item.type || "item";
      const isSeparator = type === "separator";
      const isLabel = type === "label";
      const isItem = type === "item";
      const isDisabled = !!item.disabled;
      const isInteractive = isItem && !isDisabled;
      const c = isDisabled ? "mu-fg" : "fg";
      const bgc = isDisabled ? "mu" : "";
      const hoverBgc = isDisabled ? "" : "ac";
      const hasHref = typeof item.href === "string" && item.href.length > 0;
      const relValue = item.rel || (item.newTab ? "noopener noreferrer" : "");
      const linkExtraAttrs = [
        item.newTab ? 'target="_blank"' : "",
        relValue ? `rel="${escapeAttrValue2(relValue)}"` : ""
      ].filter(Boolean).join(" ");
      return {
        ...item,
        index,
        type,
        isSeparator,
        isLabel,
        isItem,
        isDisabled,
        isInteractive,
        hasHref,
        linkExtraAttrs,
        c,
        bgc,
        hoverBgc
      };
    });
  };
  var selectViewData3 = ({ props }) => {
    const items = Array.isArray(props.items) ? props.items : [];
    return {
      items: normalizeItems2(items),
      open: !!props.open,
      x: props.x || 0,
      y: props.y || 0,
      w: props.w || "300",
      h: props.h || "300",
      place: props.place || "bs"
    };
  };

  // .temp/components/dropdownMenu.view.js
  var dropdownMenu_view_default = { "refs": { "popover": { "eventListeners": { "close": { "handler": "handleClosePopover" } } }, "option*": { "eventListeners": { "click": { "handler": "handleClickMenuItem" } } } }, "styles": { "a": { "display": "block", "width": "100%", "text-decoration": "none", "color": "inherit" } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-popover#popover ?open=${open} x=${x} y=${y} place=${place}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=${w} h=${h} sv g=xs slot=content bgc=mu br=md", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "item", "indexVar": "i", "iterable": { "type": 1, "path": "items" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if item.isLabel", "value": { "type": 6, "conditions": [{ "type": 1, "path": "item.isLabel" }, { "type": 4, "op": 6, "left": { "type": 1, "path": "item.isItem" }, "right": { "type": 1, "path": "item.isDisabled" } }, { "type": 4, "op": 6, "left": { "type": 1, "path": "item.isItem" }, "right": { "type": 4, "op": 6, "left": { "type": 1, "path": "item.hasHref" }, "right": { "type": 1, "path": "item.linkExtraAttrs" } } }, { "type": 4, "op": 6, "left": { "type": 1, "path": "item.isItem" }, "right": { "type": 1, "path": "item.hasHref" } }, { "type": 1, "path": "item.isItem" }, { "type": 1, "path": "item.isSeparator" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f ph=lg pv=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=mu-fg", "value": { "type": 1, "path": "item.label" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f ph=lg pv=md br=md bgc=${item.bgc}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view w=f ph=lg pv=md br=md bgc=", { "type": 1, "path": "item.bgc" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "a#option${i} href=${item.href} ${item.linkExtraAttrs} data-index=${item.index} data-testid=${item.testId}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f h-bgc=${item.hoverBgc} ph=lg pv=md cur=pointer br=md bgc=${item.bgc}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view w=f h-bgc=", { "type": 1, "path": "item.hoverBgc" }, " ph=lg pv=md cur=pointer br=md bgc=", { "type": 1, "path": "item.bgc" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["a#option", { "type": 1, "path": "i" }, " href=", { "type": 1, "path": "item.href" }, " ", { "type": 1, "path": "item.linkExtraAttrs" }, " data-index=", { "type": 1, "path": "item.index" }, " data-testid=", { "type": 1, "path": "item.testId" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "a#option${i} href=${item.href} data-index=${item.index} data-testid=${item.testId}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f h-bgc=${item.hoverBgc} ph=lg pv=md cur=pointer br=md bgc=${item.bgc}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view w=f h-bgc=", { "type": 1, "path": "item.hoverBgc" }, " ph=lg pv=md cur=pointer br=md bgc=", { "type": 1, "path": "item.bgc" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["a#option", { "type": 1, "path": "i" }, " href=", { "type": 1, "path": "item.href" }, " data-index=", { "type": 1, "path": "item.index" }, " data-testid=", { "type": 1, "path": "item.testId" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#option${i} w=f h-bgc=${item.hoverBgc} ph=lg pv=md cur=pointer br=md bgc=${item.bgc} data-index=${item.index} data-testid=${item.testId}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=${item.c}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text c=", { "type": 1, "path": "item.c" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view#option", { "type": 1, "path": "i" }, " w=f h-bgc=", { "type": 1, "path": "item.hoverBgc" }, " ph=lg pv=md cur=pointer br=md bgc=", { "type": 1, "path": "item.bgc" }, " data-index=", { "type": 1, "path": "item.index" }, " data-testid=", { "type": 1, "path": "item.testId" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f h=1 ph=lg mv=md bgc=bo", "value": { "type": 0, "value": null } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view w=", { "type": 1, "path": "w" }, " h=", { "type": 1, "path": "h" }, " sv g=xs slot=content bgc=mu br=md"] } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-popover#popover ?open=", { "type": 1, "path": "open" }, " x=", { "type": 1, "path": "x" }, " y=", { "type": 1, "path": "y" }, " place=", { "type": 1, "path": "place" }] } }], "fast": false }], "fast": false } };

  // src/components/form/form.handlers.js
  var form_handlers_exports = {};
  __export(form_handlers_exports, {
    handleActionClick: () => handleActionClick,
    handleAfterMount: () => handleAfterMount,
    handleBeforeMount: () => handleBeforeMount,
    handleImageClick: () => handleImageClick,
    handleKeyDown: () => handleKeyDown,
    handleOnUpdate: () => handleOnUpdate,
    handleTooltipMouseEnter: () => handleTooltipMouseEnter,
    handleTooltipMouseLeave: () => handleTooltipMouseLeave,
    handleValueChange: () => handleValueChange,
    handleValueInput: () => handleValueInput
  });

  // src/components/form/form.store.js
  var form_store_exports = {};
  __export(form_store_exports, {
    clearFieldError: () => clearFieldError,
    collectAllDataFields: () => collectAllDataFields,
    createInitialState: () => createInitialState4,
    flattenFields: () => flattenFields,
    get: () => get,
    getDefaultValue: () => getDefaultValue,
    hideTooltip: () => hideTooltip,
    isDataField: () => isDataField,
    pruneHiddenValues: () => pruneHiddenValues,
    resetFormValues: () => resetFormValues,
    selectForm: () => selectForm,
    selectFormValues: () => selectFormValues,
    selectViewData: () => selectViewData4,
    set: () => set,
    setErrors: () => setErrors,
    setFormFieldValue: () => setFormFieldValue,
    setFormValues: () => setFormValues,
    setReactiveMode: () => setReactiveMode,
    showTooltip: () => showTooltip,
    validateField: () => validateField,
    validateForm: () => validateForm
  });

  // node_modules/jempl/src/parse/constants.js
  var NodeType = {
    LITERAL: 0,
    VARIABLE: 1,
    INTERPOLATION: 2,
    FUNCTION: 3,
    BINARY: 4,
    UNARY: 5,
    CONDITIONAL: 6,
    LOOP: 7,
    OBJECT: 8,
    ARRAY: 9,
    PARTIAL: 10,
    PATH_REFERENCE: 11
  };
  var BinaryOp = {
    EQ: 0,
    // ==
    NEQ: 1,
    // !=
    GT: 2,
    // >
    LT: 3,
    // <
    GTE: 4,
    // >=
    LTE: 5,
    // <=
    AND: 6,
    // &&
    OR: 7,
    // ||
    IN: 8,
    // in
    ADD: 10,
    // +
    SUBTRACT: 11
    // -
  };
  var UnaryOp = {
    NOT: 0
    // !
  };

  // node_modules/jempl/src/errors.js
  var JemplParseError = class extends Error {
    constructor(message) {
      super(`Parse Error: ${message}`);
      this.name = "JemplParseError";
    }
  };
  var JemplRenderError = class extends Error {
    constructor(message) {
      super(`Render Error: ${message}`);
      this.name = "JemplRenderError";
    }
  };
  var validateConditionExpression = (expr) => {
    if (!expr || expr.trim() === "") {
      throw new JemplParseError("Missing condition expression after '$if'");
    }
    if (expr.includes("===") || expr.includes("!==")) {
      const suggestion = expr.includes("===") ? "==" : "!=";
      throw new JemplParseError(
        `Invalid comparison operator '${expr.includes("===") ? "===" : "!=="}' - did you mean '${suggestion}'? (got: '${expr}')`
      );
    }
    const incompleteOps = ["<", ">", "<=", ">=", "==", "!="];
    for (const op of incompleteOps) {
      if (expr.trim().endsWith(op)) {
        throw new JemplParseError(
          `Incomplete comparison expression - missing right operand (got: '${expr}')`
        );
      }
    }
  };
  var validateLoopSyntax = (expr) => {
    if (expr.trim().endsWith(" in")) {
      throw new JemplParseError(
        `Missing iterable expression after 'in' (got: '$for ${expr}')`
      );
    }
    if (!expr.includes(" in ")) {
      throw new JemplParseError(
        `Invalid loop syntax - missing 'in' keyword (got: '$for ${expr}')`
      );
    }
    const [varsExpr, iterableExpr] = expr.split(" in ");
    if (!iterableExpr || iterableExpr.trim() === "") {
      throw new JemplParseError(
        `Missing iterable expression after 'in' (got: '$for ${expr}')`
      );
    }
    const varNames = varsExpr.includes(",") ? varsExpr.split(",").map((v) => v.trim()) : [varsExpr.trim()];
    for (const varName of varNames) {
      if (!varName) {
        throw new JemplParseError(
          `Invalid loop variable - variable name cannot be empty (got: '$for ${expr}')`
        );
      }
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varName)) {
        throw new JemplParseError(`Invalid loop syntax (got: '$for ${expr}')`);
      }
    }
  };
  var createIterationRenderError = (expr, value, isFunction = false) => {
    if (value === null) {
      return new JemplRenderError(
        `Cannot iterate over null value at '$for ${expr}'`
      );
    }
    if (value === void 0) {
      return new JemplRenderError(
        `Cannot iterate over undefined value at '$for ${expr}'`
      );
    }
    const type = typeof value;
    if (isFunction) {
      return new JemplRenderError(
        `Cannot iterate over non-array value in loop '${expr}' - got ${type} instead`
      );
    }
    return new JemplRenderError(
      `Cannot iterate over non-array value (got: ${type}) at '$for ${expr}'`
    );
  };
  var createUnknownFunctionRenderError = (name, availableFunctions) => {
    const available = availableFunctions && Object.keys(availableFunctions).length > 0 ? Object.keys(availableFunctions).join(", ") : "no custom functions provided";
    return new JemplRenderError(`Unknown function '${name}' (${available})`);
  };

  // node_modules/jempl/src/render.js
  var render = (ast, data, options = {}) => {
    let functions = {};
    let partials = {};
    if (options && typeof options === "object") {
      if (options.functions !== void 0 || options.partials !== void 0) {
        functions = options.functions || {};
        partials = options.partials || {};
      } else if (typeof options === "object") {
        functions = options;
      }
    }
    const initialScope = {};
    const result = renderNode(ast, { functions, partials }, data, initialScope);
    if (result === void 0) {
      return {};
    }
    return result;
  };
  var renderNode = (node, options, data, scope) => {
    const functions = options.functions || options;
    if (node.var && !node.type) {
      return getVariableValue(node.var, data, scope);
    }
    if (node.type === NodeType.LITERAL) {
      return node.value;
    }
    if (node.type === NodeType.VARIABLE) {
      return getVariableValue(node.path, data, scope);
    }
    if (node.type === NodeType.INTERPOLATION) {
      return renderInterpolation(node.parts, options, data, scope);
    }
    switch (node.type) {
      case NodeType.FUNCTION:
        return renderFunction(node, options, data, scope);
      case NodeType.BINARY:
        return renderBinaryOperation(node, options, data, scope);
      case NodeType.UNARY:
        return renderUnaryOperation(node, options, data, scope);
      case NodeType.CONDITIONAL:
        return renderConditional(node, options, data, scope);
      case NodeType.LOOP:
        return renderLoop(node, options, data, scope);
      case NodeType.OBJECT:
        return renderObject(node, options, data, scope);
      case NodeType.ARRAY:
        return renderArray(node, options, data, scope);
      case NodeType.PARTIAL:
        return renderPartial(node, options, data, scope);
      case NodeType.PATH_REFERENCE:
        return renderPathReference(node, options, data, scope);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  };
  var pathCache = /* @__PURE__ */ new Map();
  var parsePathSegment = (segment) => {
    const accessors = [];
    let current2 = "";
    let inBracket = false;
    for (let i = 0; i < segment.length; i++) {
      const char = segment[i];
      if (char === "[") {
        if (current2) {
          accessors.push({ type: "property", value: current2 });
          current2 = "";
        }
        inBracket = true;
      } else if (char === "]") {
        if (inBracket && current2) {
          const trimmed = current2.trim();
          if (/^\d+$/.test(trimmed)) {
            accessors.push({ type: "index", value: parseInt(trimmed, 10) });
          } else if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
            const key = trimmed.slice(1, -1);
            accessors.push({ type: "property", value: key });
          } else {
            accessors.push({ type: "property", value: trimmed });
          }
          current2 = "";
        }
        inBracket = false;
      } else {
        current2 += char;
      }
    }
    if (current2) {
      accessors.push({ type: "property", value: current2 });
    }
    return accessors;
  };
  var getVariableValue = (path, data, scope) => {
    if (!path)
      return void 0;
    if (path in scope) {
      return scope[path];
    }
    let parsedPath = pathCache.get(path);
    if (!parsedPath) {
      const segments = [];
      let current3 = "";
      let bracketDepth = 0;
      for (let i = 0; i < path.length; i++) {
        const char = path[i];
        if (char === "[") {
          bracketDepth++;
          current3 += char;
        } else if (char === "]") {
          bracketDepth--;
          current3 += char;
        } else if (char === "." && bracketDepth === 0) {
          if (current3) {
            segments.push(current3);
            current3 = "";
          }
        } else {
          current3 += char;
        }
      }
      if (current3) {
        segments.push(current3);
      }
      parsedPath = [];
      for (const segment of segments) {
        const accessors = parsePathSegment(segment.trim());
        parsedPath.push(...accessors);
      }
      pathCache.set(path, parsedPath);
    }
    let current2 = data;
    for (let i = 0; i < parsedPath.length; i++) {
      const accessor = parsedPath[i];
      if (accessor.type === "property" && accessor.value in scope) {
        current2 = scope[accessor.value];
        continue;
      }
      if (current2 == null) {
        return void 0;
      }
      if (accessor.type === "property") {
        current2 = current2[accessor.value];
      } else if (accessor.type === "index") {
        current2 = current2[accessor.value];
      }
    }
    return current2;
  };
  var renderInterpolation = (parts, options, data, scope) => {
    const segments = [];
    for (const part of parts) {
      if (typeof part === "string") {
        segments.push(part);
      } else {
        const value = renderNode(part, options, data, scope);
        segments.push(value != null ? String(value) : "");
      }
    }
    return segments.join("");
  };
  var renderFunction = (node, options, data, scope) => {
    const functions = options.functions || options;
    const func = functions[node.name];
    if (!func) {
      throw createUnknownFunctionRenderError(node.name, functions);
    }
    const args = node.args.map((arg) => renderNode(arg, options, data, scope));
    return func(...args);
  };
  var evaluateCondition = (node, options, data, scope) => {
    if (node.var && !node.type) {
      return getVariableValue(node.var, data, scope);
    }
    switch (node.type) {
      case NodeType.VARIABLE:
        return getVariableValue(node.path, data, scope);
      case NodeType.LITERAL:
        return node.value;
      case NodeType.BINARY:
        return renderBinaryOperation(node, options, data, scope);
      case NodeType.UNARY:
        return renderUnaryOperation(node, options, data, scope);
      case NodeType.FUNCTION:
        return renderFunction(node, options, data, scope);
      default:
        return renderNode(node, options, data, scope);
    }
  };
  var renderBinaryOperation = (node, options, data, scope) => {
    if (node.op === BinaryOp.AND || node.op === BinaryOp.OR) {
      const left2 = evaluateCondition(node.left, options, data, scope);
      const right2 = evaluateCondition(node.right, options, data, scope);
      switch (node.op) {
        case BinaryOp.AND:
          return left2 && right2;
        case BinaryOp.OR:
          return left2 || right2;
      }
    }
    const left = renderNode(node.left, options, data, scope);
    const right = renderNode(node.right, options, data, scope);
    switch (node.op) {
      case BinaryOp.EQ:
        return left == right;
      case BinaryOp.NEQ:
        return left != right;
      case BinaryOp.GT:
        return left > right;
      case BinaryOp.LT:
        return left < right;
      case BinaryOp.GTE:
        return left >= right;
      case BinaryOp.LTE:
        return left <= right;
      case BinaryOp.IN:
        return Array.isArray(right) ? right.includes(left) : false;
      case BinaryOp.ADD:
        if (typeof left !== "number" || typeof right !== "number") {
          throw new JemplRenderError(
            `Arithmetic operations require numbers. Got ${typeof left} + ${typeof right}`
          );
        }
        return left + right;
      case BinaryOp.SUBTRACT:
        if (typeof left !== "number" || typeof right !== "number") {
          throw new JemplRenderError(
            `Arithmetic operations require numbers. Got ${typeof left} - ${typeof right}`
          );
        }
        return left - right;
      default:
        throw new Error(`Unknown binary operator: ${node.op}`);
    }
  };
  var renderUnaryOperation = (node, options, data, scope) => {
    const operand = node.op === UnaryOp.NOT ? evaluateCondition(node.operand, options, data, scope) : renderNode(node.operand, options, data, scope);
    switch (node.op) {
      case UnaryOp.NOT:
        return !operand;
      default:
        throw new Error(`Unknown unary operator: ${node.op}`);
    }
  };
  var renderConditionalUltraFast = (node, options, data, scope) => {
    if (node.conditions.length === 2 && node.conditions[1] === null) {
      const condition = node.conditions[0];
      if (condition.type === NodeType.VARIABLE) {
        const conditionValue = getVariableValue(condition.path, data, scope);
        if (conditionValue) {
          const trueBody = node.bodies[0];
          if (trueBody.type === NodeType.OBJECT && trueBody.properties.length <= 5) {
            const result = {};
            for (const prop of trueBody.properties) {
              const key = prop.parsedKey ? renderNode(prop.parsedKey, options, data, scope) : prop.key;
              const valueNode = prop.value;
              if (valueNode.type === NodeType.LITERAL) {
                result[key] = valueNode.value;
              } else if (valueNode.type === NodeType.VARIABLE) {
                result[key] = getVariableValue(valueNode.path, data, scope);
              } else if (valueNode.type === NodeType.INTERPOLATION) {
                const segments = [];
                for (const part of valueNode.parts) {
                  if (typeof part === "string") {
                    segments.push(part);
                  } else if (part.type === NodeType.VARIABLE) {
                    const value = getVariableValue(part.path, data, scope);
                    segments.push(value != null ? String(value) : "");
                  } else {
                    const value = renderNode(part, options, data, scope);
                    segments.push(value != null ? String(value) : "");
                  }
                }
                result[key] = segments.join("");
              } else {
                result[key] = renderNode(valueNode, options, data, scope);
              }
            }
            return result;
          }
        } else {
          const falseBody = node.bodies[1];
          if (falseBody.type === NodeType.OBJECT && falseBody.properties.length <= 5) {
            const result = {};
            for (const prop of falseBody.properties) {
              const key = prop.parsedKey ? renderNode(prop.parsedKey, options, data, scope) : prop.key;
              const valueNode = prop.value;
              if (valueNode.type === NodeType.LITERAL) {
                result[key] = valueNode.value;
              } else if (valueNode.type === NodeType.VARIABLE) {
                result[key] = getVariableValue(valueNode.path, data, scope);
              } else if (valueNode.type === NodeType.INTERPOLATION) {
                const segments = [];
                for (const part of valueNode.parts) {
                  if (typeof part === "string") {
                    segments.push(part);
                  } else if (part.type === NodeType.VARIABLE) {
                    const value = getVariableValue(part.path, data, scope);
                    segments.push(value != null ? String(value) : "");
                  } else {
                    const value = renderNode(part, options, data, scope);
                    segments.push(value != null ? String(value) : "");
                  }
                }
                result[key] = segments.join("");
              } else {
                result[key] = renderNode(valueNode, options, data, scope);
              }
            }
            return result;
          }
        }
      }
    }
    return null;
  };
  var renderConditional = (node, options, data, scope) => {
    const ultraResult = renderConditionalUltraFast(node, options, data, scope);
    if (ultraResult !== null) {
      return ultraResult;
    }
    for (let i = 0; i < node.conditions.length; i++) {
      const condition = node.conditions[i];
      if (condition === null) {
        return renderNode(node.bodies[i], options, data, scope);
      }
      const conditionValue = evaluateCondition(condition, options, data, scope);
      if (conditionValue) {
        return renderNode(node.bodies[i], options, data, scope);
      }
    }
    return EMPTY_OBJECT;
  };
  var renderLoopConditionalUltraFast = (node, iterable) => {
    const body = node.body;
    const itemVar = node.itemVar;
    if (body.type === NodeType.CONDITIONAL && body.conditions.length === 1 && body.conditions[0].type === NodeType.VARIABLE) {
      const conditionPath = body.conditions[0].path;
      const trueBody = body.bodies[0];
      if (conditionPath.startsWith(itemVar + ".")) {
        const condProp = conditionPath.substring(itemVar.length + 1);
        if (trueBody.type === NodeType.OBJECT && trueBody.properties.length <= 5) {
          for (const prop of trueBody.properties) {
            if (prop.parsedKey) {
              return null;
            }
          }
          const results = [];
          for (let i = 0; i < iterable.length; i++) {
            const item = iterable[i];
            if (item[condProp]) {
              const result = {};
              for (const prop of trueBody.properties) {
                const key = prop.key;
                const valueNode = prop.value;
                if (valueNode.type === NodeType.LITERAL) {
                  result[key] = valueNode.value;
                } else if (valueNode.type === NodeType.VARIABLE) {
                  const path = valueNode.path;
                  if (path === itemVar) {
                    result[key] = item;
                  } else if (path.startsWith(itemVar + ".")) {
                    const propName = path.substring(itemVar.length + 1);
                    result[key] = item[propName];
                  } else {
                    return null;
                  }
                } else if (valueNode.type === NodeType.INTERPOLATION) {
                  const segments = [];
                  let canOptimize = true;
                  for (const part of valueNode.parts) {
                    if (typeof part === "string") {
                      segments.push(part);
                    } else if (part.type === NodeType.VARIABLE) {
                      const path = part.path;
                      if (path === itemVar) {
                        segments.push(item != null ? String(item) : "");
                      } else if (path.startsWith(itemVar + ".")) {
                        const propName = path.substring(itemVar.length + 1);
                        const value = item[propName];
                        segments.push(value != null ? String(value) : "");
                      } else {
                        canOptimize = false;
                        break;
                      }
                    } else {
                      canOptimize = false;
                      break;
                    }
                  }
                  if (!canOptimize)
                    return null;
                  result[key] = segments.join("");
                } else {
                  return null;
                }
              }
              results.push(result);
            }
          }
          return results;
        }
      }
    }
    return null;
  };
  var renderLoopUltraFast = (node, iterable) => {
    const body = node.body;
    const itemVar = node.itemVar;
    const conditionalResult = renderLoopConditionalUltraFast(node, iterable);
    if (conditionalResult !== null) {
      return conditionalResult;
    }
    if (body.type === NodeType.OBJECT && body.properties.length <= 5 && !body.whenCondition) {
      for (const prop of body.properties) {
        if (prop.parsedKey) {
          return null;
        }
      }
      const accessors = [];
      let isUltraFastEligible = true;
      for (const prop of body.properties) {
        const key = prop.key;
        const valueNode = prop.value;
        if (valueNode.type === NodeType.LITERAL) {
          accessors.push({ key, type: "literal", value: valueNode.value });
        } else if (valueNode.type === NodeType.VARIABLE) {
          const path = valueNode.path;
          if (path === itemVar) {
            accessors.push({ key, type: "item" });
          } else if (path.startsWith(itemVar + ".")) {
            const propPath = path.substring(itemVar.length + 1);
            if (!propPath.includes(".") && !propPath.includes("[")) {
              accessors.push({ key, type: "prop", prop: propPath });
            } else {
              isUltraFastEligible = false;
              break;
            }
          } else {
            isUltraFastEligible = false;
            break;
          }
        } else if (valueNode.type === NodeType.INTERPOLATION && valueNode.parts.length === 1) {
          const part = valueNode.parts[0];
          if (part.type === NodeType.VARIABLE) {
            const path = part.path;
            if (path === itemVar) {
              accessors.push({ key, type: "item_string" });
            } else if (path.startsWith(itemVar + ".")) {
              const propPath = path.substring(itemVar.length + 1);
              if (!propPath.includes(".") && !propPath.includes("[")) {
                accessors.push({ key, type: "prop_string", prop: propPath });
              } else {
                isUltraFastEligible = false;
                break;
              }
            } else {
              isUltraFastEligible = false;
              break;
            }
          } else {
            isUltraFastEligible = false;
            break;
          }
        } else {
          isUltraFastEligible = false;
          break;
        }
      }
      if (isUltraFastEligible) {
        const results = new Array(iterable.length);
        if (accessors.length === 3 && accessors[0].type === "prop" && accessors[0].key === "id" && accessors[1].type === "prop_string" && accessors[1].key === "title" && accessors[2].type === "prop" && accessors[2].key === "completed") {
          for (let i = 0; i < iterable.length; i++) {
            const item = iterable[i];
            results[i] = {
              id: item.id,
              title: item.title != null ? String(item.title) : "",
              completed: item.completed
            };
          }
        } else {
          for (let i = 0; i < iterable.length; i++) {
            const item = iterable[i];
            const result = {};
            for (const accessor of accessors) {
              if (accessor.type === "literal") {
                result[accessor.key] = accessor.value;
              } else if (accessor.type === "item") {
                result[accessor.key] = item;
              } else if (accessor.type === "prop") {
                result[accessor.key] = item[accessor.prop];
              } else if (accessor.type === "item_string") {
                result[accessor.key] = item != null ? String(item) : "";
              } else if (accessor.type === "prop_string") {
                const value = item[accessor.prop];
                result[accessor.key] = value != null ? String(value) : "";
              }
            }
            results[i] = result;
          }
        }
        return results;
      }
    }
    return null;
  };
  var renderLoopFastPath = (node, options, data, scope, iterable) => {
    const results = [];
    const body = node.body;
    if (body.type === NodeType.OBJECT && body.fast !== false) {
      const itemVar = node.itemVar;
      const indexVar = node.indexVar;
      for (let i = 0; i < iterable.length; i++) {
        const item = iterable[i];
        const result = {};
        const loopScope = {
          ...scope,
          [itemVar]: item,
          ...indexVar && { [indexVar]: i }
        };
        if (!loopScope.__paths__) {
          loopScope.__paths__ = scope.__paths__ || {};
        }
        let iterablePath = node.iterable.path || "";
        if (scope && scope.__paths__ && iterablePath) {
          const parts = iterablePath.split(".");
          const base = parts[0];
          if (base in scope.__paths__) {
            iterablePath = scope.__paths__[base];
            if (parts.length > 1) {
              iterablePath += "." + parts.slice(1).join(".");
            }
          }
        }
        loopScope.__paths__ = {
          ...loopScope.__paths__,
          [itemVar]: `${iterablePath}[${i}]`,
          ...indexVar && { [indexVar]: i }
        };
        for (const prop of body.properties) {
          const key = prop.parsedKey ? renderNode(prop.parsedKey, options, data, loopScope) : prop.key;
          const valueNode = prop.value;
          if (valueNode.type === NodeType.LITERAL) {
            result[key] = valueNode.value;
          } else if (valueNode.type === NodeType.VARIABLE) {
            const path = valueNode.path;
            if (path === itemVar) {
              result[key] = item;
            } else if (path === indexVar) {
              result[key] = i;
            } else if (path.startsWith(itemVar + ".")) {
              const propName = path.substring(itemVar.length + 1);
              if (!propName.includes(".") && !propName.includes("[")) {
                result[key] = item[propName];
              } else {
                result[key] = getVariableValue(path, data, {
                  ...scope,
                  [itemVar]: item,
                  ...indexVar && { [indexVar]: i }
                });
              }
            } else {
              result[key] = getVariableValue(path, data, {
                ...scope,
                [itemVar]: item,
                ...indexVar && { [indexVar]: i }
              });
            }
          } else if (valueNode.type === NodeType.INTERPOLATION) {
            const segments = [];
            for (const part of valueNode.parts) {
              if (typeof part === "string") {
                segments.push(part);
              } else if (part.type === NodeType.VARIABLE) {
                const path = part.path;
                let value;
                if (path === itemVar) {
                  value = item;
                } else if (path === indexVar) {
                  value = i;
                } else if (path.startsWith(itemVar + ".")) {
                  const propName = path.substring(itemVar.length + 1);
                  if (!propName.includes(".") && !propName.includes("[")) {
                    value = item[propName];
                  } else {
                    value = getVariableValue(path, data, {
                      ...scope,
                      [itemVar]: item,
                      ...indexVar && { [indexVar]: i }
                    });
                  }
                } else {
                  value = getVariableValue(path, data, {
                    ...scope,
                    [itemVar]: item,
                    ...indexVar && { [indexVar]: i }
                  });
                }
                segments.push(value != null ? String(value) : "");
              } else {
                const newScope = {
                  ...scope,
                  [itemVar]: item,
                  ...indexVar && { [indexVar]: i }
                };
                const value = renderNode(part, options, data, newScope);
                segments.push(value != null ? String(value) : "");
              }
            }
            result[key] = segments.join("");
          } else {
            const newScope = {
              ...scope,
              [itemVar]: item,
              ...indexVar && { [indexVar]: i }
            };
            result[key] = renderNode(valueNode, options, data, newScope);
          }
        }
        results.push(result);
      }
      return results;
    }
    return null;
  };
  var renderConditionalTestPatternNuclear = (node, iterable, itemVar) => {
    const body = node.body;
    if (body.type === NodeType.OBJECT && body.properties.length === 1 && body.properties[0].key === "$if item.visible") {
      const conditionalProp = body.properties[0];
      const conditional = conditionalProp.value;
      if (conditional.type === NodeType.CONDITIONAL && conditional.conditions.length === 1 && conditional.conditions[0].type === NodeType.VARIABLE && conditional.conditions[0].path === "item.visible") {
        const trueBody = conditional.bodies[0];
        if (trueBody.type === NodeType.OBJECT && trueBody.properties.length === 2) {
          const idProp = trueBody.properties[0];
          const nestedCondProp = trueBody.properties[1];
          if (idProp.key === "id" && idProp.value.type === NodeType.VARIABLE && idProp.value.path === "item.id" && nestedCondProp.key === "$if item.highlighted" && nestedCondProp.value.type === NodeType.CONDITIONAL) {
            const results = [];
            for (let i = 0; i < iterable.length; i++) {
              const item = iterable[i];
              if (item.visible) {
                const result = {
                  id: item.id
                  // Direct property access, no template overhead
                };
                if (item.highlighted) {
                  result.highlight = true;
                  result.message = `This item is highlighted: ${item.name}`;
                } else {
                  result.highlight = false;
                  result.message = item.name;
                }
                results.push(result);
              }
            }
            return results;
          }
        }
      }
    }
    return null;
  };
  var renderLoop = (node, options, data, scope) => {
    const iterable = renderNode(node.iterable, options, data, scope);
    if (!Array.isArray(iterable)) {
      let iterableStr;
      let isFunction = false;
      if (node.iterable.type === NodeType.FUNCTION) {
        isFunction = true;
        const args = node.iterable.args.map((arg) => {
          if (arg.type === NodeType.LITERAL) {
            return typeof arg.value === "string" ? `'${arg.value}'` : String(arg.value);
          } else if (arg.type === NodeType.VARIABLE) {
            return arg.path;
          } else if (arg.type === NodeType.FUNCTION) {
            return `${arg.name}(...)`;
          }
          return "?";
        }).join(", ");
        iterableStr = `${node.iterable.name}(${args})`;
      } else {
        iterableStr = node.iterable.path || "undefined";
      }
      const loopExpr = `${node.itemVar}${node.indexVar ? `, ${node.indexVar}` : ""} in ${iterableStr}`;
      throw createIterationRenderError(loopExpr, iterable, isFunction);
    }
    if (!node.indexVar) {
      const nuclearResult = renderConditionalTestPatternNuclear(
        node,
        iterable,
        node.itemVar
      );
      if (nuclearResult !== null) {
        return nuclearResult;
      }
    }
    if (!node.indexVar) {
      const ultraResult = renderLoopUltraFast(node, iterable);
      if (ultraResult !== null) {
        return ultraResult;
      }
    }
    const fastResult = renderLoopFastPath(node, options, data, scope, iterable);
    if (fastResult !== null) {
      return fastResult;
    }
    const results = [];
    let iterablePath = node.iterable.path || "";
    if (scope && scope.__paths__ && iterablePath) {
      const parts = iterablePath.split(".");
      const base = parts[0];
      if (base in scope.__paths__) {
        iterablePath = scope.__paths__[base];
        if (parts.length > 1) {
          iterablePath += "." + parts.slice(1).join(".");
        }
      }
    }
    let shouldPreserveArray = false;
    if (node.body.type === NodeType.ARRAY) {
      if (node.body.items.length <= 1) {
        shouldPreserveArray = false;
      } else {
        shouldPreserveArray = node.body._shouldPreserveArray ??= node.body.items.some(
          (item) => item.type === NodeType.OBJECT && item.properties.some(
            (prop) => prop.key.startsWith("$if ") || prop.key.startsWith("$when ")
          )
        );
      }
    }
    for (let i = 0; i < iterable.length; i++) {
      const newScope = node.indexVar ? { ...scope, [node.itemVar]: iterable[i], [node.indexVar]: i } : { ...scope, [node.itemVar]: iterable[i] };
      if (!newScope.__paths__) {
        newScope.__paths__ = scope.__paths__ || {};
      }
      newScope.__paths__ = {
        ...newScope.__paths__,
        [node.itemVar]: `${iterablePath}[${i}]`
      };
      if (node.indexVar) {
        newScope.__paths__[node.indexVar] = i;
      }
      const rendered = renderNode(node.body, options, data, newScope);
      if (Array.isArray(rendered) && rendered.length === 1 && !shouldPreserveArray) {
        const item = rendered[0];
        results.push(item === void 0 ? {} : item);
      } else {
        results.push(rendered === void 0 ? {} : rendered);
      }
    }
    return results;
  };
  var renderObjectDeepUltraFast = (node, options, data, scope) => {
    if (node.whenCondition) {
      return null;
    }
    if (node.properties.length === 1) {
      const prop = node.properties[0];
      const key = prop.parsedKey ? renderNode(prop.parsedKey, options, data, scope) : prop.key;
      const valueNode = prop.value;
      if (valueNode.type === NodeType.OBJECT && valueNode.properties.length <= 10 && !valueNode.whenCondition) {
        const result = {};
        const nestedResult = {};
        let canUltraOptimize = true;
        for (const nestedProp of valueNode.properties) {
          const nestedKey = nestedProp.parsedKey ? renderNode(nestedProp.parsedKey, options, data, scope) : nestedProp.key;
          const nestedValueNode = nestedProp.value;
          if (nestedValueNode.type === NodeType.LITERAL) {
            nestedResult[nestedKey] = nestedValueNode.value;
          } else if (nestedValueNode.type === NodeType.VARIABLE) {
            nestedResult[nestedKey] = getVariableValue(
              nestedValueNode.path,
              data,
              scope
            );
          } else if (nestedValueNode.type === NodeType.INTERPOLATION) {
            const segments = [];
            for (const part of nestedValueNode.parts) {
              if (typeof part === "string") {
                segments.push(part);
              } else if (part.type === NodeType.VARIABLE) {
                const value = getVariableValue(part.path, data, scope);
                segments.push(value != null ? String(value) : "");
              } else {
                canUltraOptimize = false;
                break;
              }
            }
            if (!canUltraOptimize)
              break;
            nestedResult[nestedKey] = segments.join("");
          } else if (nestedValueNode.type === NodeType.OBJECT && nestedValueNode.properties.length <= 5) {
            const deepResult = {};
            for (const deepProp of nestedValueNode.properties) {
              const deepKey = deepProp.key;
              const deepValueNode = deepProp.value;
              if (deepValueNode.type === NodeType.LITERAL) {
                deepResult[deepKey] = deepValueNode.value;
              } else if (deepValueNode.type === NodeType.VARIABLE) {
                deepResult[deepKey] = getVariableValue(
                  deepValueNode.path,
                  data,
                  scope
                );
              } else if (deepValueNode.type === NodeType.INTERPOLATION) {
                const segments = [];
                for (const part of deepValueNode.parts) {
                  if (typeof part === "string") {
                    segments.push(part);
                  } else if (part.type === NodeType.VARIABLE) {
                    const value = getVariableValue(part.path, data, scope);
                    segments.push(value != null ? String(value) : "");
                  } else {
                    canUltraOptimize = false;
                    break;
                  }
                }
                if (!canUltraOptimize)
                  break;
                deepResult[deepKey] = segments.join("");
              } else {
                canUltraOptimize = false;
                break;
              }
            }
            if (!canUltraOptimize)
              break;
            nestedResult[nestedKey] = deepResult;
          } else {
            canUltraOptimize = false;
            break;
          }
        }
        if (canUltraOptimize) {
          result[key] = nestedResult;
          return result;
        }
      }
    }
    return null;
  };
  var renderObject = (node, options, data, scope) => {
    const functions = options.functions || options;
    if (node.whenCondition) {
      const conditionResult = evaluateCondition(
        node.whenCondition,
        functions,
        data,
        scope
      );
      if (!conditionResult) {
        return void 0;
      }
    }
    const deepResult = renderObjectDeepUltraFast(node, options, data, scope);
    if (deepResult !== null) {
      return deepResult;
    }
    if (node.fast) {
      const result2 = {};
      for (const prop of node.properties) {
        const key = prop.parsedKey ? renderNode(prop.parsedKey, options, data, scope) : prop.key;
        const valueNode = prop.value;
        if (valueNode.type === NodeType.LITERAL) {
          result2[key] = valueNode.value;
        } else if (valueNode.type === NodeType.VARIABLE) {
          result2[key] = getVariableValue(valueNode.path, data, scope);
        } else if (valueNode.type === NodeType.INTERPOLATION) {
          const segments = [];
          for (const part of valueNode.parts) {
            if (typeof part === "string") {
              segments.push(part);
            } else if (part.type === NodeType.VARIABLE) {
              const value = getVariableValue(part.path, data, scope);
              segments.push(value != null ? String(value) : "");
            } else {
              const value = renderNode(part, options, data, scope);
              segments.push(value != null ? String(value) : "");
            }
          }
          result2[key] = segments.join("");
        } else {
          result2[key] = renderNode(valueNode, options, data, scope);
        }
      }
      return result2;
    }
    const result = {};
    let conditionalResult = null;
    let hasNonConditionalProperties = false;
    for (const prop of node.properties) {
      if (!prop.key.startsWith("$if ") && !prop.key.match(/^\$if\s+\w+.*:?$/) && !prop.key.startsWith("$elif") && !prop.key.startsWith("$else") && !prop.key.startsWith("$for ")) {
        hasNonConditionalProperties = true;
        break;
      }
    }
    for (const prop of node.properties) {
      if (prop.key.startsWith("$if ") || prop.key.match(/^\$if\s+\w+.*:?$/)) {
        const rendered = renderNode(prop.value, options, data, scope);
        if (!hasNonConditionalProperties && rendered !== null && rendered !== void 0) {
          if (Array.isArray(rendered) && rendered.length === 1) {
            return rendered[0];
          }
          return rendered;
        }
        if (typeof rendered === "object" && rendered !== null && !Array.isArray(rendered)) {
          Object.assign(result, rendered);
        }
      } else if (prop.key.startsWith("$for ")) {
        if (node.properties.length === 1) {
          return renderNode(prop.value, options, data, scope);
        }
      } else {
        const propValue = prop.value;
        if (propValue && propValue.type === NodeType.OBJECT && propValue.properties) {
          const loopProp = propValue.properties.find(
            (p) => p.key.startsWith("$for ")
          );
          if (loopProp) {
            const loopResult = renderNode(loopProp.value, options, data, scope);
            if (loopResult !== void 0) {
              result[prop.key] = loopResult;
            }
          } else {
            const renderedValue = renderNode(prop.value, options, data, scope);
            if (renderedValue !== void 0) {
              result[prop.key] = renderedValue;
            }
          }
        } else {
          const renderedKey = prop.parsedKey ? renderNode(prop.parsedKey, options, data, scope) : prop.key;
          const renderedValue = renderNode(prop.value, options, data, scope);
          if (renderedValue !== void 0) {
            result[renderedKey] = renderedValue;
          }
        }
      }
    }
    return result;
  };
  var EMPTY_OBJECT = {};
  var renderArray = (node, options, data, scope) => {
    const results = [];
    for (const item of node.items) {
      if (item.type === NodeType.LOOP) {
        const loopResults = renderNode(item, options, data, scope);
        if (Array.isArray(loopResults) && item.flatten !== false) {
          results.push(...loopResults);
        } else {
          results.push(loopResults);
        }
      } else {
        const rendered = renderNode(item, options, data, scope);
        if (rendered !== EMPTY_OBJECT && rendered !== void 0) {
          results.push(rendered);
        }
      }
    }
    return results;
  };
  var renderPartial = (node, options, data, scope) => {
    const { name, data: partialData, whenCondition } = node;
    const partials = options.partials || {};
    const functions = options.functions || options;
    if (whenCondition) {
      const conditionResult = evaluateCondition(
        whenCondition,
        functions,
        data,
        scope
      );
      if (!conditionResult) {
        return void 0;
      }
    }
    if (!partials[name]) {
      throw new JemplRenderError(`Partial '${name}' is not defined`);
    }
    const partialStack = scope._partialStack || [];
    if (partialStack.includes(name)) {
      throw new JemplRenderError(`Circular partial reference detected: ${name}`);
    }
    const partialTemplate = partials[name];
    let partialContext = data;
    let partialScope = { ...scope, _partialStack: [...partialStack, name] };
    if (scope) {
      partialContext = { ...data };
      for (const key of Object.keys(scope)) {
        if (!key.startsWith("_")) {
          partialContext[key] = scope[key];
        }
      }
    }
    if (partialData) {
      const renderedData = renderNode(partialData, options, data, scope);
      partialContext = { ...partialContext, ...renderedData };
    }
    return renderNode(partialTemplate, options, partialContext, partialScope);
  };
  var renderPathReference = (node, options, data, scope) => {
    const { path } = node;
    const parts = path.split(".");
    const base = parts[0];
    const properties = parts.slice(1);
    if (!scope || !(base in scope)) {
      throw new JemplRenderError(
        `Path reference '#{${path}}' refers to '${base}' which is not a loop variable in the current scope`
      );
    }
    if (!scope.__paths__) {
      scope.__paths__ = {};
    }
    if (!(base in scope.__paths__)) {
      throw new JemplRenderError(
        `Path reference '#{${path}}' cannot be resolved - path tracking may not be initialized properly`
      );
    }
    let fullPath = scope.__paths__[base];
    if (typeof fullPath === "number") {
      if (properties.length > 0) {
        throw new JemplRenderError(
          `Path reference '#{${path}}' - cannot access properties on index variable '${base}'`
        );
      }
      return String(fullPath);
    }
    if (properties.length > 0) {
      fullPath += "." + properties.join(".");
    }
    return fullPath;
  };
  var render_default = render;

  // node_modules/jempl/src/parse/variables.js
  var VARIABLE_REGEX = /\$\{([^}]*)\}/g;
  var PATH_REFERENCE_REGEX = /#\{([^}]*)\}/g;
  var parseFunctionCall = (expr, functions = {}) => {
    const functionMatch = expr.match(/^(\w+)\((.*)\)$/);
    if (!functionMatch) {
      return { isFunction: false };
    }
    const [, name, argsStr] = functionMatch;
    const args = parseArguments(argsStr, functions);
    return {
      isFunction: true,
      type: NodeType.FUNCTION,
      name,
      args
    };
  };
  var parseArguments = (argsStr, functions = {}) => {
    if (!argsStr.trim())
      return [];
    const args = splitArguments(argsStr);
    return args.map((arg) => parseArgument(arg.trim(), functions));
  };
  var splitArguments = (argsStr) => {
    const args = [];
    let current2 = "";
    let depth = 0;
    let inQuotes = false;
    let quoteChar = "";
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      const prevChar = i > 0 ? argsStr[i - 1] : "";
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current2 += char;
      } else if (inQuotes && char === quoteChar && prevChar !== "\\") {
        inQuotes = false;
        quoteChar = "";
        current2 += char;
      } else if (!inQuotes && char === "(") {
        depth++;
        current2 += char;
      } else if (!inQuotes && char === ")") {
        depth--;
        current2 += char;
      } else if (!inQuotes && char === "," && depth === 0) {
        args.push(current2);
        current2 = "";
      } else {
        current2 += char;
      }
    }
    if (current2) {
      args.push(current2);
    }
    return args;
  };
  var parseArgument = (arg, functions = {}) => {
    if (arg.startsWith('"') && arg.endsWith('"') || arg.startsWith("'") && arg.endsWith("'")) {
      return { type: NodeType.LITERAL, value: arg.slice(1, -1) };
    }
    if (/^-?\d+(\.\d+)?$/.test(arg)) {
      return { type: NodeType.LITERAL, value: parseFloat(arg) };
    }
    if (arg === "true") {
      return { type: NodeType.LITERAL, value: true };
    }
    if (arg === "false") {
      return { type: NodeType.LITERAL, value: false };
    }
    if (arg === "null") {
      return { type: NodeType.LITERAL, value: null };
    }
    const nestedFunction = parseFunctionCall(arg, functions);
    if (nestedFunction.isFunction) {
      return {
        type: nestedFunction.type,
        name: nestedFunction.name,
        args: nestedFunction.args
      };
    }
    const trimmed = arg.trim();
    const arithmeticOps = [
      { op: " + ", type: "ADD" },
      { op: " - ", type: "SUBTRACT" }
    ];
    let lastArithMatch = -1;
    let lastArithOp = null;
    for (const { op, type } of arithmeticOps) {
      let pos = 0;
      while (pos < trimmed.length) {
        const match = findOperatorOutsideParens(trimmed.substring(pos), op);
        if (match === -1)
          break;
        const actualPos = pos + match;
        if (actualPos > lastArithMatch) {
          lastArithMatch = actualPos;
          lastArithOp = { op, type };
        }
        pos = actualPos + op.length;
      }
    }
    if (lastArithMatch !== -1) {
      try {
        return parseConditionExpression(trimmed, functions);
      } catch (error) {
        return { type: NodeType.VARIABLE, path: trimmed };
      }
    }
    return { type: NodeType.VARIABLE, path: trimmed };
  };
  var FUNCTION_CALL_REGEX = /^\w+\(.*\)$/;
  var INVALID_EXPR_REGEX = /\s[+\-*/%]\s|\|\||&&|\?\?|.*\?.*:/;
  var validateVariableExpression = (expr) => {
    if (!expr || expr.trim() === "" || FUNCTION_CALL_REGEX.test(expr)) {
      return;
    }
    if (INVALID_EXPR_REGEX.test(expr)) {
      if (expr.includes("?") && expr.includes(":")) {
        throw new JemplParseError(
          `Complex expressions not supported in variable replacements - consider calculating the value in your data instead. Offending expression: "${expr}"`
        );
      } else if (expr.includes("||") || expr.includes("&&") || expr.includes("??")) {
        throw new JemplParseError(
          `Logical operators not supported in variable replacements - consider calculating the value in your data instead (operators like ||, &&, ?? are not supported). Offending expression: "${expr}"`
        );
      } else {
        throw new JemplParseError(
          `Arithmetic expressions not supported in variable replacements - consider calculating '${expr}' in your data instead (expressions with +, -, *, /, % are not supported). Offending expression: "${expr}"`
        );
      }
    }
  };
  var parsePathReference = (expr) => {
    const trimmed = expr.trim();
    if (FUNCTION_CALL_REGEX.test(trimmed)) {
      throw new JemplParseError(
        `Functions are not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    if (trimmed.includes("[")) {
      throw new JemplParseError(
        `Array indices not supported in path references - use simple variable names or properties. Offending expression: "#{${expr}}"`
      );
    }
    if (/[+\-*/%]/.test(trimmed)) {
      throw new JemplParseError(
        `Arithmetic expressions not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    if (/\|\||&&/.test(trimmed)) {
      throw new JemplParseError(
        `Logical operators not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    if (trimmed.includes("?") && trimmed.includes(":")) {
      throw new JemplParseError(
        `Complex expressions not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    return {
      type: NodeType.PATH_REFERENCE,
      path: trimmed
    };
  };
  var parseVariable = (expr, functions = {}) => {
    const trimmed = expr.trim();
    validateVariableExpression(trimmed);
    const functionNode = parseFunctionCall(trimmed, functions);
    if (functionNode.isFunction) {
      return {
        type: functionNode.type,
        name: functionNode.name,
        args: functionNode.args
      };
    }
    if (trimmed.includes("[") && !/[\s+\-*/%|&?:]/.test(trimmed)) {
      let bracketCount = 0;
      for (const char of trimmed) {
        if (char === "[")
          bracketCount++;
        else if (char === "]")
          bracketCount--;
      }
      if (bracketCount !== 0) {
        throw new Error("Invalid array index syntax");
      }
    }
    return {
      type: NodeType.VARIABLE,
      path: trimmed
    };
  };
  var parseStringValue = (str, functions = {}) => {
    let processedStr = str;
    const escapedParts = [];
    if (str.includes("\\${") || str.includes("\\#{")) {
      processedStr = str.replace(/\\\\(\$\{[^}]*\})/g, "\\DOUBLE_ESC_VAR$1");
      processedStr = processedStr.replace(
        /\\\\(#\{[^}]*\})/g,
        "\\DOUBLE_ESC_PATH$1"
      );
      processedStr = processedStr.replace(
        /\\(\$\{[^}]*\})/g,
        (match, dollarExpr) => {
          const placeholder = `__ESCAPED_${escapedParts.length}__`;
          escapedParts.push(dollarExpr);
          return placeholder;
        }
      );
      processedStr = processedStr.replace(
        /\\(#\{[^}]*\})/g,
        (match, hashExpr) => {
          const placeholder = `__ESCAPED_${escapedParts.length}__`;
          escapedParts.push(hashExpr);
          return placeholder;
        }
      );
      processedStr = processedStr.replace(/\\DOUBLE_ESC_VAR/g, "\\");
      processedStr = processedStr.replace(/\\DOUBLE_ESC_PATH/g, "\\");
    }
    const varMatches = [...processedStr.matchAll(VARIABLE_REGEX)];
    const pathMatches = [...processedStr.matchAll(PATH_REFERENCE_REGEX)];
    const allMatches = [
      ...varMatches.map((m) => ({ match: m, type: "variable" })),
      ...pathMatches.map((m) => ({ match: m, type: "pathref" }))
    ].sort((a, b) => a.match.index - b.match.index);
    if (allMatches.length === 0) {
      let finalValue = processedStr;
      for (let i = 0; i < escapedParts.length; i++) {
        finalValue = finalValue.replace(`__ESCAPED_${i}__`, escapedParts[i]);
      }
      return {
        type: NodeType.LITERAL,
        value: finalValue
      };
    }
    if (allMatches.length === 1 && allMatches[0].match[0] === processedStr && escapedParts.length === 0) {
      const { match, type } = allMatches[0];
      try {
        if (type === "variable") {
          return parseVariable(match[1], functions);
        } else {
          return parsePathReference(match[1]);
        }
      } catch (e) {
        if (e.message === "Invalid array index syntax") {
          return {
            type: NodeType.LITERAL,
            value: processedStr
          };
        }
        throw e;
      }
    }
    const parts = [];
    let lastIndex = 0;
    for (const { match, type } of allMatches) {
      const [fullMatch, expr] = match;
      const index = match.index;
      if (index > lastIndex) {
        let literalPart = processedStr.substring(lastIndex, index);
        for (let i = 0; i < escapedParts.length; i++) {
          literalPart = literalPart.replace(`__ESCAPED_${i}__`, escapedParts[i]);
        }
        if (literalPart) {
          parts.push(literalPart);
        }
      }
      try {
        let parsedExpr;
        if (type === "variable") {
          parsedExpr = parseVariable(expr.trim(), functions);
        } else {
          parsedExpr = parsePathReference(expr.trim());
        }
        parts.push(parsedExpr);
      } catch (e) {
        if (e.message === "Invalid array index syntax") {
          parts.push(fullMatch);
        } else {
          throw e;
        }
      }
      lastIndex = index + fullMatch.length;
    }
    if (lastIndex < processedStr.length) {
      let literalPart = processedStr.substring(lastIndex);
      for (let i = 0; i < escapedParts.length; i++) {
        literalPart = literalPart.replace(`__ESCAPED_${i}__`, escapedParts[i]);
      }
      if (literalPart) {
        parts.push(literalPart);
      }
    }
    return {
      type: NodeType.INTERPOLATION,
      parts
    };
  };

  // node_modules/jempl/src/parse/utils.js
  var parseValue = (value, functions) => {
    if (typeof value === "string") {
      return parseStringValue(value, functions);
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return parseArray(value, functions);
      } else {
        return parseObject(value, functions);
      }
    } else {
      return {
        type: NodeType.LITERAL,
        value
      };
    }
  };
  var transformEachToFor = (obj) => {
    const { $each, ...bodyProps } = obj;
    if (typeof $each !== "string") {
      throw new JemplParseError("$each value must be a non-empty string");
    }
    const trimmedEach = $each.trim();
    if (trimmedEach === "") {
      throw new JemplParseError("$each value must be a non-empty string");
    }
    if (Object.keys(bodyProps).length === 0) {
      throw new JemplParseError("Empty $each body not allowed");
    }
    if (bodyProps.$partial !== void 0) {
      throw new JemplParseError(
        "Cannot use $partial with $each at the same level. Wrap $partial in a parent object if you need conditionals."
      );
    }
    const forKey = `$for ${trimmedEach}`;
    return {
      [forKey]: bodyProps
    };
  };
  var parseArray = (arr, functions) => {
    const items = [];
    let hasDynamicContent = false;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        if (item.$each !== void 0) {
          try {
            const transformedItem = transformEachToFor(item);
            const keys2 = Object.keys(transformedItem);
            if (keys2.length === 1 && /^\$for(?::\w+)?\s/.test(keys2[0])) {
              const loop = parseLoop(
                keys2[0],
                transformedItem[keys2[0]],
                functions,
                true
              );
              items.push(loop);
              hasDynamicContent = true;
              continue;
            }
          } catch (error) {
            if (error instanceof JemplParseError) {
              throw error;
            }
            throw new JemplParseError(error.message);
          }
        }
        const keys = Object.keys(item);
        if (keys.length === 1 && /^\$for(?::\w+)?\s/.test(keys[0])) {
          const loop = parseLoop(keys[0], item[keys[0]], functions);
          items.push(loop);
          hasDynamicContent = true;
          continue;
        }
      }
      const parsedItem = parseValue(item, functions);
      items.push(parsedItem);
      if (parsedItem.type === NodeType.FUNCTION || parsedItem.type === NodeType.CONDITIONAL || parsedItem.type === NodeType.LOOP || parsedItem.type === NodeType.PARTIAL || parsedItem.type === NodeType.OBJECT && !parsedItem.fast || parsedItem.type === NodeType.ARRAY && !parsedItem.fast) {
        hasDynamicContent = true;
      }
    }
    return {
      type: NodeType.ARRAY,
      items,
      fast: !hasDynamicContent
    };
  };
  var parseObject = (obj, functions) => {
    const properties = [];
    let hasDynamicContent = false;
    let whenCondition = null;
    const entries = Object.entries(obj);
    let i = 0;
    if (obj.$partial !== void 0) {
      if (typeof obj.$partial !== "string") {
        throw new JemplParseError("$partial value must be a string");
      }
      if (obj.$partial.trim() === "") {
        throw new JemplParseError("$partial value cannot be an empty string");
      }
      const conflictingDirectives = ["$if", "$elif", "$else", "$for"];
      const conflicts = [];
      for (const [key] of entries) {
        for (const directive of conflictingDirectives) {
          if (key === directive || key.startsWith(directive + " ") || key.startsWith(directive + "#")) {
            conflicts.push(directive);
            break;
          }
        }
      }
      if (conflicts.length > 0) {
        throw new JemplParseError(
          `Cannot use $partial with ${conflicts.join(", ")} at the same level. Wrap $partial in a parent object if you need conditionals.`
        );
      }
      const { $partial, $when, ...rawData } = obj;
      const data = {};
      let hasData = false;
      for (const [key, value] of Object.entries(rawData)) {
        let actualKey = key;
        if (key.startsWith("\\$")) {
          actualKey = key.slice(1);
        } else if (key.startsWith("$$")) {
          actualKey = key.slice(1);
        }
        data[actualKey] = value;
        hasData = true;
      }
      let parsedData = null;
      if (hasData) {
        parsedData = parseValue(data, functions);
        if (parsedData.type === NodeType.OBJECT) {
          let hasDynamicData = false;
          for (const prop of parsedData.properties) {
            if (prop.value.type === NodeType.VARIABLE || prop.value.type === NodeType.INTERPOLATION || prop.value.type === NodeType.FUNCTION || prop.value.type === NodeType.CONDITIONAL || prop.value.type === NodeType.OBJECT && !prop.value.fast || prop.value.type === NodeType.ARRAY && !prop.value.fast) {
              hasDynamicData = true;
              break;
            }
          }
          if (hasDynamicData) {
            parsedData.fast = false;
          }
        }
      }
      const result2 = {
        type: NodeType.PARTIAL,
        name: $partial,
        data: parsedData
      };
      if ($when !== void 0) {
        let whenCondition2;
        if (typeof $when === "string") {
          if ($when.trim() === "") {
            throw new JemplParseError("Empty condition expression after '$when'");
          }
          whenCondition2 = parseConditionExpression($when, functions);
        } else {
          whenCondition2 = {
            type: NodeType.LITERAL,
            value: $when
          };
        }
        result2.whenCondition = whenCondition2;
      }
      return result2;
    }
    for (const [key, value] of entries) {
      if (key === "$when") {
        if (whenCondition !== null) {
          throw new JemplParseError(
            "Multiple '$when' directives on the same object are not allowed"
          );
        }
        if (value === void 0 || value === null) {
          throw new JemplParseError("Missing condition expression after '$when'");
        }
        const conditionStr = typeof value === "string" ? value : JSON.stringify(value);
        if (conditionStr.trim() === "") {
          throw new JemplParseError("Empty condition expression after '$when'");
        }
        whenCondition = parseConditionExpression(conditionStr, functions);
        hasDynamicContent = true;
      } else if (key.startsWith("$when#") || key.startsWith("$when ")) {
        throw new JemplParseError(
          "'$when' does not support ID syntax or inline conditions - use '$when' as a property"
        );
      }
    }
    while (i < entries.length) {
      const [key, value] = entries[i];
      if (key === "$when") {
        i++;
        continue;
      }
      if (key === "$each") {
        throw new JemplParseError("$each can only be used inside arrays");
      }
      if (key.startsWith("$if ") || key.match(/^\$if#\w+\s/) || key.match(/^\$if\s+\w+.*:$/)) {
        const conditional = parseConditional(entries, i, functions);
        properties.push({
          key,
          value: conditional.node
        });
        hasDynamicContent = true;
        i = conditional.nextIndex;
      } else if (/^\$for(?::\w+)?\s/.test(key)) {
        const modifier = key.match(/^\$for(?::(\w+))?\s/)?.[1] || "";
        const modifierPart = modifier ? `:${modifier}` : "";
        throw new JemplParseError(
          `$for loops must be inside arrays - use '- $for${modifierPart} item in items:' instead of '$for${modifierPart} item in items:'. For cleaner object generation syntax, consider using $each.`
        );
      } else if (key.startsWith("$elif ") || key.startsWith("$else")) {
        throw new JemplParseError(
          `'${key.split(" ")[0]}' without matching '$if'`
        );
      } else if (key === "$if" || key === "$if:") {
        throw new JemplParseError("Missing condition expression after '$if'");
      } else {
        const parsedValue = parseValue(value, functions);
        if (parsedValue.type === NodeType.FUNCTION || parsedValue.type === NodeType.CONDITIONAL || parsedValue.type === NodeType.PARTIAL || parsedValue.type === NodeType.OBJECT && !parsedValue.fast || parsedValue.type === NodeType.ARRAY && !parsedValue.fast) {
          hasDynamicContent = true;
        }
        const parsedKey = parseStringValue(key, functions);
        const prop = { key, value: parsedValue };
        if (parsedKey.type !== NodeType.LITERAL || parsedKey.value !== key) {
          prop.parsedKey = parsedKey;
        }
        properties.push(prop);
        i++;
      }
    }
    const result = {
      type: NodeType.OBJECT,
      properties,
      fast: !hasDynamicContent
    };
    if (whenCondition) {
      result.whenCondition = whenCondition;
    }
    return result;
  };
  var parseConditional = (entries, startIndex, functions = {}) => {
    const conditions = [];
    const bodies = [];
    let currentIndex = startIndex;
    const [ifKey, ifValue] = entries[currentIndex];
    let conditionId = null;
    let conditionExpr;
    if (ifKey.startsWith("$if#")) {
      const match = ifKey.match(/^\$if#(\w+)\s+(.+)$/);
      if (match) {
        conditionId = match[1];
        conditionExpr = match[2];
      } else {
        throw new JemplParseError(`Invalid conditional syntax: ${ifKey}`);
      }
    } else {
      conditionExpr = ifKey.substring(4);
      if (conditionExpr.endsWith(":")) {
        conditionExpr = conditionExpr.slice(0, -1).trim();
      }
    }
    validateConditionExpression(conditionExpr);
    const ifCondition = parseConditionExpression(conditionExpr, functions);
    conditions.push(ifCondition);
    bodies.push(parseValue(ifValue, functions));
    currentIndex++;
    while (currentIndex < entries.length) {
      const [key, value] = entries[currentIndex];
      let isMatching = false;
      let elifConditionExpr;
      if (conditionId) {
        if (key.startsWith(`$elif#${conditionId} `)) {
          elifConditionExpr = key.substring(`$elif#${conditionId} `.length);
          if (elifConditionExpr.endsWith(":")) {
            elifConditionExpr = elifConditionExpr.slice(0, -1).trim();
          }
          isMatching = true;
        } else if (key === `$else#${conditionId}` || key === `$else#${conditionId}:`) {
          isMatching = true;
          elifConditionExpr = null;
        }
      } else {
        if (key.startsWith("$elif ")) {
          elifConditionExpr = key.substring(6);
          if (elifConditionExpr.endsWith(":")) {
            elifConditionExpr = elifConditionExpr.slice(0, -1).trim();
          }
          isMatching = true;
        } else if (key === "$else" || key === "$else:") {
          isMatching = true;
          elifConditionExpr = null;
        }
      }
      if (isMatching) {
        if (elifConditionExpr === null) {
          conditions.push(null);
        } else {
          validateConditionExpression(elifConditionExpr);
          const elifCondition = parseConditionExpression(
            elifConditionExpr,
            functions
          );
          conditions.push(elifCondition);
        }
        bodies.push(parseValue(value, functions));
        currentIndex++;
        if (elifConditionExpr === null) {
          break;
        }
      } else {
        break;
      }
    }
    return {
      node: {
        type: NodeType.CONDITIONAL,
        conditions,
        bodies,
        id: conditionId
      },
      nextIndex: currentIndex
    };
  };
  var parseConditionExpression = (expr, functions = {}) => {
    expr = expr.trim();
    if (expr.startsWith("(") && expr.endsWith(")")) {
      const inner = expr.slice(1, -1);
      let depth = 0;
      let valid = true;
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === "(")
          depth++;
        else if (inner[i] === ")")
          depth--;
        if (depth < 0) {
          valid = false;
          break;
        }
      }
      if (valid && depth === 0) {
        return parseConditionExpression(inner, functions);
      }
    }
    const orMatch = findOperatorOutsideParens(expr, "||");
    if (orMatch !== -1) {
      return {
        type: NodeType.BINARY,
        op: BinaryOp.OR,
        left: parseConditionExpression(
          expr.substring(0, orMatch).trim(),
          functions
        ),
        right: parseConditionExpression(
          expr.substring(orMatch + 2).trim(),
          functions
        )
      };
    }
    const andMatch = findOperatorOutsideParens(expr, "&&");
    if (andMatch !== -1) {
      return {
        type: NodeType.BINARY,
        op: BinaryOp.AND,
        left: parseConditionExpression(
          expr.substring(0, andMatch).trim(),
          functions
        ),
        right: parseConditionExpression(
          expr.substring(andMatch + 2).trim(),
          functions
        )
      };
    }
    const compOps = [
      { op: ">=", type: BinaryOp.GTE },
      { op: "<=", type: BinaryOp.LTE },
      { op: "==", type: BinaryOp.EQ },
      { op: "!=", type: BinaryOp.NEQ },
      { op: ">", type: BinaryOp.GT },
      { op: "<", type: BinaryOp.LT },
      { op: " in ", type: BinaryOp.IN }
    ];
    for (const { op, type } of compOps) {
      const opMatch = findOperatorOutsideParens(expr, op);
      if (opMatch !== -1) {
        return {
          type: NodeType.BINARY,
          op: type,
          left: parseConditionExpression(
            expr.substring(0, opMatch).trim(),
            functions
          ),
          right: parseConditionExpression(
            expr.substring(opMatch + op.length).trim(),
            functions
          )
        };
      }
    }
    let lastArithMatch = -1;
    let lastArithOp = null;
    const arithmeticOps = [
      { op: " + ", type: BinaryOp.ADD },
      { op: " - ", type: BinaryOp.SUBTRACT }
    ];
    for (const { op, type } of arithmeticOps) {
      let pos = 0;
      while (pos < expr.length) {
        const match = findOperatorOutsideParens(expr.substring(pos), op);
        if (match === -1)
          break;
        const actualPos = pos + match;
        if (actualPos > lastArithMatch) {
          lastArithMatch = actualPos;
          lastArithOp = { op, type };
        }
        pos = actualPos + op.length;
      }
    }
    if (lastArithMatch !== -1 && lastArithOp) {
      return {
        type: NodeType.BINARY,
        op: lastArithOp.type,
        left: parseConditionExpression(
          expr.substring(0, lastArithMatch).trim(),
          functions
        ),
        right: parseConditionExpression(
          expr.substring(lastArithMatch + lastArithOp.op.length).trim(),
          functions
        )
      };
    }
    const blockedArithmeticOps = [" * ", " / ", " % "];
    for (const op of blockedArithmeticOps) {
      if (findOperatorOutsideParens(expr, op) !== -1) {
        throw new JemplParseError(
          `Arithmetic operations are not allowed in conditionals: "${op}"`
        );
      }
    }
    if (expr.startsWith("!")) {
      return {
        type: NodeType.UNARY,
        op: UnaryOp.NOT,
        operand: parseConditionExpression(expr.substring(1).trim(), functions)
      };
    }
    return parseIterableExpression(expr, functions);
  };
  var findOperatorOutsideParens = (expr, operator) => {
    let parenDepth = 0;
    let i = 0;
    while (i <= expr.length - operator.length) {
      if (expr[i] === "(") {
        parenDepth++;
      } else if (expr[i] === ")") {
        parenDepth--;
      } else if (parenDepth === 0 && expr.substring(i, i + operator.length) === operator) {
        return i;
      }
      i++;
    }
    return -1;
  };
  var parseAtomicExpression = (expr) => {
    expr = expr.trim();
    if (expr === "true") {
      return { type: NodeType.LITERAL, value: true };
    }
    if (expr === "false") {
      return { type: NodeType.LITERAL, value: false };
    }
    if (expr === "null") {
      return { type: NodeType.LITERAL, value: null };
    }
    if (expr.startsWith('"') && expr.endsWith('"') || expr.startsWith("'") && expr.endsWith("'")) {
      return { type: NodeType.LITERAL, value: expr.slice(1, -1) };
    }
    if (expr === '""' || expr === "''") {
      return { type: NodeType.LITERAL, value: "" };
    }
    if (expr === "{}") {
      return { type: NodeType.LITERAL, value: {} };
    }
    if (expr === "[]") {
      return { type: NodeType.LITERAL, value: [] };
    }
    const num = Number(expr);
    if (!isNaN(num) && isFinite(num)) {
      return { type: NodeType.LITERAL, value: num };
    }
    return { type: NodeType.VARIABLE, path: expr };
  };
  var parseIterableExpression = (expr, functions) => {
    const trimmed = expr.trim();
    const functionMatch = trimmed.match(/^(\w+)\((.*)\)$/);
    if (functionMatch) {
      return parseVariable(trimmed, functions);
    }
    const atomicResult = parseAtomicExpression(trimmed);
    if (atomicResult.type === NodeType.LITERAL) {
      return atomicResult;
    }
    if (/^[a-zA-Z_$][\w.$]*$/.test(trimmed)) {
      return {
        type: NodeType.VARIABLE,
        path: trimmed
      };
    }
    try {
      return parseVariable(trimmed, functions);
    } catch (error) {
      if (error.message && error.message.includes("not supported")) {
        return atomicResult;
      }
      throw error;
    }
  };
  var validateLoopSyntaxWithContext = (loopExpr, isEach = false) => {
    const directive = isEach ? "$each" : "$for";
    try {
      validateLoopSyntax(loopExpr);
    } catch (error) {
      if (error instanceof JemplParseError) {
        if (isEach) {
          const message = error.message.replace(/\$for/g, "$each");
          throw new JemplParseError(message.replace("Parse Error: ", ""));
        }
      }
      throw error;
    }
  };
  var parseLoop = (key, value, functions, isFromEach = false) => {
    const forPattern = /^\$for(?::(\w+))?\s+(.+)$/;
    const match = key.match(forPattern);
    if (!match) {
      const directive = isFromEach ? "$each" : "$for";
      throw new JemplParseError(
        `Invalid loop syntax (got: '${key.replace("$for", directive)}')`
      );
    }
    const modifier = match[1];
    const loopExpr = match[2].trim();
    validateLoopSyntaxWithContext(loopExpr, isFromEach);
    const inMatch = loopExpr.match(/^(.+?)\s+in\s+(.+)$/);
    if (!inMatch) {
      const directive = isFromEach ? "$each" : "$for";
      throw new JemplParseError(
        `Invalid loop syntax - missing 'in' keyword (got: '${directive} ${loopExpr}')`
      );
    }
    const varsExpr = inMatch[1].trim();
    const iterableExpr = inMatch[2].trim();
    let itemVar, indexVar = null;
    if (varsExpr.includes(",")) {
      const vars = varsExpr.split(",").map((v) => v.trim());
      if (vars.length !== 2) {
        throw new JemplParseError(
          `Invalid loop variables: ${varsExpr}. Expected format: "item" or "item, index"`
        );
      }
      itemVar = vars[0];
      indexVar = vars[1];
    } else {
      itemVar = varsExpr;
    }
    const reservedNames = ["this", "undefined", "null", "true", "false"];
    if (reservedNames.includes(itemVar)) {
      throw new JemplParseError(`Reserved variable name: ${itemVar}`);
    }
    if (indexVar && reservedNames.includes(indexVar)) {
      throw new JemplParseError(`Reserved variable name: ${indexVar}`);
    }
    const iterable = parseIterableExpression(iterableExpr, functions);
    const body = parseValue(value, functions);
    return {
      type: NodeType.LOOP,
      itemVar,
      indexVar,
      iterable,
      body,
      flatten: modifier !== "nested"
      // default true, false if :nested
    };
  };

  // node_modules/jempl/src/parse/index.js
  var parse = (template, options = {}) => {
    const { functions = {} } = options;
    return parseValue(template, functions);
  };
  var parse_default = parse;

  // node_modules/jempl/src/functions.js
  var functions_exports = {};
  __export(functions_exports, {
    now: () => now
  });
  var now = () => {
    return Date.now();
  };

  // node_modules/jempl/src/parseAndRender.js
  var parseAndRender = (template, data, options = {}) => {
    const { functions = {}, partials = {} } = options;
    const allFunctions = { ...functions_exports, ...functions };
    const ast = parse_default(template, { functions: allFunctions });
    const parsedPartials = {};
    for (const [name, partialTemplate] of Object.entries(partials)) {
      parsedPartials[name] = parse_default(partialTemplate, { functions: allFunctions });
    }
    return render_default(ast, data, {
      functions: allFunctions,
      partials: parsedPartials
    });
  };
  var parseAndRender_default = parseAndRender;

  // src/components/form/form.store.js
  var isObjectLike = (value) => value !== null && typeof value === "object";
  var isPlainObject = (value) => isObjectLike(value) && !Array.isArray(value);
  var isPathLike = (path) => typeof path === "string" && path.includes(".");
  var hasBracketPathToken = (path) => typeof path === "string" && /[\[\]]/.test(path);
  function pickByPaths(obj, paths) {
    const result = {};
    for (const path of paths) {
      if (typeof path !== "string" || path.length === 0)
        continue;
      const value = get(obj, path);
      if (value !== void 0) {
        set(result, path, value);
      }
    }
    return result;
  }
  function normalizeWhenDirectives(form) {
    if (!isPlainObject(form) || !Array.isArray(form.fields)) {
      return form;
    }
    const normalizeFields = (fields = []) => fields.map((field) => {
      if (!isPlainObject(field)) {
        return field;
      }
      if (typeof field.$when === "string" && field.$when.trim().length > 0) {
        const { $when, ...rest } = field;
        const normalizedField = Array.isArray(rest.fields) ? { ...rest, fields: normalizeFields(rest.fields) } : rest;
        return {
          [`$if ${$when}`]: normalizedField
        };
      }
      if (Array.isArray(field.fields)) {
        return {
          ...field,
          fields: normalizeFields(field.fields)
        };
      }
      return field;
    });
    return {
      ...form,
      fields: normalizeFields(form.fields)
    };
  }
  var get = (obj, path, defaultValue = void 0) => {
    if (!path)
      return defaultValue;
    if (!isObjectLike(obj))
      return defaultValue;
    if (hasBracketPathToken(path))
      return defaultValue;
    const keys = path.split(".").filter((key) => key !== "");
    let current2 = obj;
    for (const key of keys) {
      if (current2 === null || current2 === void 0 || !(key in current2)) {
        if (Object.prototype.hasOwnProperty.call(obj, path)) {
          return obj[path];
        }
        return defaultValue;
      }
      current2 = current2[key];
    }
    return current2;
  };
  var set = (obj, path, value) => {
    if (!isObjectLike(obj) || typeof path !== "string" || path.length === 0) {
      return obj;
    }
    if (hasBracketPathToken(path)) {
      return obj;
    }
    const keys = path.split(".").filter((key) => key !== "");
    if (keys.length === 0) {
      return obj;
    }
    if (isPathLike(path) && Object.prototype.hasOwnProperty.call(obj, path)) {
      delete obj[path];
    }
    let current2 = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current2) || typeof current2[key] !== "object" || current2[key] === null) {
        current2[key] = {};
      }
      current2 = current2[key];
    }
    current2[keys[keys.length - 1]] = value;
    return obj;
  };
  var blacklistedAttrs3 = ["id", "class", "style", "slot", "form", "defaultValues", "disabled"];
  var stringifyAttrs3 = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedAttrs3.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var PATTERN_PRESETS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/
  };
  var DEFAULT_MESSAGES = {
    required: "This field is required",
    minLength: (val) => `Must be at least ${val} characters`,
    maxLength: (val) => `Must be at most ${val} characters`,
    pattern: "Invalid format",
    invalidDate: "Invalid date format",
    invalidTime: "Invalid time format",
    invalidDateTime: "Invalid date and time format",
    minTemporal: (val) => `Must be on or after ${val}`,
    maxTemporal: (val) => `Must be on or before ${val}`
  };
  var DATE_FIELD_TYPE = "input-date";
  var TIME_FIELD_TYPE = "input-time";
  var DATETIME_FIELD_TYPE = "input-datetime";
  var DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
  var TIME_REGEX = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
  var DATETIME_REGEX = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/;
  var parseDateParts = (value) => {
    if (typeof value !== "string")
      return null;
    const match = DATE_REGEX.exec(value);
    if (!match)
      return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!valid)
      return null;
    return { year, month, day };
  };
  var parseTimeParts = (value) => {
    if (typeof value !== "string")
      return null;
    const match = TIME_REGEX.exec(value);
    if (!match)
      return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] === void 0 ? 0 : Number(match[3]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) {
      return null;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      return null;
    }
    return { hour, minute, second };
  };
  var normalizeTimeComparable = (value) => {
    const parts = parseTimeParts(value);
    if (!parts)
      return null;
    return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;
  };
  var normalizeDateComparable = (value) => {
    return parseDateParts(value) ? value : null;
  };
  var normalizeDateTimeComparable = (value) => {
    if (typeof value !== "string")
      return null;
    const match = DATETIME_REGEX.exec(value);
    if (!match)
      return null;
    const date = normalizeDateComparable(match[1]);
    const time = normalizeTimeComparable(match[2]);
    if (!date || !time)
      return null;
    return `${date}T${time}`;
  };
  var getTemporalNormalization = (fieldType) => {
    if (fieldType === DATE_FIELD_TYPE) {
      return {
        normalize: normalizeDateComparable,
        invalidMessage: DEFAULT_MESSAGES.invalidDate
      };
    }
    if (fieldType === TIME_FIELD_TYPE) {
      return {
        normalize: normalizeTimeComparable,
        invalidMessage: DEFAULT_MESSAGES.invalidTime
      };
    }
    if (fieldType === DATETIME_FIELD_TYPE) {
      return {
        normalize: normalizeDateTimeComparable,
        invalidMessage: DEFAULT_MESSAGES.invalidDateTime
      };
    }
    return null;
  };
  var validateTemporalField = (field, value) => {
    const temporal = getTemporalNormalization(field.type);
    if (!temporal)
      return null;
    if (value === void 0 || value === null || value === "") {
      return null;
    }
    const comparableValue = temporal.normalize(String(value));
    if (!comparableValue) {
      return temporal.invalidMessage;
    }
    if (field.min !== void 0 && field.min !== null && String(field.min) !== "") {
      const minComparable = temporal.normalize(String(field.min));
      if (minComparable && comparableValue < minComparable) {
        return DEFAULT_MESSAGES.minTemporal(String(field.min));
      }
    }
    if (field.max !== void 0 && field.max !== null && String(field.max) !== "") {
      const maxComparable = temporal.normalize(String(field.max));
      if (maxComparable && comparableValue > maxComparable) {
        return DEFAULT_MESSAGES.maxTemporal(String(field.max));
      }
    }
    return null;
  };
  var validateField = (field, value) => {
    if (field.required) {
      const isEmpty = value === void 0 || value === null || value === "" || typeof value === "boolean" && value === false;
      const isEmptyNumber = field.type === "input-number" && value === null;
      const shouldFail = field.type === "input-number" ? isEmptyNumber : isEmpty;
      if (shouldFail) {
        if (typeof field.required === "object" && field.required.message) {
          return field.required.message;
        }
        return DEFAULT_MESSAGES.required;
      }
    }
    const temporalError = validateTemporalField(field, value);
    if (temporalError) {
      return temporalError;
    }
    if (Array.isArray(field.rules)) {
      for (const rule of field.rules) {
        const error = validateRule(rule, value);
        if (error)
          return error;
      }
    }
    return null;
  };
  var validateRule = (rule, value) => {
    if (value === void 0 || value === null || value === "")
      return null;
    const strValue = String(value);
    switch (rule.rule) {
      case "minLength": {
        if (strValue.length < rule.value) {
          return rule.message || DEFAULT_MESSAGES.minLength(rule.value);
        }
        return null;
      }
      case "maxLength": {
        if (strValue.length > rule.value) {
          return rule.message || DEFAULT_MESSAGES.maxLength(rule.value);
        }
        return null;
      }
      case "pattern": {
        const preset = PATTERN_PRESETS[rule.value];
        let regex = preset;
        if (!regex) {
          try {
            regex = new RegExp(rule.value);
          } catch {
            return rule.message || DEFAULT_MESSAGES.pattern;
          }
        }
        if (!regex.test(strValue)) {
          return rule.message || DEFAULT_MESSAGES.pattern;
        }
        return null;
      }
      default:
        return null;
    }
  };
  var validateForm = (fields, formValues) => {
    const errors2 = {};
    const dataFields = collectAllDataFields(fields);
    for (const field of dataFields) {
      const value = get(formValues, field.name);
      const error = validateField(field, value);
      if (error) {
        errors2[field.name] = error;
      }
    }
    return {
      valid: Object.keys(errors2).length === 0,
      errors: errors2
    };
  };
  var DISPLAY_TYPES = ["section", "read-only-text", "slot"];
  var isDataField = (field) => {
    return !DISPLAY_TYPES.includes(field.type);
  };
  var collectAllDataFields = (fields) => {
    const result = [];
    for (const field of fields) {
      if (field.type === "section" && Array.isArray(field.fields)) {
        result.push(...collectAllDataFields(field.fields));
      } else if (isDataField(field)) {
        result.push(field);
      }
    }
    return result;
  };
  var getDefaultValue = (field) => {
    switch (field.type) {
      case "input-text":
      case "input-date":
      case "input-time":
      case "input-datetime":
      case "input-textarea":
      case "popover-input":
        return "";
      case "input-number":
        return null;
      case "select":
        return null;
      case "checkbox":
        return false;
      case "color-picker":
        return "#000000";
      case "slider":
      case "slider-with-input":
        return field.min !== void 0 ? field.min : 0;
      case "image":
        return null;
      default:
        return null;
    }
  };
  var flattenFields = (fields, startIdx = 0) => {
    const result = [];
    let idx = startIdx;
    for (const field of fields) {
      if (field.type === "section") {
        result.push({
          ...field,
          _isSection: true,
          _idx: idx
        });
        idx++;
        if (Array.isArray(field.fields)) {
          const nested = flattenFields(field.fields, idx);
          result.push(...nested);
          idx += nested.length;
        }
      } else {
        result.push({
          ...field,
          _isSection: false,
          _idx: idx
        });
        idx++;
      }
    }
    return result;
  };
  var createInitialState4 = () => Object.freeze({
    formValues: {},
    errors: {},
    reactiveMode: false,
    tooltipState: {
      open: false,
      x: 0,
      y: 0,
      content: ""
    }
  });
  var selectForm = ({ state, props }) => {
    const { form = {} } = props || {};
    const normalizedForm = normalizeWhenDirectives(form);
    const context = isPlainObject(props?.context) ? props.context : {};
    const stateFormValues = isPlainObject(state?.formValues) ? state.formValues : {};
    const mergedContext = {
      ...context,
      ...stateFormValues,
      formValues: stateFormValues
    };
    if (Object.keys(mergedContext).length > 0) {
      return parseAndRender_default(normalizedForm, mergedContext);
    }
    return normalizedForm;
  };
  var selectViewData4 = ({ state, props }) => {
    const containerAttrString = stringifyAttrs3(props);
    const form = selectForm({ state, props });
    const fields = form.fields || [];
    const formDisabled = !!props?.disabled;
    const flatFields = flattenFields(fields);
    flatFields.forEach((field, arrIdx) => {
      field._arrIdx = arrIdx;
      if (field._isSection)
        return;
      const isData = isDataField(field);
      field._disabled = formDisabled || !!field.disabled;
      if (isData && field.name) {
        field._error = state.errors[field.name] || null;
      }
      if (field.type === "input-text") {
        field._inputType = field.inputType || "text";
      }
      if (field.type === "select") {
        const val = get(state.formValues, field.name);
        field._selectedValue = val !== void 0 ? val : null;
        field.placeholder = field.placeholder || "";
        field.noClear = field.clearable === false;
      }
      if (field.type === "image") {
        const src = get(state.formValues, field.name);
        field._imageSrc = src && String(src).trim() ? src : null;
        field.placeholderText = field.placeholderText || "No Image";
      }
      if (field.type === "read-only-text") {
        field.content = field.content || "";
      }
      if (field.type === "checkbox") {
        const inlineText = typeof field.content === "string" ? field.content : typeof field.checkboxLabel === "string" ? field.checkboxLabel : "";
        field._checkboxText = inlineText;
      }
    });
    const actions = form.actions || { buttons: [] };
    const layout = actions.layout || "split";
    const buttons = (actions.buttons || []).map((btn, i) => ({
      ...btn,
      _globalIdx: i,
      variant: btn.variant || "se",
      _disabled: formDisabled || !!btn.disabled,
      pre: btn.pre || "",
      suf: btn.suf || ""
    }));
    let actionsData;
    if (layout === "split") {
      actionsData = {
        _layout: "split",
        buttons,
        _leftButtons: buttons.filter((b) => b.align === "left"),
        _rightButtons: buttons.filter((b) => b.align !== "left")
      };
    } else {
      actionsData = {
        _layout: layout,
        buttons,
        _allButtons: buttons
      };
    }
    return {
      containerAttrString,
      title: form?.title || "",
      description: form?.description || "",
      flatFields,
      actions: actionsData,
      formValues: state.formValues,
      tooltipState: state.tooltipState
    };
  };
  var selectFormValues = ({ state, props }) => {
    const form = selectForm({ state, props });
    const dataFields = collectAllDataFields(form.fields || []);
    return pickByPaths(
      state.formValues,
      dataFields.map((f) => f.name).filter((name) => typeof name === "string" && name.length > 0)
    );
  };
  var setFormFieldValue = ({ state, props }, payload = {}) => {
    const { name, value } = payload;
    if (!name)
      return;
    set(state.formValues, name, value);
    pruneHiddenValues({ state, props });
  };
  var pruneHiddenValues = ({ state, props }) => {
    if (!props)
      return;
    const form = selectForm({ state, props });
    const dataFields = collectAllDataFields(form.fields || []);
    state.formValues = pickByPaths(
      state.formValues,
      dataFields.map((f) => f.name).filter((name) => typeof name === "string" && name.length > 0)
    );
  };
  var setFormValues = ({ state }, payload = {}) => {
    const { values } = payload;
    if (!values || typeof values !== "object")
      return;
    Object.keys(values).forEach((key) => {
      set(state.formValues, key, values[key]);
    });
  };
  var resetFormValues = ({ state }, payload = {}) => {
    const { defaultValues = {} } = payload;
    state.formValues = defaultValues ? structuredClone(defaultValues) : {};
    state.errors = {};
    state.reactiveMode = false;
  };
  var setErrors = ({ state }, payload = {}) => {
    state.errors = payload.errors || {};
  };
  var clearFieldError = ({ state }, payload = {}) => {
    const { name } = payload;
    if (name && state.errors[name]) {
      delete state.errors[name];
    }
  };
  var setReactiveMode = ({ state }) => {
    state.reactiveMode = true;
  };
  var showTooltip = ({ state }, payload = {}) => {
    const { x, y, content } = payload;
    state.tooltipState = {
      open: true,
      x,
      y,
      content
    };
  };
  var hideTooltip = ({ state }) => {
    state.tooltipState = {
      ...state.tooltipState,
      open: false
    };
  };

  // src/components/form/form.handlers.js
  var syncInteractiveFieldAttribute = ({ field, target, value }) => {
    if (!field || !target)
      return;
    if (!["slider-with-input", "popover-input"].includes(field.type))
      return;
    if (value === void 0 || value === null) {
      target.removeAttribute("value");
    } else {
      target.setAttribute("value", String(value));
    }
  };
  var updateFieldAttributes = ({
    form,
    formValues = {},
    refs,
    formDisabled = false
  }) => {
    const fields = form.fields || [];
    let idx = 0;
    const walk = (fieldList) => {
      for (const field of fieldList) {
        if (field.type === "section") {
          idx++;
          if (Array.isArray(field.fields)) {
            walk(field.fields);
          }
          continue;
        }
        const ref = refs[`field${idx}`];
        idx++;
        if (!ref)
          continue;
        const disabled = formDisabled || !!field.disabled;
        if (["input-text", "input-date", "input-time", "input-datetime", "input-number", "input-textarea", "color-picker", "slider", "slider-with-input", "popover-input"].includes(field.type)) {
          const value = get(formValues, field.name);
          if (value === void 0 || value === null) {
            ref.removeAttribute("value");
          } else {
            ref.setAttribute("value", String(value));
          }
          if (field.type === "slider-with-input" && ref.store?.setValue) {
            const normalized = Number(value ?? 0);
            ref.store.setValue({ value: Number.isFinite(normalized) ? normalized : 0 });
            if (typeof ref.render === "function") {
              ref.render();
            }
          }
          if (field.type === "popover-input" && ref.store?.setValue) {
            ref.store.setValue({ value: value === void 0 || value === null ? "" : String(value) });
            if (typeof ref.render === "function") {
              ref.render();
            }
          }
        }
        if (field.type === "checkbox") {
          const value = get(formValues, field.name);
          if (value) {
            ref.setAttribute("checked", "");
          } else {
            ref.removeAttribute("checked");
          }
        }
        if (["input-text", "input-date", "input-time", "input-datetime", "input-number", "input-textarea", "popover-input"].includes(field.type) && field.placeholder) {
          const current2 = ref.getAttribute("placeholder");
          if (current2 !== field.placeholder) {
            if (field.placeholder === void 0 || field.placeholder === null) {
              ref.removeAttribute("placeholder");
            } else {
              ref.setAttribute("placeholder", field.placeholder);
            }
          }
        }
        if (disabled) {
          ref.setAttribute("disabled", "");
        } else {
          ref.removeAttribute("disabled");
        }
      }
    };
    walk(fields);
  };
  var initFormValues = (store, props) => {
    const defaultValues = props?.defaultValues || {};
    const seededValues = {};
    Object.keys(defaultValues).forEach((path) => {
      set(seededValues, path, defaultValues[path]);
    });
    const form = selectForm({ state: { formValues: seededValues }, props });
    const dataFields = collectAllDataFields(form.fields || []);
    const initial = {};
    for (const field of dataFields) {
      const defaultVal = get(defaultValues, field.name);
      if (defaultVal !== void 0) {
        set(initial, field.name, defaultVal);
      } else {
        set(initial, field.name, getDefaultValue(field));
      }
    }
    store.resetFormValues({ defaultValues: initial });
  };
  var handleBeforeMount = (deps2) => {
    const { store, props } = deps2;
    initFormValues(store, props);
  };
  var handleAfterMount = (deps2) => {
    const { props, refs, render: render3 } = deps2;
    const state = deps2.store.getState();
    const form = selectForm({ state, props });
    updateFieldAttributes({
      form,
      formValues: state.formValues,
      refs,
      formDisabled: !!props?.disabled
    });
    render3();
  };
  var handleOnUpdate = (deps2, payload) => {
    const { newProps } = payload;
    const { store, render: render3, refs } = deps2;
    const formDisabled = !!newProps?.disabled;
    const state = store.getState();
    pruneHiddenValues({ state, props: newProps });
    const form = selectForm({ state, props: newProps });
    updateFieldAttributes({
      form,
      formValues: state.formValues,
      refs,
      formDisabled
    });
    render3();
  };
  var handleValueInput = (deps2, payload) => {
    const { store, dispatchEvent, render: render3, props } = deps2;
    const event = payload._event;
    const name = event.currentTarget.dataset.fieldName;
    if (!name || !event.detail || !Object.prototype.hasOwnProperty.call(event.detail, "value")) {
      return;
    }
    const value = event.detail.value;
    store.setFormFieldValue({ name, value });
    const state = store.getState();
    pruneHiddenValues({ state, props });
    const form = selectForm({ state, props });
    const dataFields = collectAllDataFields(form.fields || []);
    const field = dataFields.find((f) => f.name === name);
    syncInteractiveFieldAttribute({
      field,
      target: event.currentTarget,
      value
    });
    if (state.reactiveMode) {
      if (field) {
        const error = validateField(field, value);
        if (error) {
          store.setErrors({ errors: { ...state.errors, [name]: error } });
        } else {
          store.clearFieldError({ name });
        }
      }
    }
    render3();
    dispatchEvent(
      new CustomEvent("form-input", {
        bubbles: true,
        detail: {
          name,
          value,
          values: selectFormValues({ state: store.getState(), props })
        }
      })
    );
  };
  var handleValueChange = (deps2, payload) => {
    const { store, dispatchEvent, render: render3, props } = deps2;
    const event = payload._event;
    const name = event.currentTarget.dataset.fieldName;
    if (!name || !event.detail || !Object.prototype.hasOwnProperty.call(event.detail, "value")) {
      return;
    }
    const value = event.detail.value;
    store.setFormFieldValue({ name, value });
    const state = store.getState();
    pruneHiddenValues({ state, props });
    const form = selectForm({ state, props });
    const dataFields = collectAllDataFields(form.fields || []);
    const field = dataFields.find((f) => f.name === name);
    syncInteractiveFieldAttribute({
      field,
      target: event.currentTarget,
      value
    });
    if (state.reactiveMode) {
      if (field) {
        const error = validateField(field, value);
        if (error) {
          store.setErrors({ errors: { ...state.errors, [name]: error } });
        } else {
          store.clearFieldError({ name });
        }
      }
    }
    render3();
    dispatchEvent(
      new CustomEvent("form-change", {
        bubbles: true,
        detail: {
          name,
          value,
          values: selectFormValues({ state: store.getState(), props })
        }
      })
    );
  };
  var handleActionClick = (deps2, payload) => {
    const { store, dispatchEvent, render: render3, props } = deps2;
    const event = payload._event;
    const actionId = event.currentTarget.dataset.actionId;
    if (!actionId)
      return;
    const state = store.getState();
    const form = selectForm({ state, props });
    const actions = form.actions || {};
    const buttons = actions.buttons || [];
    const button = buttons.find((b) => b.id === actionId);
    const values = selectFormValues({ state, props });
    if (button && button.validate) {
      const dataFields = collectAllDataFields(form.fields || []);
      const { valid, errors: errors2 } = validateForm(dataFields, state.formValues);
      store.setErrors({ errors: errors2 });
      if (!valid) {
        store.setReactiveMode();
      }
      render3();
      dispatchEvent(
        new CustomEvent("form-action", {
          bubbles: true,
          detail: {
            actionId,
            values,
            valid,
            errors: errors2
          }
        })
      );
    } else {
      dispatchEvent(
        new CustomEvent("form-action", {
          bubbles: true,
          detail: {
            actionId,
            values
          }
        })
      );
    }
  };
  var handleImageClick = (deps2, payload) => {
    const event = payload._event;
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    const { store, dispatchEvent, props } = deps2;
    const name = event.currentTarget.dataset.fieldName;
    dispatchEvent(
      new CustomEvent("form-field-event", {
        bubbles: true,
        detail: {
          name,
          event: event.type,
          values: selectFormValues({ state: store.getState(), props })
        }
      })
    );
  };
  var handleKeyDown = (deps2, payload) => {
    const { store, dispatchEvent, render: render3, props } = deps2;
    const event = payload._event;
    if (event.key === "Enter" && !event.shiftKey) {
      const target = event.target;
      if (target.tagName === "TEXTAREA" || target.tagName === "RTGL-TEXTAREA") {
        return;
      }
      event.preventDefault();
      const state = store.getState();
      const form = selectForm({ state, props });
      const actions = form.actions || {};
      const buttons = actions.buttons || [];
      const validateButton = buttons.find((b) => b.validate);
      const targetButton = validateButton || buttons[0];
      if (!targetButton)
        return;
      const values = selectFormValues({ state, props });
      if (targetButton.validate) {
        const dataFields = collectAllDataFields(form.fields || []);
        const { valid, errors: errors2 } = validateForm(dataFields, state.formValues);
        store.setErrors({ errors: errors2 });
        if (!valid) {
          store.setReactiveMode();
        }
        render3();
        dispatchEvent(
          new CustomEvent("form-action", {
            bubbles: true,
            detail: {
              actionId: targetButton.id,
              values,
              valid,
              errors: errors2
            }
          })
        );
      } else {
        dispatchEvent(
          new CustomEvent("form-action", {
            bubbles: true,
            detail: {
              actionId: targetButton.id,
              values
            }
          })
        );
      }
    }
  };
  var handleTooltipMouseEnter = (deps2, payload) => {
    const { store, render: render3, props } = deps2;
    const event = payload._event;
    const fieldName = event.currentTarget.dataset.fieldName;
    const form = selectForm({ state: store.getState(), props });
    const allFields = collectAllDataFields(form.fields || []);
    const field = allFields.find((f) => f.name === fieldName);
    if (field && field.tooltip) {
      const rect = event.currentTarget.getBoundingClientRect();
      store.showTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        content: typeof field.tooltip === "string" ? field.tooltip : field.tooltip.content || ""
      });
      render3();
    }
  };
  var handleTooltipMouseLeave = (deps2) => {
    const { store, render: render3 } = deps2;
    store.hideTooltip({});
    render3();
  };

  // src/components/form/form.methods.js
  var form_methods_exports = {};
  __export(form_methods_exports, {
    getValues: () => getValues,
    reset: () => reset,
    setValues: () => setValues,
    validate: () => validate
  });
  var VALUE_FIELD_TYPES = [
    "input-text",
    "input-date",
    "input-time",
    "input-datetime",
    "input-number",
    "input-textarea",
    "color-picker",
    "slider",
    "slider-with-input",
    "popover-input"
  ];
  var TEXT_LIKE_FIELD_TYPES = [
    "input-text",
    "input-date",
    "input-time",
    "input-datetime",
    "input-number",
    "input-textarea",
    "popover-input",
    "slider-with-input"
  ];
  var syncFieldValueAttribute = ({ ref, fieldType, value, forceRefresh = false }) => {
    if (!VALUE_FIELD_TYPES.includes(fieldType))
      return;
    if (forceRefresh) {
      ref.removeAttribute("value");
    }
    if (value === void 0 || value === null) {
      if (TEXT_LIKE_FIELD_TYPES.includes(fieldType) && forceRefresh) {
        if (fieldType === "popover-input") {
          ref.removeAttribute("value");
          return;
        }
        ref.setAttribute("value", "");
        return;
      }
      ref.removeAttribute("value");
      return;
    }
    ref.setAttribute("value", String(value));
  };
  var syncSelectFieldState = ({ ref, value }) => {
    if (!ref)
      return;
    if (!ref?.store?.updateSelectedValue)
      return;
    ref.store.updateSelectedValue({ value });
    if (typeof ref.render === "function") {
      ref.render();
    }
  };
  var buildFieldRefMap = (root) => {
    const map = /* @__PURE__ */ new Map();
    if (!root || typeof root.querySelectorAll !== "function") {
      return map;
    }
    root.querySelectorAll("[data-field-name]").forEach((ref) => {
      const name = ref.getAttribute("data-field-name");
      if (name) {
        map.set(name, ref);
      }
    });
    return map;
  };
  var resolveRenderRoot = (instance) => {
    if (instance?.renderTarget)
      return instance.renderTarget;
    if (instance?.shadowRoot)
      return instance.shadowRoot;
    return instance?.shadow;
  };
  var syncSelectRefsFromValues = ({ root, values = {} }) => {
    if (!root || typeof root.querySelectorAll !== "function")
      return;
    const selectRefs = root.querySelectorAll("rtgl-select[data-field-name]");
    selectRefs.forEach((ref) => {
      const fieldName = ref.dataset?.fieldName;
      if (!fieldName)
        return;
      const value = get(values, fieldName);
      syncSelectFieldState({ ref, value });
    });
  };
  var getValues = function() {
    const state = this.store.getState();
    return selectFormValues({ state, props: this.props });
  };
  var setValues = function(payload = {}) {
    const values = payload && typeof payload === "object" && payload.values && typeof payload.values === "object" ? payload.values : payload;
    if (!values || typeof values !== "object" || Array.isArray(values))
      return;
    this.store.setFormValues({ values });
    this.store.pruneHiddenValues();
    const state = this.store.getState();
    const form = selectForm({ state, props: this.props });
    const dataFields = collectAllDataFields(form.fields || []);
    const refsByName = buildFieldRefMap(resolveRenderRoot(this));
    for (const field of dataFields) {
      if (!field.name)
        continue;
      const ref = refsByName.get(field.name);
      if (!ref)
        continue;
      const hasDirectValue = Object.prototype.hasOwnProperty.call(values, field.name);
      const incomingValue = get(values, field.name);
      if (!hasDirectValue && incomingValue === void 0)
        continue;
      const value = get(state.formValues, field.name);
      syncFieldValueAttribute({
        ref,
        fieldType: field.type,
        value,
        forceRefresh: true
      });
      if (typeof ref?.tagName === "string" && ref.tagName.toUpperCase() === "RTGL-SELECT") {
        syncSelectFieldState({ ref, value });
      }
      if (field.type === "checkbox") {
        if (value) {
          ref.setAttribute("checked", "");
        } else {
          ref.removeAttribute("checked");
        }
      }
    }
    this.render();
    const syncSelects = () => {
      const nextState = this.store.getState();
      syncSelectRefsFromValues({
        root: resolveRenderRoot(this),
        values: nextState.formValues
      });
    };
    syncSelects();
    setTimeout(() => {
      syncSelects();
    }, 0);
  };
  var validate = function() {
    const state = this.store.getState();
    const form = selectForm({ state, props: this.props });
    const dataFields = collectAllDataFields(form.fields || []);
    const { valid, errors: errors2 } = validateForm(dataFields, state.formValues);
    this.store.setErrors({ errors: errors2 });
    if (!valid) {
      this.store.setReactiveMode();
    }
    this.render();
    return { valid, errors: errors2 };
  };
  var reset = function() {
    const defaultValues = this.props?.defaultValues || {};
    const seededValues = {};
    Object.keys(defaultValues).forEach((path) => {
      set(seededValues, path, defaultValues[path]);
    });
    const form = selectForm({ state: { formValues: seededValues }, props: this.props });
    const dataFields = collectAllDataFields(form.fields || []);
    const initial = {};
    for (const field of dataFields) {
      const defaultVal = get(defaultValues, field.name);
      if (defaultVal !== void 0) {
        set(initial, field.name, defaultVal);
      } else {
        set(initial, field.name, getDefaultValue(field));
      }
    }
    this.store.resetFormValues({ defaultValues: initial });
    this.setValues(initial);
  };

  // .temp/components/form.schema.js
  var form_schema_default = { "componentName": "rtgl-form", "propsSchema": { "type": "object", "properties": { "form": { "type": "object" }, "defaultValues": { "type": "object" }, "context": { "type": "object" }, "disabled": { "type": "boolean" } } }, "events": { "form-input": {}, "form-change": {}, "form-field-event": {}, "form-action": {} }, "methods": { "type": "object", "properties": { "getValues": { "type": "function" }, "setValues": { "type": "function" }, "validate": { "type": "function" }, "reset": { "type": "function" } } } };

  // .temp/components/form.view.js
  var form_view_default = { "refs": { "formContainer": { "eventListeners": { "keydown": { "handler": "handleKeyDown" } } }, "action*": { "eventListeners": { "click": { "handler": "handleActionClick" } } }, "tooltipIcon*": { "eventListeners": { "mouseenter": { "handler": "handleTooltipMouseEnter" }, "mouseleave": { "handler": "handleTooltipMouseLeave" } } }, "field*": { "eventListeners": { "value-input": { "handler": "handleValueInput" }, "value-change": { "handler": "handleValueChange" } } }, "image*": { "eventListeners": { "click": { "handler": "handleImageClick" }, "contextmenu": { "handler": "handleImageClick" } } } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#formContainer w=f p=md g=lg ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=sm w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if title", "value": { "type": 6, "conditions": [{ "type": 1, "path": "title" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "title" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if description", "value": { "type": 6, "conditions": [{ "type": 1, "path": "description" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=mu-fg", "value": { "type": 1, "path": "description" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-view g=lg w=f", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "field", "indexVar": "i", "iterable": { "type": 1, "path": "flatFields" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if field._isSection", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field._isSection" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=md w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=sm", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if field.label", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field.label" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=md", "value": { "type": 1, "path": "field.label" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if field.description", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field.description" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=mu-fg", "value": { "type": 1, "path": "field.description" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if !field._isSection", "value": { "type": 6, "conditions": [{ "type": 5, "op": 0, "operand": { "type": 1, "path": "field._isSection" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=md w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if field.label || field.description", "value": { "type": 6, "conditions": [{ "type": 4, "op": 7, "left": { "type": 1, "path": "field.label" }, "right": { "type": 1, "path": "field.description" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=sm", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h g=md av=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if field.label", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field.label" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text", "value": { "type": 1, "path": "field.label" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if field.required", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field.required" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=fg s=sm", "value": { "type": 0, "value": "*" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if field.tooltip", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field.tooltip" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-svg#tooltipIcon${field._idx} data-field-name=${field.name} svg="info" wh=16 c=mu-fg cur=help ml=xs', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg#tooltipIcon", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, ' svg="info" wh=16 c=mu-fg cur=help ml=xs'] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if field.description", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field.description" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=mu-fg", "value": { "type": 1, "path": "field.description" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "input-text"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "input-text" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-input#field${field._idx} data-field-name=${field.name} w=f type=${field._inputType} placeholder=${field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f type=", { "type": 1, "path": "field._inputType" }, " placeholder=", { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "input-date"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "input-date" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-input-date#field${field._idx} data-field-name=${field.name} w=f min=${field.min} max=${field.max} placeholder=${field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input-date#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f min=", { "type": 1, "path": "field.min" }, " max=", { "type": 1, "path": "field.max" }, " placeholder=", { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "input-time"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "input-time" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-input-time#field${field._idx} data-field-name=${field.name} w=f min=${field.min} max=${field.max} step=${field.step} placeholder=${field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input-time#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f min=", { "type": 1, "path": "field.min" }, " max=", { "type": 1, "path": "field.max" }, " step=", { "type": 1, "path": "field.step" }, " placeholder=", { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "input-datetime"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "input-datetime" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-input-datetime#field${field._idx} data-field-name=${field.name} w=f min=${field.min} max=${field.max} step=${field.step} placeholder=${field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input-datetime#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f min=", { "type": 1, "path": "field.min" }, " max=", { "type": 1, "path": "field.max" }, " step=", { "type": 1, "path": "field.step" }, " placeholder=", { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "input-number"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "input-number" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-input-number#field${field._idx} data-field-name=${field.name} w=f min=${field.min} max=${field.max} step=${field.step} placeholder=${field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input-number#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f min=", { "type": 1, "path": "field.min" }, " max=", { "type": 1, "path": "field.max" }, " step=", { "type": 1, "path": "field.step" }, " placeholder=", { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "input-textarea"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "input-textarea" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-textarea#field${field._idx} data-field-name=${field.name} w=f rows=${field.rows} placeholder=${field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-textarea#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f rows=", { "type": 1, "path": "field.rows" }, " placeholder=", { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "select"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "select" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-select#field${field._idx} data-field-name=${field.name} w=f :options=flatFields[${field._arrIdx}].options ?no-clear=flatFields[${field._arrIdx}].noClear :selectedValue=#{field._selectedValue} :placeholder=#{field.placeholder} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-select#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f :options=flatFields[", { "type": 1, "path": "field._arrIdx" }, "].options ?no-clear=flatFields[", { "type": 1, "path": "field._arrIdx" }, "].noClear :selectedValue=", { "type": 11, "path": "field._selectedValue" }, " :placeholder=", { "type": 11, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "color-picker"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "color-picker" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-color-picker#field${field._idx} data-field-name=${field.name} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-color-picker#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "slider"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "slider" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-slider#field${field._idx} data-field-name=${field.name} w=f min=${field.min} max=${field.max} step=${field.step} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-slider#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f min=", { "type": 1, "path": "field.min" }, " max=", { "type": 1, "path": "field.max" }, " step=", { "type": 1, "path": "field.step" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "slider-with-input"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "slider-with-input" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-slider-input#field${field._idx} data-field-name=${field.name} w=f min=${field.min} max=${field.max} step=${field.step} ?disabled=${field._disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-slider-input#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=f min=", { "type": 1, "path": "field.min" }, " max=", { "type": 1, "path": "field.max" }, " step=", { "type": 1, "path": "field.step" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "popover-input"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "popover-input" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-popover-input#field${field._idx} data-field-name=${field.name} label="${field.label}" placeholder=${field.placeholder} ?disabled=${field._disabled}', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-popover-input#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, ' label="', { "type": 1, "path": "field.label" }, '" placeholder=', { "type": 1, "path": "field.placeholder" }, " ?disabled=", { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "checkbox"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "checkbox" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-checkbox#field${field._idx} data-field-name=${field.name} label="${field._checkboxText}" ?disabled=${field._disabled}', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-checkbox#field", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, ' label="', { "type": 1, "path": "field._checkboxText" }, '" ?disabled=', { "type": 1, "path": "field._disabled" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "image" && field._imageSrc', "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "image" } }, "right": { "type": 1, "path": "field._imageSrc" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-image#image${field._idx} data-field-name=${field.name} src=${field._imageSrc} w=${field.width} h=${field.height} cur=pointer", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image#image", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " src=", { "type": 1, "path": "field._imageSrc" }, " w=", { "type": 1, "path": "field.width" }, " h=", { "type": 1, "path": "field.height" }, " cur=pointer"] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "image" && !field._imageSrc', "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "image" } }, "right": { "type": 5, "op": 0, "operand": { "type": 1, "path": "field._imageSrc" } } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#image${field._idx} data-field-name=${field.name} w=${field.width} h=${field.height} bc=ac bw=sm ah=c av=c cur=pointer p=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=mu-fg ta=c", "value": { "type": 1, "path": "field.placeholderText" } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view#image", { "type": 1, "path": "field._idx" }, " data-field-name=", { "type": 1, "path": "field.name" }, " w=", { "type": 1, "path": "field.width" }, " h=", { "type": 1, "path": "field.height" }, " bc=ac bw=sm ah=c av=c cur=pointer p=md"] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "read-only-text"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "read-only-text" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm", "value": { "type": 1, "path": "field.content" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if field.type == "slot"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "field.type" }, "right": { "type": 0, "value": "slot" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'slot#fieldSlot${field._idx} name=${field.slot} style="display: contents;"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["slot#fieldSlot", { "type": 1, "path": "field._idx" }, " name=", { "type": 1, "path": "field.slot" }, ' style="display: contents;"'] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if field._error", "value": { "type": 6, "conditions": [{ "type": 1, "path": "field._error" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=de", "value": { "type": 1, "path": "field._error" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false } }], "fast": false } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if actions.buttons.length > 0", "value": { "type": 6, "conditions": [{ "type": 4, "op": 2, "left": { "type": 1, "path": "actions.buttons.length" }, "right": { "type": 0, "value": 0 } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": '$if actions._layout == "split"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "actions._layout" }, "right": { "type": 0, "value": "split" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h w=f g=sm", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h g=sm", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "button", "indexVar": "i", "iterable": { "type": 1, "path": "actions._leftButtons" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#action${button._globalIdx} data-action-id=${button.id} v=${button.variant} ?disabled=${button._disabled} pre=${button.pre} suf=${button.suf}", "value": { "type": 1, "path": "button.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-button#action", { "type": 1, "path": "button._globalIdx" }, " data-action-id=", { "type": 1, "path": "button.id" }, " v=", { "type": 1, "path": "button.variant" }, " ?disabled=", { "type": 1, "path": "button._disabled" }, " pre=", { "type": 1, "path": "button.pre" }, " suf=", { "type": 1, "path": "button.suf" }] } }], "fast": true }], "fast": true } }], "fast": false } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-view d=h g=sm ah=e w=1fg", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "button", "indexVar": "i", "iterable": { "type": 1, "path": "actions._rightButtons" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#action${button._globalIdx} data-action-id=${button.id} v=${button.variant} ?disabled=${button._disabled} pre=${button.pre} suf=${button.suf}", "value": { "type": 1, "path": "button.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-button#action", { "type": 1, "path": "button._globalIdx" }, " data-action-id=", { "type": 1, "path": "button.id" }, " v=", { "type": 1, "path": "button.variant" }, " ?disabled=", { "type": 1, "path": "button._disabled" }, " pre=", { "type": 1, "path": "button.pre" }, " suf=", { "type": 1, "path": "button.suf" }] } }], "fast": true }], "fast": true } }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if actions._layout == "vertical"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "actions._layout" }, "right": { "type": 0, "value": "vertical" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=sm w=f", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "button", "indexVar": "i", "iterable": { "type": 1, "path": "actions._allButtons" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#action${button._globalIdx} data-action-id=${button.id} v=${button.variant} w=f ?disabled=${button._disabled} pre=${button.pre} suf=${button.suf}", "value": { "type": 1, "path": "button.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-button#action", { "type": 1, "path": "button._globalIdx" }, " data-action-id=", { "type": 1, "path": "button.id" }, " v=", { "type": 1, "path": "button.variant" }, " w=f ?disabled=", { "type": 1, "path": "button._disabled" }, " pre=", { "type": 1, "path": "button.pre" }, " suf=", { "type": 1, "path": "button.suf" }] } }], "fast": true }], "fast": true } }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": '$if actions._layout == "stretch"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "actions._layout" }, "right": { "type": 0, "value": "stretch" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h g=sm w=f", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "button", "indexVar": "i", "iterable": { "type": 1, "path": "actions._allButtons" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=1fg", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#action${button._globalIdx} data-action-id=${button.id} v=${button.variant} w=f ?disabled=${button._disabled} pre=${button.pre} suf=${button.suf}", "value": { "type": 1, "path": "button.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-button#action", { "type": 1, "path": "button._globalIdx" }, " data-action-id=", { "type": 1, "path": "button.id" }, " v=", { "type": 1, "path": "button.variant" }, " w=f ?disabled=", { "type": 1, "path": "button._disabled" }, " pre=", { "type": 1, "path": "button.pre" }, " suf=", { "type": 1, "path": "button.suf" }] } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true } }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": 'rtgl-tooltip ?open=${tooltipState.open} x=${tooltipState.x} y=${tooltipState.y} place="t" content="${tooltipState.content}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-tooltip ?open=", { "type": 1, "path": "tooltipState.open" }, " x=", { "type": 1, "path": "tooltipState.x" }, " y=", { "type": 1, "path": "tooltipState.y" }, ' place="t" content="', { "type": 1, "path": "tooltipState.content" }, '"'] } }], "fast": true }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view#formContainer w=f p=md g=lg ", { "type": 1, "path": "containerAttrString" }] } }], "fast": false }], "fast": false } };

  // src/components/globalUi/globalUi.handlers.js
  var globalUi_handlers_exports = {};
  __export(globalUi_handlers_exports, {
    handleCancel: () => handleCancel,
    handleCloseAll: () => handleCloseAll,
    handleConfirm: () => handleConfirm,
    handleDialogClose: () => handleDialogClose,
    handleDropdownClose: () => handleDropdownClose,
    handleDropdownItemClick: () => handleDropdownItemClick,
    handleShowAlert: () => handleShowAlert,
    handleShowConfirm: () => handleShowConfirm,
    handleShowDropdownMenu: () => handleShowDropdownMenu
  });
  var handleDialogClose = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    store.closeAll();
    render3();
  };
  var handleConfirm = (deps2, payload) => {
    const { store, render: render3, globalUI: globalUI2 } = deps2;
    store.closeAll();
    render3();
    globalUI2.emit("event", true);
  };
  var handleCancel = (deps2, payload) => {
    const { store, render: render3, globalUI: globalUI2 } = deps2;
    store.closeAll();
    render3();
    globalUI2.emit("event", false);
  };
  var handleDropdownClose = (deps2, payload) => {
    const { store, render: render3, globalUI: globalUI2 } = deps2;
    store.closeAll();
    render3();
    globalUI2.emit("event", null);
  };
  var handleDropdownItemClick = (deps2, payload) => {
    const { store, render: render3, globalUI: globalUI2 } = deps2;
    const event = payload._event;
    const { index, item } = event.detail;
    store.closeAll();
    render3();
    globalUI2.emit("event", { index, item });
  };
  var handleShowAlert = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    const options = payload;
    if (store.selectIsOpen()) {
      store.closeAll();
      render3();
    }
    store.setAlertConfig(options);
    render3();
  };
  var handleShowConfirm = async (deps2, payload) => {
    const { store, render: render3, globalUI: globalUI2 } = deps2;
    const options = payload;
    if (store.selectIsOpen()) {
      store.closeAll();
      render3();
    }
    store.setConfirmConfig(options);
    render3();
    return new Promise((resolve) => {
      globalUI2.once("event", (result) => {
        resolve(result);
      });
    });
  };
  var handleShowDropdownMenu = async (deps2, payload) => {
    const { store, render: render3, globalUI: globalUI2 } = deps2;
    const options = payload;
    if (store.selectIsOpen()) {
      store.closeAll();
      render3();
    }
    store.setDropdownConfig(options);
    render3();
    return new Promise((resolve) => {
      globalUI2.once("event", (result) => {
        resolve(result);
      });
    });
  };
  var handleCloseAll = (deps2) => {
    const { store, render: render3 } = deps2;
    if (store.selectIsOpen()) {
      store.closeAll();
      render3();
    }
  };

  // .temp/components/globalUi.schema.js
  var globalUi_schema_default = { "componentName": "rtgl-global-ui", "propsSchema": { "type": "object", "properties": {} }, "events": [], "methods": { "type": "object", "properties": {} } };

  // src/components/globalUi/globalUi.store.js
  var globalUi_store_exports = {};
  __export(globalUi_store_exports, {
    closeAll: () => closeAll,
    createInitialState: () => createInitialState5,
    selectConfig: () => selectConfig,
    selectDropdownConfig: () => selectDropdownConfig,
    selectIsOpen: () => selectIsOpen,
    selectUiType: () => selectUiType,
    selectViewData: () => selectViewData5,
    setAlertConfig: () => setAlertConfig,
    setConfirmConfig: () => setConfirmConfig,
    setDropdownConfig: () => setDropdownConfig
  });
  var createInitialState5 = () => Object.freeze({
    isOpen: false,
    uiType: "dialog",
    // "dialog" | "dropdown"
    config: {
      status: void 0,
      // undefined | info | warning | error
      title: "",
      message: "",
      confirmText: "OK",
      cancelText: "Cancel",
      mode: "alert"
      // alert | confirm
    },
    dropdownConfig: {
      items: [],
      x: 0,
      y: 0,
      place: "bs"
    }
  });
  var setAlertConfig = ({ state }, options = {}) => {
    if (!options.message) {
      throw new Error("message is required for showAlert");
    }
    state.config = {
      status: options.status || void 0,
      title: options.title || "",
      message: options.message,
      confirmText: options.confirmText || "OK",
      cancelText: "",
      mode: "alert"
    };
    state.uiType = "dialog";
    state.isOpen = true;
  };
  var setConfirmConfig = ({ state }, options = {}) => {
    if (!options.message) {
      throw new Error("message is required for showConfirm");
    }
    state.config = {
      status: options.status || void 0,
      title: options.title || "",
      message: options.message,
      confirmText: options.confirmText || "Yes",
      cancelText: options.cancelText || "Cancel",
      mode: "confirm"
    };
    state.uiType = "dialog";
    state.isOpen = true;
  };
  var setDropdownConfig = ({ state }, options = {}) => {
    if (!options.items || !Array.isArray(options.items)) {
      throw new Error("items array is required for showDropdown");
    }
    state.dropdownConfig = {
      items: options.items,
      x: options.x || 0,
      y: options.y || 0,
      place: options.place || "bs"
    };
    state.uiType = "dropdown";
    state.isOpen = true;
  };
  var closeAll = ({ state }) => {
    state.isOpen = false;
    state.uiType = "dialog";
  };
  var selectConfig = ({ state }) => state.config;
  var selectDropdownConfig = ({ state }) => state.dropdownConfig;
  var selectUiType = ({ state }) => state.uiType;
  var selectIsOpen = ({ state }) => state.isOpen;
  var selectViewData5 = ({ state }) => {
    return {
      isOpen: state.isOpen,
      uiType: state.uiType,
      config: state.config,
      dropdownConfig: {
        items: state.dropdownConfig?.items || [],
        x: state.dropdownConfig?.x || 0,
        y: state.dropdownConfig?.y || 0,
        place: state.dropdownConfig?.place || "bs"
      },
      isDialogOpen: state.isOpen && state.uiType === "dialog",
      isDropdownOpen: state.isOpen && state.uiType === "dropdown"
    };
  };

  // .temp/components/globalUi.view.js
  var globalUi_view_default = { "refs": { "dialog": { "eventListeners": { "close": { "handler": "handleDialogClose" } } }, "confirmButton": { "eventListeners": { "click": { "handler": "handleConfirm" } } }, "cancelButton": { "eventListeners": { "click": { "handler": "handleCancel" } } }, "dropdownMenu": { "eventListeners": { "close": { "handler": "handleDropdownClose" }, "item-click": { "handler": "handleDropdownItemClick" } } } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-dialog#dialog ?open=${isDialogOpen} s=sm", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view slot=content g=lg p=lg", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h g=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h ah=c av=c g=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=md", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view h=24 av=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "config.title" } }], "fast": true }], "fast": true } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-text", "value": { "type": 1, "path": "config.message" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view d=h g=md mt=lg w=f ah=e", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if config.mode == 'confirm'", "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "config.mode" }, "right": { "type": 0, "value": "confirm" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#cancelButton v=se", "value": { "type": 1, "path": "config.cancelText" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-button#confirmButton v=pr", "value": { "type": 1, "path": "config.confirmText" } }], "fast": true }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-dialog#dialog ?open=", { "type": 1, "path": "isDialogOpen" }, " s=sm"] } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-dropdown-menu#dropdownMenu ?open=${isDropdownOpen} x=${dropdownConfig.x} y=${dropdownConfig.y} place=${dropdownConfig.place} :items=dropdownConfig.items key=dropdown-${isDropdownOpen}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-dropdown-menu#dropdownMenu ?open=", { "type": 1, "path": "isDropdownOpen" }, " x=", { "type": 1, "path": "dropdownConfig.x" }, " y=", { "type": 1, "path": "dropdownConfig.y" }, " place=", { "type": 1, "path": "dropdownConfig.place" }, " :items=dropdownConfig.items key=dropdown-", { "type": 1, "path": "isDropdownOpen" }] } }], "fast": true }], "fast": false } };

  // src/components/navbar/navbar.handlers.js
  var navbar_handlers_exports = {};
  __export(navbar_handlers_exports, {
    handleClickStart: () => handleClickStart
  });
  var handleClickStart = (deps2, payload) => {
    const { dispatchEvent, store } = deps2;
    const event = payload._event;
    console.log("handle click start", store.selectPath());
    dispatchEvent(new CustomEvent("start-click", {
      detail: {
        path: store.selectPath()
      }
    }));
  };

  // .temp/components/navbar.schema.js
  var navbar_schema_default = { "componentName": "rtgl-navbar", "propsSchema": { "type": "object", "properties": { "start": { "type": "object", "properties": { "label": { "type": "string" }, "href": { "type": "string" }, "image": { "type": "object", "properties": { "src": { "type": "string" } } } } } } }, "events": { "start-click": { "type": "object", "properties": { "path": { "type": "string" } } } }, "methods": { "type": "object", "properties": {} } };

  // src/components/navbar/navbar.store.js
  var navbar_store_exports = {};
  __export(navbar_store_exports, {
    createInitialState: () => createInitialState6,
    selectPath: () => selectPath,
    selectViewData: () => selectViewData6,
    setState: () => setState
  });
  var createInitialState6 = () => Object.freeze({});
  var blacklistedAttrs4 = ["id", "class", "style", "slot", "start"];
  var stringifyAttrs4 = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedAttrs4.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var parseMaybeEncodedJson = (value) => {
    if (value === void 0 || value === null) {
      return void 0;
    }
    if (typeof value === "object") {
      return value;
    }
    if (typeof value !== "string") {
      return void 0;
    }
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      try {
        return JSON.parse(value);
      } catch {
        return void 0;
      }
    }
  };
  var selectViewData6 = ({ props }) => {
    const attrsStart = parseMaybeEncodedJson(props.start) || props.start;
    const containerAttrString = stringifyAttrs4(props);
    const start = attrsStart || {
      label: "",
      // href: undefined,
      // path: undefined,
      image: {
        src: "",
        width: 32,
        height: 32,
        alt: ""
      }
    };
    return {
      containerAttrString,
      start
    };
  };
  var selectPath = ({ props }) => {
    return props.start?.path;
  };
  var setState = ({ state }) => {
  };

  // .temp/components/navbar.view.js
  var navbar_view_default = { "refs": { "start": { "eventListeners": { "click": { "handler": "handleClickStart" } } } }, "anchors": [[{ "rtgl-text s=lg": "${start.label}" }, { "$if start.image && start.image.src": [{ "rtgl-image w=${start.image.width} h=${start.image.height} src=${start.image.src} alt=${start.image.alt}": null }] }]], "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view bgc=bg d=h h=48 av=c w=f ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if start.href", "value": { "type": 6, "conditions": [{ "type": 1, "path": "start.href" }, { "type": 1, "path": "start.path" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "a href=${start.href}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h av=c g=md", "value": { "type": 9, "items": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "start.label" } }], "fast": true }, { "type": 8, "properties": [{ "key": "$if start.image && start.image.src", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "start.image" }, "right": { "type": 1, "path": "start.image.src" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-image w=${start.image.width} h=${start.image.height} src=${start.image.src} alt=${start.image.alt}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "start.image.width" }, " h=", { "type": 1, "path": "start.image.height" }, " src=", { "type": 1, "path": "start.image.src" }, " alt=", { "type": 1, "path": "start.image.alt" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["a href=", { "type": 1, "path": "start.href" }] } }], "fast": false }], "fast": false }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#start d=h av=c g=md cur=pointer", "value": { "type": 9, "items": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "start.label" } }], "fast": true }, { "type": 8, "properties": [{ "key": "$if start.image && start.image.src", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "start.image" }, "right": { "type": 1, "path": "start.image.src" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-image w=${start.image.width} h=${start.image.height} src=${start.image.src} alt=${start.image.alt}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "start.image.width" }, " h=", { "type": 1, "path": "start.image.height" }, " src=", { "type": 1, "path": "start.image.src" }, " alt=", { "type": 1, "path": "start.image.alt" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h av=c g=md", "value": { "type": 9, "items": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "start.label" } }], "fast": true }, { "type": 8, "properties": [{ "key": "$if start.image && start.image.src", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "start.image" }, "right": { "type": 1, "path": "start.image.src" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-image w=${start.image.width} h=${start.image.height} src=${start.image.src} alt=${start.image.alt}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "start.image.width" }, " h=", { "type": 1, "path": "start.image.height" }, " src=", { "type": 1, "path": "start.image.src" }, " alt=", { "type": 1, "path": "start.image.alt" }] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-view w=1fg", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view d=h av=c g=lg", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "slot name=right", "value": { "type": 0, "value": null } }], "fast": true }], "fast": true } }], "fast": true }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view bgc=bg d=h h=48 av=c w=f ", { "type": 1, "path": "containerAttrString" }] } }], "fast": false }], "fast": false } };

  // src/components/pageOutline/pageOutline.handlers.js
  var pageOutline_handlers_exports = {};
  __export(pageOutline_handlers_exports, {
    handleBeforeMount: () => handleBeforeMount2
  });
  var updateToLatestCurrentId = (headingElements, offsetTop, deps2) => {
    const { store, render: render3 } = deps2;
    let currentHeadingId;
    let closestTopPosition = -Infinity;
    headingElements.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      if (rect.top <= offsetTop) {
        if (rect.top > closestTopPosition) {
          closestTopPosition = rect.top;
          currentHeadingId = heading.id;
        }
      }
    });
    if (!currentHeadingId) {
      let lowestTop = Infinity;
      headingElements.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top > offsetTop && rect.top < lowestTop) {
          lowestTop = rect.top;
          currentHeadingId = heading.id;
        }
      });
    }
    if (currentHeadingId && currentHeadingId !== store.selectCurrentId()) {
      store.setCurrentId({ id: currentHeadingId });
      render3();
    }
  };
  var startListening = (contentContainer, scrollContainer, offsetTop, deps2) => {
    const { store, render: render3 } = deps2;
    const headings = contentContainer.querySelectorAll("h1[id], h2[id], h3[id], h4[id], rtgl-text[id]");
    const headingElements = Array.from(headings);
    const items = headingElements.map((heading) => {
      let level = 1;
      const tagName2 = heading.tagName.toLowerCase();
      if (tagName2 === "h1")
        level = 1;
      else if (tagName2 === "h2")
        level = 2;
      else if (tagName2 === "h3")
        level = 3;
      else if (tagName2 === "h4")
        level = 4;
      else if (tagName2 === "rtgl-text") {
        level = parseInt(heading.getAttribute("data-level") || "1", 10);
      }
      return {
        id: heading.id,
        href: `#${heading.id}`,
        title: heading.textContent,
        level
      };
    });
    store.setItems({ items });
    updateToLatestCurrentId(headingElements, offsetTop, deps2);
    render3();
    const boundCheckCurrentHeading = updateToLatestCurrentId.bind(void 0, headingElements, offsetTop, deps2);
    scrollContainer.addEventListener("scroll", boundCheckCurrentHeading, {
      passive: true
    });
    return () => {
      scrollContainer.removeEventListener("scroll", boundCheckCurrentHeading);
    };
  };
  var handleBeforeMount2 = (deps2) => {
    const { props } = deps2;
    let stopListening = () => {
    };
    requestAnimationFrame(() => {
      const targetElement = document.getElementById(props.targetId);
      if (!targetElement) {
        return;
      }
      let scrollContainer = window;
      if (props.scrollContainerId) {
        scrollContainer = document.getElementById(props.scrollContainerId) || window;
      }
      const offsetTop = parseInt(props.offsetTop || "100", 10);
      stopListening = startListening(targetElement, scrollContainer, offsetTop, deps2);
    });
    return () => {
      stopListening();
    };
  };

  // .temp/components/pageOutline.schema.js
  var pageOutline_schema_default = { "componentName": "rtgl-page-outline", "propsSchema": { "type": "object", "properties": { "targetId": { "type": "string" }, "scrollContainerId": { "type": "string" }, "offsetTop": { "type": "string" } } }, "events": { "onItemClick": { "type": "object" } }, "methods": { "type": "object", "properties": {} } };

  // src/components/pageOutline/pageOutline.store.js
  var pageOutline_store_exports = {};
  __export(pageOutline_store_exports, {
    createInitialState: () => createInitialState7,
    selectCurrentId: () => selectCurrentId,
    selectState: () => selectState,
    selectViewData: () => selectViewData7,
    setContentContainer: () => setContentContainer,
    setCurrentId: () => setCurrentId,
    setItems: () => setItems
  });
  var createInitialState7 = () => Object.freeze({
    items: [],
    currentId: null,
    contentContainer: null
  });
  var selectViewData7 = ({ state }) => {
    const getActiveParentIds = (items, currentId) => {
      const activeParentIds2 = /* @__PURE__ */ new Set();
      const currentIndex = items.findIndex((item) => item.id === currentId);
      if (currentIndex === -1)
        return activeParentIds2;
      const currentLevel = items[currentIndex].level;
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (items[i].level < currentLevel) {
          let ancestorLevel = items[i].level;
          activeParentIds2.add(items[i].id);
          for (let j = i - 1; j >= 0; j--) {
            if (items[j].level < ancestorLevel) {
              activeParentIds2.add(items[j].id);
              ancestorLevel = items[j].level;
            }
          }
          break;
        }
      }
      return activeParentIds2;
    };
    const activeParentIds = getActiveParentIds(state.items, state.currentId);
    return {
      items: state.items.map((item) => {
        const mlValues = {
          1: "0",
          2: "12px",
          3: "24px",
          4: "32px"
        };
        const isDirectlyActive = item.id === state.currentId;
        const isParentActive = activeParentIds.has(item.id);
        const active = isDirectlyActive || isParentActive;
        return {
          ...item,
          c: active ? "fg" : "mu-fg",
          ml: mlValues[item.level] || "",
          bc: active ? "fg" : "mu-fg"
        };
      }),
      currentId: state.currentId
    };
  };
  var selectState = ({ state }) => {
    return state;
  };
  var selectCurrentId = ({ state }) => {
    return state.currentId;
  };
  var setItems = ({ state }, payload = {}) => {
    state.items = Array.isArray(payload.items) ? payload.items : [];
  };
  var setCurrentId = ({ state }, payload = {}) => {
    state.currentId = payload.id;
  };
  var setContentContainer = ({ state }, payload = {}) => {
    state.contentContainer = payload.container;
  };

  // .temp/components/pageOutline.view.js
  var pageOutline_view_default = { "refs": {}, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view h=f w=272 d=v pr=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f h=1fg sv mt=xl", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "item", "indexVar": "i", "iterable": { "type": 1, "path": "items" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-view d=h bwl=xs bc="${item.bc}" pv=sm av=c href=${item.href} pl=md', "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=${item.ml}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-view w=", { "type": 1, "path": "item.ml" }] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-text s=sm c=${item.c} h-c=fg", "value": { "type": 1, "path": "item.title" }, "parsedKey": { "type": 2, "parts": ["rtgl-text s=sm c=", { "type": 1, "path": "item.c" }, " h-c=fg"] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ['rtgl-view d=h bwl=xs bc="', { "type": 1, "path": "item.bc" }, '" pv=sm av=c href=', { "type": 1, "path": "item.href" }, " pl=md"] } }], "fast": true }], "fast": true } }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false } };

  // src/components/popoverInput/popoverInput.handlers.js
  var popoverInput_handlers_exports = {};
  __export(popoverInput_handlers_exports, {
    handleBeforeMount: () => handleBeforeMount3,
    handleInputChange: () => handleInputChange,
    handleInputKeydown: () => handleInputKeydown,
    handleOnUpdate: () => handleOnUpdate2,
    handlePopoverClose: () => handlePopoverClose,
    handleSubmitClick: () => handleSubmitClick,
    handleTextClick: () => handleTextClick
  });
  var normalizePopoverValue = (value) => {
    if (value === void 0 || value === null || value === true) {
      return "";
    }
    return String(value);
  };
  var commitValue = (deps2, value) => {
    const { store, render: render3, dispatchEvent } = deps2;
    const nextValue = normalizePopoverValue(value);
    store.setValue({ value: nextValue });
    store.closePopover({});
    dispatchEvent(new CustomEvent("value-change", {
      detail: { value: nextValue },
      bubbles: true
    }));
    render3();
  };
  var handleBeforeMount3 = (deps2) => {
    const { store, props } = deps2;
    if (props.value !== void 0) {
      const value = normalizePopoverValue(props.value);
      store.setValue({ value });
      store.setTempValue({ value });
    }
  };
  var handleOnUpdate2 = (deps2, payload) => {
    const { oldProps, newProps } = payload;
    const { store, render: render3 } = deps2;
    const valueChanged = oldProps?.value !== newProps?.value;
    if (valueChanged) {
      const value = normalizePopoverValue(newProps?.value);
      store.setValue({ value });
      if (!store.getState().isOpen) {
        store.setTempValue({ value });
      }
    }
    render3();
  };
  var handleTextClick = (deps2, payload) => {
    const { store, render: render3, refs, props } = deps2;
    if (props.disabled) {
      return;
    }
    const event = payload._event;
    const value = normalizePopoverValue(props.value);
    store.setValue({ value });
    store.setTempValue({ value });
    store.openPopover({
      position: {
        x: event.currentTarget.getBoundingClientRect().left,
        y: event.currentTarget.getBoundingClientRect().bottom
      }
    });
    render3();
    setTimeout(() => {
      const { input } = refs;
      if (!input)
        return;
      input.value = value;
      input.focus();
      const innerInput = input.shadowRoot?.querySelector("input, textarea");
      if (innerInput && typeof innerInput.focus === "function") {
        innerInput.focus();
      }
    }, 50);
  };
  var handlePopoverClose = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    store.closePopover({});
    render3();
  };
  var handleInputChange = (deps2, payload) => {
    const { store } = deps2;
    const event = payload._event;
    const value = normalizePopoverValue(event.detail.value);
    store.setTempValue({ value });
  };
  var handleSubmitClick = (deps2) => {
    const { store, refs } = deps2;
    const { input } = refs;
    const value = input ? input.value : store.getState().tempValue;
    commitValue(deps2, value);
  };
  var handleInputKeydown = (deps2, payload) => {
    const { store, refs } = deps2;
    const event = payload._event;
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const { input } = refs;
      const value = input ? input.value : store.getState().tempValue;
      commitValue(deps2, value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      store.closePopover({});
      deps2.render();
    }
  };

  // .temp/components/popoverInput.schema.js
  var popoverInput_schema_default = { "componentName": "rtgl-popover-input", "propsSchema": { "type": "object", "properties": { "value": { "type": "string" }, "placeholder": { "type": "string" }, "label": { "type": "string" }, "autoFocus": { "type": "boolean" }, "disabled": { "type": "boolean", "default": false } } }, "events": { "value-change": {} }, "methods": { "type": "object", "properties": {} } };

  // src/components/popoverInput/popoverInput.store.js
  var popoverInput_store_exports = {};
  __export(popoverInput_store_exports, {
    closePopover: () => closePopover,
    createInitialState: () => createInitialState8,
    openPopover: () => openPopover,
    selectValue: () => selectValue,
    selectViewData: () => selectViewData8,
    setTempValue: () => setTempValue,
    setValue: () => setValue
  });
  var createInitialState8 = () => Object.freeze({
    isOpen: false,
    position: {
      x: 0,
      y: 0
    },
    value: "",
    tempValue: ""
  });
  var selectViewData8 = ({ props, state }) => {
    const hasValue = typeof state.value === "string" && state.value.length > 0;
    const value = hasValue ? state.value : "-";
    const placeholder = typeof props.placeholder === "string" ? props.placeholder : "";
    const label = typeof props.label === "string" ? props.label : "";
    const disabled = Boolean(props.disabled);
    return {
      isOpen: state.isOpen,
      position: state.position,
      value,
      valueColor: hasValue ? "fg" : "mu-fg",
      tempValue: state.tempValue,
      placeholder,
      label,
      disabled
    };
  };
  var setTempValue = ({ state }, payload = {}) => {
    state.tempValue = payload.value;
  };
  var openPopover = ({ state }, payload = {}) => {
    const { position } = payload;
    state.position = position;
    state.isOpen = true;
    state.hasUnsavedChanges = false;
  };
  var closePopover = ({ state }) => {
    state.isOpen = false;
    state.tempValue = "";
  };
  var setValue = ({ state }, payload = {}) => {
    state.value = payload.value;
  };
  var selectValue = ({ state }) => {
    return state.value;
  };

  // .temp/components/popoverInput.view.js
  var popoverInput_view_default = { "refs": { "textDisplay": { "eventListeners": { "click": { "handler": "handleTextClick" } } }, "popover": { "eventListeners": { "close": { "handler": "handlePopoverClose" } } }, "input": { "eventListeners": { "value-input": { "handler": "handleInputChange" }, "keydown": { "handler": "handleInputKeydown" } } }, "submit": { "eventListeners": { "click": { "handler": "handleSubmitClick" } } } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#textDisplay w=f cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=${valueColor}", "value": { "type": 1, "path": "value" }, "parsedKey": { "type": 2, "parts": ["rtgl-text c=", { "type": 1, "path": "valueColor" }] } }], "fast": true }], "fast": true } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-popover#popover ?open=${isOpen} x=${position.x} y=${position.y}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view g=md w=240 slot=content bgc=mu br=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text", "value": { "type": 1, "path": "label" } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-input#input w=f placeholder=${placeholder} ?disabled=${disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input#input w=f placeholder=", { "type": 1, "path": "placeholder" }, " ?disabled=", { "type": 1, "path": "disabled" }] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view w=f ah=e", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-button#submit ?disabled=${disabled}", "value": { "type": 0, "value": "Submit" }, "parsedKey": { "type": 2, "parts": ["rtgl-button#submit ?disabled=", { "type": 1, "path": "disabled" }] } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-popover#popover ?open=", { "type": 1, "path": "isOpen" }, " x=", { "type": 1, "path": "position.x" }, " y=", { "type": 1, "path": "position.y" }] } }], "fast": true }], "fast": true } };

  // src/components/select/select.handlers.js
  var select_handlers_exports = {};
  __export(select_handlers_exports, {
    handleAddOptionClick: () => handleAddOptionClick,
    handleAddOptionMouseEnter: () => handleAddOptionMouseEnter,
    handleAddOptionMouseLeave: () => handleAddOptionMouseLeave,
    handleBeforeMount: () => handleBeforeMount4,
    handleButtonClick: () => handleButtonClick,
    handleClearClick: () => handleClearClick,
    handleClickOptionsPopoverOverlay: () => handleClickOptionsPopoverOverlay,
    handleOnUpdate: () => handleOnUpdate3,
    handleOptionClick: () => handleOptionClick,
    handleOptionMouseEnter: () => handleOptionMouseEnter,
    handleOptionMouseLeave: () => handleOptionMouseLeave
  });
  var handleBeforeMount4 = (deps2) => {
    const { store, props, render: render3 } = deps2;
    if (props.selectedValue !== null && props.selectedValue !== void 0 && props.options) {
      const selectedOption = props.options.find((opt) => deepEqual(opt.value, props.selectedValue));
      if (selectedOption) {
        store.updateSelectedValue({
          value: selectedOption?.value
        });
        render3();
      }
    }
  };
  var handleOnUpdate3 = (deps2, payload) => {
    const { oldProps, newProps } = payload;
    const { store, render: render3 } = deps2;
    let shouldRender = false;
    if (!!newProps?.disabled && !oldProps?.disabled) {
      store.closeOptionsPopover({});
      shouldRender = true;
    }
    if (oldProps.selectedValue !== newProps.selectedValue) {
      store.updateSelectedValue({ value: newProps.selectedValue });
      shouldRender = true;
    }
    if (shouldRender) {
      render3();
    }
  };
  var handleButtonClick = (deps2, payload) => {
    const { store, render: render3, refs, props } = deps2;
    if (props.disabled)
      return;
    const event = payload._event;
    event.stopPropagation();
    const button = refs.selectButton;
    const firstChild = button.firstElementChild;
    const rect = firstChild ? firstChild.getBoundingClientRect() : button.getBoundingClientRect();
    const storeSelectedValue = store.selectSelectedValue();
    const currentValue = storeSelectedValue !== null ? storeSelectedValue : props.selectedValue;
    let selectedIndex = null;
    if (currentValue !== null && currentValue !== void 0 && props.options) {
      selectedIndex = props.options.findIndex((opt) => deepEqual(opt.value, currentValue));
      if (selectedIndex === -1)
        selectedIndex = null;
    }
    store.openOptionsPopover({
      position: {
        y: rect.bottom + 12,
        // Bottom edge of button
        x: rect.left - 24
        // Left edge of button
      },
      selectedIndex
    });
    render3();
  };
  var handleClickOptionsPopoverOverlay = (deps2) => {
    const { store, render: render3 } = deps2;
    store.closeOptionsPopover({});
    render3();
  };
  var handleOptionClick = (deps2, payload) => {
    const { render: render3, dispatchEvent, props, store } = deps2;
    if (props.disabled)
      return;
    const event = payload._event;
    event.stopPropagation();
    const id = event.currentTarget.id.slice("option".length);
    const index = Number(id);
    const option = props.options[id];
    store.updateSelectedValue({ value: option?.value });
    if (props.onChange && typeof props.onChange === "function") {
      props.onChange(option.value);
    }
    dispatchEvent(new CustomEvent("value-change", {
      detail: {
        value: option.value,
        label: option.label,
        index,
        item: option
      },
      bubbles: true
    }));
    render3();
  };
  var handleOptionMouseEnter = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    const event = payload._event;
    const id = parseInt(event.currentTarget.id.slice("option".length), 10);
    store.setHoveredOption({ optionId: id });
    render3();
  };
  var handleOptionMouseLeave = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    store.clearHoveredOption({});
    render3();
  };
  var handleClearClick = (deps2, payload) => {
    const { store, render: render3, dispatchEvent, props } = deps2;
    if (props.disabled)
      return;
    const event = payload._event;
    event.stopPropagation();
    store.clearSelectedValue({});
    if (props.onChange && typeof props.onChange === "function") {
      props.onChange(void 0);
    }
    dispatchEvent(new CustomEvent("value-change", {
      detail: {
        value: void 0,
        label: void 0,
        index: null,
        item: void 0
      },
      bubbles: true
    }));
    render3();
  };
  var handleAddOptionClick = (deps2, payload) => {
    if (deps2.props.disabled)
      return;
    const { store, render: render3, dispatchEvent } = deps2;
    const { _event: event } = payload;
    event.stopPropagation();
    store.closeOptionsPopover({});
    dispatchEvent(new CustomEvent("add-option-click", {
      bubbles: true
    }));
    render3();
  };
  var handleAddOptionMouseEnter = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    store.setHoveredAddOption({ isHovered: true });
    render3();
  };
  var handleAddOptionMouseLeave = (deps2, payload) => {
    const { store, render: render3 } = deps2;
    store.setHoveredAddOption({ isHovered: false });
    render3();
  };

  // .temp/components/select.schema.js
  var select_schema_default = { "componentName": "rtgl-select", "propsSchema": { "type": "object", "properties": { "placeholder": { "type": "string" }, "options": { "type": "array", "items": { "type": "object", "properties": { "label": { "type": "string" }, "value": { "type": "any" }, "testId": { "type": "string" } } } }, "selectedValue": { "type": "any" }, "onChange": { "type": "function" }, "noClear": { "type": "boolean" }, "addOption": { "type": "object", "properties": { "label": { "type": "string" } } }, "disabled": { "type": "boolean" }, "w": { "type": "string" } } }, "events": { "value-change": {}, "add-option-click": {} }, "methods": { "type": "object", "properties": {} } };

  // src/components/select/select.store.js
  var select_store_exports = {};
  __export(select_store_exports, {
    clearHoveredOption: () => clearHoveredOption,
    clearSelectedValue: () => clearSelectedValue,
    closeOptionsPopover: () => closeOptionsPopover,
    createInitialState: () => createInitialState9,
    openOptionsPopover: () => openOptionsPopover,
    resetSelection: () => resetSelection,
    selectSelectedValue: () => selectSelectedValue,
    selectState: () => selectState2,
    selectViewData: () => selectViewData9,
    setHoveredAddOption: () => setHoveredAddOption,
    setHoveredOption: () => setHoveredOption,
    updateSelectedValue: () => updateSelectedValue
  });
  var blacklistedProps = [
    "id",
    "class",
    "style",
    "slot",
    // Select-specific props that are handled separately
    "placeholder",
    "selectedValue",
    "onChange",
    "options",
    "noClear",
    "addOption",
    "disabled"
  ];
  var stringifyProps = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedProps.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var createInitialState9 = () => Object.freeze({
    isOpen: false,
    position: {
      x: 0,
      y: 0
    },
    selectedValue: null,
    hoveredOptionId: null,
    hoveredAddOption: false
  });
  var selectViewData9 = ({ state, props }) => {
    const containerAttrString = stringifyProps(props);
    const isDisabled = !!props.disabled;
    const hasControlledValue = Object.prototype.hasOwnProperty.call(props || {}, "selectedValue");
    const currentValue = hasControlledValue ? props.selectedValue : state.selectedValue;
    let displayLabel = props.placeholder || "Select an option";
    let isPlaceholderLabel = true;
    const options = props.options || [];
    const selectedOption = options.find((opt) => deepEqual(opt.value, currentValue));
    if (selectedOption) {
      displayLabel = selectedOption.label;
      isPlaceholderLabel = false;
    }
    const optionsWithSelection = options.map((option, index) => {
      const isSelected = deepEqual(option.value, currentValue);
      const isHovered = state.hoveredOptionId === index;
      return {
        ...option,
        isSelected,
        bgc: isHovered ? "ac" : isSelected ? "mu" : ""
      };
    });
    return {
      containerAttrString,
      isDisabled,
      isOpen: state.isOpen,
      position: state.position,
      options: optionsWithSelection,
      selectedValue: currentValue,
      selectedLabel: displayLabel,
      selectedLabelColor: isPlaceholderLabel ? "mu-fg" : "fg",
      hasValue: currentValue !== null && currentValue !== void 0,
      showClear: !isDisabled && !props.noClear && (currentValue !== null && currentValue !== void 0),
      showAddOption: !isDisabled && !!props.addOption,
      addOptionLabel: props.addOption?.label ? `+ ${props.addOption.label}` : "+ Add",
      addOptionBgc: state.hoveredAddOption ? "ac" : ""
    };
  };
  var selectState2 = ({ state }) => {
    return state;
  };
  var selectSelectedValue = ({ state }) => {
    return state.selectedValue;
  };
  var openOptionsPopover = ({ state }, payload = {}) => {
    const { position, selectedIndex } = payload;
    state.position = position;
    state.isOpen = true;
    if (selectedIndex !== void 0 && selectedIndex !== null) {
      state.hoveredOptionId = selectedIndex;
    }
  };
  var closeOptionsPopover = ({ state }) => {
    state.isOpen = false;
  };
  var updateSelectedValue = ({ state }, payload = {}) => {
    state.selectedValue = payload.value;
    state.isOpen = false;
  };
  var resetSelection = ({ state }) => {
    state.selectedValue = void 0;
  };
  var setHoveredOption = ({ state }, payload = {}) => {
    state.hoveredOptionId = payload.optionId;
  };
  var clearHoveredOption = ({ state }) => {
    state.hoveredOptionId = null;
  };
  var clearSelectedValue = ({ state }) => {
    state.selectedValue = void 0;
  };
  var setHoveredAddOption = ({ state }, payload = {}) => {
    state.hoveredAddOption = !!payload.isHovered;
  };

  // .temp/components/select.view.js
  var select_view_default = { "refs": { "selectButton": { "eventListeners": { "click": { "handler": "handleButtonClick" } } }, "clearButton": { "eventListeners": { "click": { "handler": "handleClearClick" } } }, "popover": { "eventListeners": { "close": { "handler": "handleClickOptionsPopoverOverlay" } } }, "option*": { "eventListeners": { "click": { "handler": "handleOptionClick" }, "mouseenter": { "handler": "handleOptionMouseEnter" }, "mouseleave": { "handler": "handleOptionMouseLeave" } } }, "optionAdd": { "eventListeners": { "click": { "handler": "handleAddOptionClick" }, "mouseenter": { "handler": "handleAddOptionMouseEnter" }, "mouseleave": { "handler": "handleAddOptionMouseLeave" } } } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-button#selectButton v=ol ${containerAttrString} ?disabled=${isDisabled} data-testid="select-button"', "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h av=c ah=s w=f", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text w=1fg ta=s c=${selectedLabelColor} ellipsis", "value": { "type": 1, "path": "selectedLabel" }, "parsedKey": { "type": 2, "parts": ["rtgl-text w=1fg ta=s c=", { "type": 1, "path": "selectedLabelColor" }, " ellipsis"] } }], "fast": true }, { "type": 8, "properties": [{ "key": "$if showClear", "value": { "type": 6, "conditions": [{ "type": 1, "path": "showClear" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-svg#clearButton ml=md svg=x wh=16 c=mu-fg cur=pointer data-testid="select-clear-button"', "value": { "type": 0, "value": null } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-svg ml=md svg=chevronDown wh=16 c=mu-fg", "value": { "type": 0, "value": null } }], "fast": true }], "fast": false } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-button#selectButton v=ol ", { "type": 1, "path": "containerAttrString" }, " ?disabled=", { "type": 1, "path": "isDisabled" }, ' data-testid="select-button"'] } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-popover#popover ?open=${isOpen} x=${position.x} y=${position.y} place=rs", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view wh=300 g=xs slot=content bgc=mu br=md sv=true", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "option", "indexVar": "i", "iterable": { "type": 1, "path": "options" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#option${i} w=f ph=lg pv=md cur=pointer br=md bgc=${option.bgc} data-testid=${option.testId}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text ta=s", "value": { "type": 1, "path": "option.label" } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view#option", { "type": 1, "path": "i" }, " w=f ph=lg pv=md cur=pointer br=md bgc=", { "type": 1, "path": "option.bgc" }, " data-testid=", { "type": 1, "path": "option.testId" }] } }], "fast": true }], "fast": true } }, { "type": 8, "properties": [{ "key": "$if showAddOption", "value": { "type": 6, "conditions": [{ "type": 1, "path": "showAddOption" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f bw=xs bc=mu bwt=sm", "value": { "type": 0, "value": null } }], "fast": true }, { "type": 8, "properties": [{ "key": 'rtgl-view#optionAdd w=f ph=lg pv=md cur=pointer br=md bgc=${addOptionBgc} data-testid="select-add-option"', "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=ac", "value": { "type": 1, "path": "addOptionLabel" } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view#optionAdd w=f ph=lg pv=md cur=pointer br=md bgc=", { "type": 1, "path": "addOptionBgc" }, ' data-testid="select-add-option"'] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-popover#popover ?open=", { "type": 1, "path": "isOpen" }, " x=", { "type": 1, "path": "position.x" }, " y=", { "type": 1, "path": "position.y" }, " place=rs"] } }], "fast": false }], "fast": false } };

  // src/components/sidebar/sidebar.handlers.js
  var sidebar_handlers_exports = {};
  __export(sidebar_handlers_exports, {
    handleHeaderClick: () => handleHeaderClick,
    handleItemClick: () => handleItemClick
  });
  var handleHeaderClick = (deps2, payload) => {
    const { store, dispatchEvent } = deps2;
    const event = payload._event;
    let path;
    const header = store.selectHeader();
    if (event.currentTarget.id === "headerLabel") {
      path = header.labelPath;
    } else if (event.currentTarget.id === "headerImage") {
      path = header.image.path;
    } else if (event.currentTarget.id === "header") {
      path = header.path;
    }
    dispatchEvent(new CustomEvent("header-click", {
      detail: {
        path
      },
      bubbles: true,
      composed: true
    }));
  };
  var handleItemClick = (deps2, payload) => {
    const { store, dispatchEvent } = deps2;
    const event = payload._event;
    const id = event.currentTarget.dataset.itemId || event.currentTarget.id.slice("item".length);
    const item = store.selectItem(id);
    dispatchEvent(new CustomEvent("item-click", {
      detail: {
        item
      },
      bubbles: true,
      composed: true
    }));
  };

  // .temp/components/sidebar.schema.js
  var sidebar_schema_default = { "componentName": "rtgl-sidebar", "propsSchema": { "type": "object", "properties": { "mode": { "type": "string" }, "hideHeader": { "type": "boolean", "default": false }, "w": { "type": "string" }, "bwr": { "type": "string" }, "selectedItemId": { "type": "string" }, "header": { "type": "object", "properties": { "label": { "type": "string" }, "href": { "type": "string" }, "testId": { "type": "string" }, "image": { "type": "object", "properties": { "src": { "type": "string" }, "width": { "type": "number" }, "height": { "type": "number" }, "alt": { "type": "string" } } } } }, "items": { "type": "array", "items": { "type": "object", "properties": { "title": { "type": "string" }, "slug": { "type": "string" }, "type": { "type": "string" }, "items": { "type": "array" }, "testId": { "type": "string" } } } } } }, "events": { "header-click": { "type": "object", "properties": { "path": { "type": "string" } } }, "item-click": { "type": "object", "properties": { "item": { "type": "object" } } } }, "methods": { "type": "object", "properties": {} } };

  // src/components/sidebar/sidebar.store.js
  var sidebar_store_exports = {};
  __export(sidebar_store_exports, {
    createInitialState: () => createInitialState10,
    selectActiveItem: () => selectActiveItem,
    selectHeader: () => selectHeader,
    selectItem: () => selectItem,
    selectViewData: () => selectViewData10,
    setState: () => setState2
  });
  var createInitialState10 = () => Object.freeze({});
  var blacklistedAttrs5 = ["id", "class", "style", "slot", "header", "items", "selectedItemId", "mode", "hideHeader", "w", "bwr"];
  var stringifyAttrs5 = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedAttrs5.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var parseMaybeEncodedJson2 = (value) => {
    if (value === void 0 || value === null) {
      return void 0;
    }
    if (typeof value === "object") {
      return value;
    }
    if (typeof value !== "string") {
      return void 0;
    }
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      try {
        return JSON.parse(value);
      } catch {
        return void 0;
      }
    }
  };
  var parseBooleanProp = (value) => {
    if (value === true) {
      return true;
    }
    if (value === false || value === void 0 || value === null) {
      return false;
    }
    if (typeof value === "string") {
      const normalizedValue = value.trim().toLowerCase();
      return normalizedValue === "" || normalizedValue === "true";
    }
    return false;
  };
  var resolveSidebarWidth = (value, mode) => {
    if (value !== void 0 && value !== null && value !== "") {
      return value;
    }
    return mode === "full" ? 272 : 64;
  };
  function flattenItems(items, selectedItemId = null) {
    let result = [];
    for (const item of items) {
      const itemId = item.id || item.href || item.path;
      const isSelected = selectedItemId === itemId;
      result.push({
        id: itemId,
        title: item.title,
        href: item.href,
        type: item.type || "item",
        icon: item.icon,
        hrefAttr: item.href ? `href=${item.href}` : "",
        isSelected,
        itemBgc: isSelected ? "ac" : "bg",
        itemHoverBgc: isSelected ? "ac" : "mu"
      });
      if (item.items && Array.isArray(item.items)) {
        for (const subItem of item.items) {
          const subItemId = subItem.id || subItem.href || subItem.path;
          const isSubSelected = selectedItemId === subItemId;
          result.push({
            id: subItemId,
            title: subItem.title,
            href: subItem.href,
            type: subItem.type || "item",
            icon: subItem.icon,
            hrefAttr: subItem.href ? `href=${subItem.href}` : "",
            isSelected: isSubSelected,
            itemBgc: isSubSelected ? "ac" : "bg",
            itemHoverBgc: isSubSelected ? "ac" : "mu"
          });
        }
      }
    }
    return result;
  }
  var selectViewData10 = ({ props }) => {
    const resolvedHeader = parseMaybeEncodedJson2(props.header) || props.header;
    const resolvedItems = parseMaybeEncodedJson2(props.items) || props.items;
    const selectedItemId = props.selectedItemId;
    const containerAttrString = stringifyAttrs5(props);
    const mode = props.mode || "full";
    const header = resolvedHeader || {
      label: "",
      path: "",
      image: {
        src: "",
        alt: "",
        width: 0,
        height: 0
      }
    };
    const items = resolvedItems ? flattenItems(resolvedItems, selectedItemId) : [];
    const showHeader = !parseBooleanProp(props.hideHeader);
    const rightBorderWidth = props.bwr || "xs";
    const sidebarWidth = resolveSidebarWidth(props.w, mode);
    const headerAlign = mode === "full" ? "fs" : "c";
    const itemAlign = mode === "full" ? "fs" : "c";
    const headerPadding = mode === "full" ? "lg" : "sm";
    const itemPadding = mode === "full" ? "md" : "sm";
    const itemHeight = mode === "shrunk-lg" ? 48 : 40;
    const iconSize = mode === "shrunk-lg" ? 28 : 20;
    const firstLetterSize = mode === "shrunk-lg" ? "md" : "sm";
    const showLabels = mode === "full";
    const showGroupLabels = mode === "full";
    const itemContentAlign = mode === "full" ? "fs" : "c";
    const itemAlignAttr = mode === "full" ? "" : `ah=${itemAlign}`;
    const itemWidth = mode === "full" ? "f" : itemHeight;
    const headerWidth = itemWidth;
    const ah = mode === "shrunk-lg" || mode === "shrunk-md" ? "c" : "";
    return {
      containerAttrString,
      mode,
      header,
      items,
      sidebarWidth,
      headerAlign,
      itemAlign,
      headerPadding,
      itemPadding,
      itemHeight,
      iconSize,
      firstLetterSize,
      showLabels,
      showGroupLabels,
      itemContentAlign,
      itemAlignAttr,
      itemWidth,
      headerWidth,
      selectedItemId,
      ah,
      showHeader,
      rightBorderWidth
    };
  };
  var selectHeader = ({ props }) => {
    return parseMaybeEncodedJson2(props.header) || props.header;
  };
  var selectActiveItem = ({ state, props }) => {
    const resolvedItems = parseMaybeEncodedJson2(props.items) || props.items;
    const items = resolvedItems ? flattenItems(resolvedItems) : [];
    return items.find((item) => item.active);
  };
  var selectItem = ({ props }, id) => {
    const resolvedItems = parseMaybeEncodedJson2(props.items) || props.items;
    const items = resolvedItems ? flattenItems(resolvedItems) : [];
    return items.find((item) => item.id === id);
  };
  var setState2 = ({ state }) => {
  };

  // .temp/components/sidebar.view.js
  var sidebar_view_default = { "refs": { "headerImage": { "eventListeners": { "click": { "handler": "handleHeaderClick" } } }, "headerLabel": { "eventListeners": { "click": { "handler": "handleHeaderClick" } } }, "header": { "eventListeners": { "click": { "handler": "handleHeaderClick" } } }, "item*": { "eventListeners": { "click": { "handler": "handleItemClick" } } } }, "anchors": [[{ "$if header.image && header.image.src": [{ "$if header.image.href": [{ "a href=${header.image.href}": [{ 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"': null }] }], "$elif header.image.path": [{ "rtgl-view#headerImage cur=pointer": [{ 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"': null }] }], "$else": [{ 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"': null }] }] }, { "$if header.label && showLabels": [{ "$if header.labelHref": [{ "rtgl-text href=${header.labelHref} s=lg": "${header.label}" }], "$elif header.labelPath": [{ "rtgl-view#headerLabel cur=pointer": [{ "rtgl-text s=lg": "${header.label}" }] }], "$else": [{ "rtgl-text s=lg": "${header.label}" }] }] }]], "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view h=f w=${sidebarWidth} d=v bwr=${rightBorderWidth} ah=${ah} ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if showHeader", "value": { "type": 6, "conditions": [{ "type": 1, "path": "showHeader" }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view ph=${headerPadding} pv=lg", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.href", "value": { "type": 6, "conditions": [{ "type": 1, "path": "header.href" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view href=${header.href} d=h av=c ah=${headerAlign} g=lg w=${headerWidth}", "value": { "type": 9, "items": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.image && header.image.src", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "header.image" }, "right": { "type": 1, "path": "header.image.src" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.image.href", "value": { "type": 6, "conditions": [{ "type": 1, "path": "header.image.href" }, { "type": 1, "path": "header.image.path" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "a href=${header.image.href}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "header.image.width" }, " h=", { "type": 1, "path": "header.image.height" }, " src=", { "type": 1, "path": "header.image.src" }, ' alt="', { "type": 1, "path": "header.image.alt" }, '"'] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["a href=", { "type": 1, "path": "header.image.href" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#headerImage cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "header.image.width" }, " h=", { "type": 1, "path": "header.image.height" }, " src=", { "type": 1, "path": "header.image.src" }, ' alt="', { "type": 1, "path": "header.image.alt" }, '"'] } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "header.image.width" }, " h=", { "type": 1, "path": "header.image.height" }, " src=", { "type": 1, "path": "header.image.src" }, ' alt="', { "type": 1, "path": "header.image.alt" }, '"'] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if header.label && showLabels", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "header.label" }, "right": { "type": 1, "path": "showLabels" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.labelHref", "value": { "type": 6, "conditions": [{ "type": 1, "path": "header.labelHref" }, { "type": 1, "path": "header.labelPath" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text href=${header.labelHref} s=lg", "value": { "type": 1, "path": "header.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text href=", { "type": 1, "path": "header.labelHref" }, " s=lg"] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#headerLabel cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "header.label" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "header.label" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view href=", { "type": 1, "path": "header.href" }, " d=h av=c ah=", { "type": 1, "path": "headerAlign" }, " g=lg w=", { "type": 1, "path": "headerWidth" }] } }], "fast": false }], "fast": false }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#header d=h av=c ah=${headerAlign} g=lg w=${headerWidth} cur=pointer data-testid=${header.testId}", "value": { "type": 9, "items": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.image && header.image.src", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "header.image" }, "right": { "type": 1, "path": "header.image.src" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.image.href", "value": { "type": 6, "conditions": [{ "type": 1, "path": "header.image.href" }, { "type": 1, "path": "header.image.path" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "a href=${header.image.href}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "header.image.width" }, " h=", { "type": 1, "path": "header.image.height" }, " src=", { "type": 1, "path": "header.image.src" }, ' alt="', { "type": 1, "path": "header.image.alt" }, '"'] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["a href=", { "type": 1, "path": "header.image.href" }] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#headerImage cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "header.image.width" }, " h=", { "type": 1, "path": "header.image.height" }, " src=", { "type": 1, "path": "header.image.src" }, ' alt="', { "type": 1, "path": "header.image.alt" }, '"'] } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'rtgl-image w=${header.image.width} h=${header.image.height} src=${header.image.src} alt="${header.image.alt}"', "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-image w=", { "type": 1, "path": "header.image.width" }, " h=", { "type": 1, "path": "header.image.height" }, " src=", { "type": 1, "path": "header.image.src" }, ' alt="', { "type": 1, "path": "header.image.alt" }, '"'] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "$if header.label && showLabels", "value": { "type": 6, "conditions": [{ "type": 4, "op": 6, "left": { "type": 1, "path": "header.label" }, "right": { "type": 1, "path": "showLabels" } }], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if header.labelHref", "value": { "type": 6, "conditions": [{ "type": 1, "path": "header.labelHref" }, { "type": 1, "path": "header.labelPath" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text href=${header.labelHref} s=lg", "value": { "type": 1, "path": "header.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text href=", { "type": 1, "path": "header.labelHref" }, " s=lg"] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#headerLabel cur=pointer", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "header.label" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=lg", "value": { "type": 1, "path": "header.label" } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view#header d=h av=c ah=", { "type": 1, "path": "headerAlign" }, " g=lg w=", { "type": 1, "path": "headerWidth" }, " cur=pointer data-testid=", { "type": 1, "path": "header.testId" }] } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view ph=", { "type": 1, "path": "headerPadding" }, " pv=lg"] } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }, { "type": 8, "properties": [{ "key": "rtgl-view w=f h=1fg sv ph=${headerPadding} pb=lg g=xs ah=${ah}", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "item", "indexVar": "i", "iterable": { "type": 1, "path": "items" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": '$if item.type == "groupLabel"', "value": { "type": 6, "conditions": [{ "type": 4, "op": 0, "left": { "type": 1, "path": "item.type" }, "right": { "type": 0, "value": "groupLabel" } }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if showGroupLabels", "value": { "type": 6, "conditions": [{ "type": 1, "path": "showGroupLabels" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view mt=md h=32 av=c ph=md", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=xs c=mu-fg", "value": { "type": 1, "path": "item.title" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view mt=md h=1 bgc=mu", "value": { "type": 0, "value": null } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#item${i} data-item-id=${item.id} ${item.hrefAttr} h=${itemHeight} av=c ${itemAlignAttr} ph=${itemPadding} w=${itemWidth} h-bgc=${item.itemHoverBgc} br=lg bgc=${item.itemBgc} cur=pointer data-testid=${item.testId}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if item.icon", "value": { "type": 6, "conditions": [{ "type": 1, "path": "item.icon" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if showLabels", "value": { "type": 6, "conditions": [{ "type": 1, "path": "showLabels" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h ah=${itemContentAlign} g=sm", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-svg wh=16 svg=${item.icon} c=fg", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg wh=16 svg=", { "type": 1, "path": "item.icon" }, " c=fg"] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-text s=sm", "value": { "type": 1, "path": "item.title" } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view d=h ah=", { "type": 1, "path": "itemContentAlign" }, " g=sm"] } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-svg wh=${iconSize} svg=${item.icon} c=fg", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-svg wh=", { "type": 1, "path": "iconSize" }, " svg=", { "type": 1, "path": "item.icon" }, " c=fg"] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if showLabels", "value": { "type": 6, "conditions": [{ "type": 1, "path": "showLabels" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm", "value": { "type": 1, "path": "item.title" } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view wh=${iconSize} br=f bgc=mu av=c ah=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=${firstLetterSize} c=fg", "value": { "type": 1, "path": "item.title.charAt(0).toUpperCase()" }, "parsedKey": { "type": 2, "parts": ["rtgl-text s=", { "type": 1, "path": "firstLetterSize" }, " c=fg"] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view wh=", { "type": 1, "path": "iconSize" }, " br=f bgc=mu av=c ah=c"] } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view#item", { "type": 1, "path": "i" }, " data-item-id=", { "type": 1, "path": "item.id" }, " ", { "type": 1, "path": "item.hrefAttr" }, " h=", { "type": 1, "path": "itemHeight" }, " av=c ", { "type": 1, "path": "itemAlignAttr" }, " ph=", { "type": 1, "path": "itemPadding" }, " w=", { "type": 1, "path": "itemWidth" }, " h-bgc=", { "type": 1, "path": "item.itemHoverBgc" }, " br=lg bgc=", { "type": 1, "path": "item.itemBgc" }, " cur=pointer data-testid=", { "type": 1, "path": "item.testId" }] } }], "fast": false }], "fast": false }], "id": null } }], "fast": false }], "fast": false } }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view w=f h=1fg sv ph=", { "type": 1, "path": "headerPadding" }, " pb=lg g=xs ah=", { "type": 1, "path": "ah" }] } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view h=f w=", { "type": 1, "path": "sidebarWidth" }, " d=v bwr=", { "type": 1, "path": "rightBorderWidth" }, " ah=", { "type": 1, "path": "ah" }, " ", { "type": 1, "path": "containerAttrString" }] } }], "fast": false }], "fast": false } };

  // src/components/sliderInput/sliderInput.handlers.js
  var sliderInput_handlers_exports = {};
  __export(sliderInput_handlers_exports, {
    handleBeforeMount: () => handleBeforeMount5,
    handleOnUpdate: () => handleOnUpdate4,
    handleValueChange: () => handleValueChange2,
    handleValueInput: () => handleValueInput2
  });
  var handleBeforeMount5 = (deps2) => {
    const { store, props } = deps2;
    store.setValue({ value: props.value ?? 0 });
  };
  var handleOnUpdate4 = (deps2, payload) => {
    const { oldProps, newProps } = payload;
    const { store, render: render3 } = deps2;
    const keyChanged = oldProps?.key !== newProps?.key;
    const valueChanged = oldProps?.value !== newProps?.value;
    if (keyChanged || valueChanged) {
      const value = newProps?.value ?? 0;
      store.setValue({ value });
      render3();
    }
  };
  var handleValueChange2 = (deps2, payload) => {
    const { store, render: render3, dispatchEvent } = deps2;
    const event = payload._event;
    const newValue = Number(event.detail.value);
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const host = path.find((node) => node?.tagName === "RTGL-SLIDER-INPUT") || event.currentTarget?.getRootNode?.()?.host;
    store.setValue({ value: newValue });
    if (host && typeof host.setAttribute === "function") {
      host.setAttribute("value", String(newValue));
    }
    render3();
    dispatchEvent(
      new CustomEvent("value-change", {
        detail: {
          value: newValue
        },
        bubbles: true
      })
    );
  };
  var handleValueInput2 = (deps2, payload) => {
    const { store, render: render3, dispatchEvent } = deps2;
    const event = payload._event;
    const newValue = Number(event.detail.value);
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const host = path.find((node) => node?.tagName === "RTGL-SLIDER-INPUT") || event.currentTarget?.getRootNode?.()?.host;
    store.setValue({ value: newValue });
    if (host && typeof host.setAttribute === "function") {
      host.setAttribute("value", String(newValue));
    }
    render3();
    dispatchEvent(
      new CustomEvent("value-input", {
        detail: {
          value: newValue
        },
        bubbles: true
      })
    );
  };

  // .temp/components/sliderInput.schema.js
  var sliderInput_schema_default = { "componentName": "rtgl-slider-input", "propsSchema": { "type": "object", "properties": { "key": { "type": "string" }, "value": { "type": "string", "default": "0" }, "w": { "type": "string", "default": "" }, "min": { "type": "string", "default": "0" }, "max": { "type": "string", "default": "100" }, "step": { "type": "string", "default": "1" }, "disabled": { "type": "boolean", "default": false } } }, "events": { "value-input": {}, "value-change": {} }, "methods": { "type": "object", "properties": {} } };

  // src/components/sliderInput/sliderInput.store.js
  var sliderInput_store_exports = {};
  __export(sliderInput_store_exports, {
    createInitialState: () => createInitialState11,
    selectViewData: () => selectViewData11,
    setValue: () => setValue2
  });
  var createInitialState11 = () => Object.freeze({
    value: 0
  });
  var selectViewData11 = ({ state, props }) => {
    return {
      key: props.key,
      value: state.value,
      w: props.w || "",
      min: props.min || 0,
      max: props.max || 100,
      step: props.step || 1,
      disabled: Boolean(props.disabled)
    };
  };
  var setValue2 = ({ state }, payload = {}) => {
    state.value = payload.value;
  };

  // .temp/components/sliderInput.view.js
  var sliderInput_view_default = { "refs": { "input": { "eventListeners": { "value-input": { "handler": "handleValueInput" }, "value-change": { "handler": "handleValueChange" } } }, "slider": { "eventListeners": { "value-change": { "handler": "handleValueChange" }, "value-input": { "handler": "handleValueInput" } } } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h av=c g=md w=${w}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-slider#slider key=${key} w=f type=range min=${min} max=${max} step=${step} value=${value} ?disabled=${disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-slider#slider key=", { "type": 1, "path": "key" }, " w=f type=range min=", { "type": 1, "path": "min" }, " max=", { "type": 1, "path": "max" }, " step=", { "type": 1, "path": "step" }, " value=", { "type": 1, "path": "value" }, " ?disabled=", { "type": 1, "path": "disabled" }] } }], "fast": true }, { "type": 8, "properties": [{ "key": "rtgl-view w=84", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-input-number#input key=${key} w=f min=${min} max=${max} step=${step} value=${value} ?disabled=${disabled}", "value": { "type": 0, "value": null }, "parsedKey": { "type": 2, "parts": ["rtgl-input-number#input key=", { "type": 1, "path": "key" }, " w=f min=", { "type": 1, "path": "min" }, " max=", { "type": 1, "path": "max" }, " step=", { "type": 1, "path": "step" }, " value=", { "type": 1, "path": "value" }, " ?disabled=", { "type": 1, "path": "disabled" }] } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view d=h av=c g=md w=", { "type": 1, "path": "w" }] } }], "fast": true }], "fast": true } };

  // src/components/table/table.handlers.js
  var table_handlers_exports = {};
  __export(table_handlers_exports, {
    handleBeforeMount: () => handleBeforeMount6,
    handleHeaderClick: () => handleHeaderClick2,
    handleRowClick: () => handleRowClick
  });
  var handleBeforeMount6 = (deps2) => {
  };
  var handleRowClick = (deps2, payload) => {
    const { dispatchEvent, props } = deps2;
    const event = payload._event;
    const rowIndex = parseInt(event.currentTarget.id.slice("row".length), 10);
    const rowData = props.data?.rows?.[rowIndex];
    if (rowData) {
      dispatchEvent(
        new CustomEvent("row-click", {
          detail: {
            rowIndex,
            rowData
          }
        })
      );
    }
  };
  var handleHeaderClick2 = (deps2, payload) => {
    const { store, render: render3, dispatchEvent } = deps2;
    const event = payload._event;
    const columnKey = event.currentTarget.dataset.columnKey;
    const currentSort = store.selectSortInfo();
    let newDirection = "asc";
    if (currentSort.column === columnKey) {
      if (currentSort.direction === "asc") {
        newDirection = "desc";
      } else if (currentSort.direction === "desc") {
        newDirection = null;
      }
    }
    if (newDirection) {
      store.setSortColumn({ column: columnKey, direction: newDirection });
    } else {
      store.clearSort();
    }
    render3();
    dispatchEvent(
      new CustomEvent("header-click", {
        detail: {
          column: columnKey,
          direction: newDirection,
          sortInfo: newDirection ? { column: columnKey, direction: newDirection } : null
        }
      })
    );
  };

  // .temp/components/table.schema.js
  var table_schema_default = { "componentName": "rtgl-table", "propsSchema": { "type": "object", "properties": { "data": { "type": "object", "properties": { "columns": { "type": "array", "items": { "type": "object", "properties": { "key": { "type": "string" }, "label": { "type": "string" } } } }, "rows": { "type": "array", "items": { "type": "object" } } } }, "responsive": { "type": "boolean", "default": true } } }, "events": {}, "methods": { "type": "object", "properties": {} } };

  // src/components/table/table.store.js
  var table_store_exports = {};
  __export(table_store_exports, {
    clearSort: () => clearSort,
    createInitialState: () => createInitialState12,
    selectSortInfo: () => selectSortInfo,
    selectState: () => selectState3,
    selectViewData: () => selectViewData12,
    setSortColumn: () => setSortColumn
  });
  var createInitialState12 = () => Object.freeze({
    sortColumn: null,
    sortDirection: null
  });
  var blacklistedAttrs6 = ["id", "class", "style", "slot", "data"];
  var stringifyAttrs6 = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedAttrs6.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var getNestedValue = (obj, path) => {
    const keys = path.split(".");
    let result = obj;
    for (const key of keys) {
      if (result === null || result === void 0) {
        return null;
      }
      result = result[key];
    }
    return result;
  };
  var selectViewData12 = ({ state, props }) => {
    const containerAttrString = stringifyAttrs6(props);
    const data = props.data || { columns: [], rows: [] };
    const transformedRows = data.rows.map((row, rowIndex) => {
      const cells = data.columns.map((column) => {
        const value = getNestedValue(row, column.key);
        return {
          key: column.key,
          value: value !== null && value !== void 0 ? String(value) : ""
        };
      });
      return {
        index: rowIndex,
        cells
      };
    });
    return {
      containerAttrString,
      columns: data.columns || [],
      rows: transformedRows || []
    };
  };
  var selectState3 = ({ state }) => {
    return state;
  };
  var selectSortInfo = ({ state }) => {
    return {
      column: state.sortColumn,
      direction: state.sortDirection
    };
  };
  var setSortColumn = ({ state }, { column, direction } = {}) => {
    state.sortColumn = column;
    state.sortDirection = direction;
  };
  var clearSort = ({ state }) => {
    state.sortColumn = null;
    state.sortDirection = null;
  };

  // .temp/components/table.view.js
  var table_view_default = { "refs": { "row*": { "eventListeners": { "click": { "handler": "handleRowClick" } } }, "header*": { "eventListeners": { "click": { "handler": "handleHeaderClick" } } } }, "styles": { "table": { "width": "100%", "border-collapse": "collapse", "border-spacing": 0 }, "thead": { "border-bottom": "2px solid var(--border)" }, "th": { "padding": "12px", "text-align": "left", "font-weight": 500, "color": "var(--foreground)", "background-color": "var(--muted)", "cursor": "pointer", "position": "sticky", "top": 0, "z-index": 1 }, "tbody tr": { "border-bottom": "1px solid var(--border)" }, "tbody tr:last-child": { "border-bottom": "none" }, "td": { "padding": "12px", "color": "var(--foreground)" }, ".table-container": { "width": "100%", "height": "100%", "overflow": "auto" }, ".empty-state": { "text-align": "center", "padding": "24px", "color": "var(--muted-foreground)" } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view.table-container ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if rows.length > 0", "value": { "type": 6, "conditions": [{ "type": 4, "op": 2, "left": { "type": 1, "path": "rows.length" }, "right": { "type": 0, "value": 0 } }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "table", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "thead", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "tr", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "column", "indexVar": "i", "iterable": { "type": 1, "path": "columns" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "th#header${i} data-column-key=${column.key}", "value": { "type": 1, "path": "column.label" }, "parsedKey": { "type": 2, "parts": ["th#header", { "type": 1, "path": "i" }, " data-column-key=", { "type": 1, "path": "column.key" }] } }], "fast": true }], "fast": true } }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }, { "type": 8, "properties": [{ "key": "tbody", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "row", "indexVar": "rowIndex", "iterable": { "type": 1, "path": "rows" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "tr#row${rowIndex}", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "cell", "indexVar": "cellIndex", "iterable": { "type": 1, "path": "row.cells" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "td", "value": { "type": 1, "path": "cell.value" } }], "fast": true }], "fast": true } }], "fast": false }, "parsedKey": { "type": 2, "parts": ["tr#row", { "type": 1, "path": "rowIndex" }] } }], "fast": false }], "fast": false } }], "fast": false } }], "fast": false }], "fast": false } }], "fast": false }], "fast": false }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view.empty-state w=f p=xl", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=mu-fg", "value": { "type": 0, "value": "No data available" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view.table-container ", { "type": 1, "path": "containerAttrString" }] } }], "fast": false }], "fast": false } };

  // src/components/tabs/tabs.handlers.js
  var tabs_handlers_exports = {};
  __export(tabs_handlers_exports, {
    handleClickItem: () => handleClickItem2
  });
  var handleClickItem2 = (deps2, payload) => {
    const { dispatchEvent } = deps2;
    const event = payload._event;
    const id = event.currentTarget.dataset.id;
    dispatchEvent(new CustomEvent("item-click", {
      detail: {
        id
      }
    }));
  };

  // .temp/components/tabs.schema.js
  var tabs_schema_default = { "componentName": "rtgl-tabs", "propsSchema": { "type": "object", "properties": { "items": { "type": "array", "items": { "type": "object", "properties": { "label": { "type": "string" }, "id": { "type": "string" }, "testId": { "type": "string" } } } }, "selectedTab": { "type": "string" } } }, "events": { "item-click": { "type": "object", "properties": { "id": { "type": "string" } } } }, "methods": { "type": "object", "properties": {} } };

  // src/components/tabs/tabs.store.js
  var tabs_store_exports = {};
  __export(tabs_store_exports, {
    createInitialState: () => createInitialState13,
    selectViewData: () => selectViewData13
  });
  var createInitialState13 = () => Object.freeze({});
  var blacklistedProps2 = ["id", "class", "style", "slot", "items", "selectedTab"];
  var stringifyProps2 = (props = {}) => {
    return Object.entries(props).filter(([key]) => !blacklistedProps2.includes(key)).map(([key, value]) => `${key}=${value}`).join(" ");
  };
  var selectViewData13 = ({ props }) => {
    const containerAttrString = stringifyProps2(props);
    const items = props.items || [];
    const selectedTab = props.selectedTab;
    const itemsWithSelection = items.map((item) => ({
      ...item,
      isSelected: item.id === selectedTab,
      bgColor: item.id === selectedTab ? "ac" : "",
      borderColor: item.id === selectedTab ? "" : "tr",
      textColor: item.id === selectedTab ? "" : "mu-fg"
    }));
    return {
      containerAttrString,
      items: itemsWithSelection,
      selectedTab
    };
  };

  // .temp/components/tabs.view.js
  var tabs_view_default = { "refs": { "tab*": { "eventListeners": { "click": { "handler": "handleClickItem" } } } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view d=h g=sm bgc=mu p=sm br=lg ${containerAttrString}", "value": { "type": 9, "items": [{ "type": 7, "itemVar": "item", "indexVar": "i", "iterable": { "type": 1, "path": "items" }, "body": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view#tab${i} data-id=${item.id} cur=pointer bgc=${item.bgColor} bw=xs bc=${item.borderColor} pv=md ph=lg br=lg data-testid=${item.testId}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text s=sm c=${item.textColor}", "value": { "type": 1, "path": "item.label" }, "parsedKey": { "type": 2, "parts": ["rtgl-text s=sm c=", { "type": 1, "path": "item.textColor" }] } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-view#tab", { "type": 1, "path": "i" }, " data-id=", { "type": 1, "path": "item.id" }, " cur=pointer bgc=", { "type": 1, "path": "item.bgColor" }, " bw=xs bc=", { "type": 1, "path": "item.borderColor" }, " pv=md ph=lg br=lg data-testid=", { "type": 1, "path": "item.testId" }] } }], "fast": true }], "fast": true } }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view d=h g=sm bgc=mu p=sm br=lg ", { "type": 1, "path": "containerAttrString" }] } }], "fast": false }], "fast": false } };

  // src/components/tooltip/tooltip.handlers.js
  var tooltip_handlers_exports = {};

  // .temp/components/tooltip.schema.js
  var tooltip_schema_default = { "componentName": "rtgl-tooltip", "propsSchema": { "type": "object", "properties": { "open": { "type": "boolean" }, "x": { "type": "string" }, "y": { "type": "string" }, "place": { "type": "string" }, "content": { "type": "string" } } }, "events": [], "methods": { "type": "object", "properties": {} } };

  // src/components/tooltip/tooltip.store.js
  var tooltip_store_exports = {};
  __export(tooltip_store_exports, {
    createInitialState: () => createInitialState14,
    selectViewData: () => selectViewData14
  });
  var createInitialState14 = () => Object.freeze({});
  var selectViewData14 = ({ props }) => {
    return {
      open: !!props.open,
      x: props.x || 0,
      y: props.y || 0,
      place: props.place || "t",
      content: props.content || ""
    };
  };

  // .temp/components/tooltip.view.js
  var tooltip_view_default = { "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-popover#popover ?open=${open} x=${x} y=${y} place=${place} no-overlay", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view slot=content bgc=bg bc=bo br=md p=sm ah=c av=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text ta=c s=sm c=fg", "value": { "type": 1, "path": "content" } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, "parsedKey": { "type": 2, "parts": ["rtgl-popover#popover ?open=", { "type": 1, "path": "open" }, " x=", { "type": 1, "path": "x" }, " y=", { "type": 1, "path": "y" }, " place=", { "type": 1, "path": "place" }, " no-overlay"] } }], "fast": true }], "fast": true }, "refs": {} };

  // src/components/waveform/waveform.handlers.js
  var waveform_handlers_exports = {};
  __export(waveform_handlers_exports, {
    handleAfterMount: () => handleAfterMount2,
    handleOnUpdate: () => handleOnUpdate5
  });
  var handleAfterMount2 = async (deps2) => {
    const { props, store, render: render3, refs } = deps2;
    const { waveformData } = props;
    store.setWaveformData({ data: waveformData });
    render3();
    const canvas = refs.canvas;
    if (canvas) {
      renderWaveform(waveformData, canvas);
    }
  };
  var handleOnUpdate5 = async (deps2, payload) => {
    const { store, render: render3, refs, props } = deps2;
    const { waveformData } = props;
    if (!waveformData) {
      console.log("waveform handleOnUpdate: no waveformData provided");
      return;
    }
    store.setWaveformData({ data: waveformData });
    render3();
    const canvas = refs.canvas;
    if (canvas) {
      renderWaveform(waveformData, canvas);
    }
  };
  async function renderWaveform(waveformData, canvas) {
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);
    if (!waveformData || !waveformData.amplitudes) {
      return;
    }
    const amplitudes = waveformData.amplitudes;
    const centerY = height / 2;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#404040");
    gradient.addColorStop(0.5, "#A1A1A1");
    gradient.addColorStop(1, "#404040");
    const barWidth = Math.max(1, width / amplitudes.length);
    const barSpacing = 0.2;
    for (let i = 0; i < amplitudes.length; i++) {
      const amplitude = amplitudes[i];
      const barHeight = amplitude / 255 * (height * 0.85);
      const x = i * barWidth;
      const y = centerY - barHeight / 2;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, Math.max(1, barWidth * (1 - barSpacing)), barHeight);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#2196F3";
  }

  // .temp/components/waveform.schema.js
  var waveform_schema_default = { "componentName": "rtgl-waveform", "propsSchema": { "type": "object", "properties": { "w": { "type": "string", "description": "Width of the waveform visualizer", "default": "250" }, "h": { "type": "string", "description": "Height of the waveform visualizer", "default": "150" }, "cur": { "type": "string", "description": "cursor" }, "waveformData": { "type": "object", "description": "File ID of the waveform data in object storage" }, "isLoading": { "type": "boolean", "description": "Whether the waveform data is currently being loaded" } } }, "events": [], "methods": { "type": "object", "properties": {} } };

  // src/components/waveform/waveform.store.js
  var waveform_store_exports = {};
  __export(waveform_store_exports, {
    createInitialState: () => createInitialState15,
    selectViewData: () => selectViewData15,
    setWaveformData: () => setWaveformData
  });
  var createInitialState15 = () => Object.freeze({
    waveformData: null
  });
  var setWaveformData = ({ state }, payload = {}) => {
    state.waveformData = payload.data;
  };
  var selectViewData15 = ({ state, props }) => {
    return {
      isLoading: props.isLoading,
      w: props.w || "250",
      h: props.h || "150",
      cur: props.cur,
      waveformData: props.waveformData
    };
  };

  // .temp/components/waveform.view.js
  var waveform_view_default = { "refs": { "canvas": { "selector": "canvas" } }, "template": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view pos=rel w=${w} h=${h} cur=${cur}", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "$if isLoading", "value": { "type": 6, "conditions": [{ "type": 1, "path": "isLoading" }, null], "bodies": [{ "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-view w=f h=f av=c ah=c", "value": { "type": 9, "items": [{ "type": 8, "properties": [{ "key": "rtgl-text c=mu-fg", "value": { "type": 0, "value": "..." } }], "fast": true }], "fast": true } }], "fast": true }], "fast": true }, { "type": 9, "items": [{ "type": 8, "properties": [{ "key": 'canvas#canvas style="width:100%; height:100%;"', "value": { "type": 0, "value": null } }], "fast": true }], "fast": true }], "id": null } }], "fast": false }], "fast": false }, "parsedKey": { "type": 2, "parts": ["rtgl-view pos=rel w=", { "type": 1, "path": "w" }, " h=", { "type": 1, "path": "h" }, " cur=", { "type": 1, "path": "cur" }] } }], "fast": false }], "fast": false } };

  // ../rettangoli-fe/src/core/runtime/props.js
  var toKebabCase = (value) => {
    return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  };
  var toCamelCase = (value) => {
    return value.replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
  };
  var normalizeAttributeValue = (value) => {
    if (value === null || value === void 0) {
      return void 0;
    }
    return value === "" ? true : value;
  };
  var readPropFallbackFromAttributes = (source, propName) => {
    const directAttrValue = source.getAttribute(propName);
    if (directAttrValue !== null) {
      return normalizeAttributeValue(directAttrValue);
    }
    const kebabPropName = toKebabCase(propName);
    if (kebabPropName !== propName) {
      const kebabAttrValue = source.getAttribute(kebabPropName);
      if (kebabAttrValue !== null) {
        return normalizeAttributeValue(kebabAttrValue);
      }
    }
    return void 0;
  };
  var createPropsProxy = (source, allowedKeys) => {
    const allowed = new Set(allowedKeys);
    return new Proxy(
      {},
      {
        get(_, prop) {
          if (typeof prop === "string" && allowed.has(prop)) {
            const propValue = source[prop];
            if (propValue !== void 0) {
              return propValue;
            }
            return readPropFallbackFromAttributes(source, prop);
          }
          return void 0;
        },
        set() {
          throw new Error("Cannot assign to read-only proxy");
        },
        defineProperty() {
          throw new Error("Cannot define properties on read-only proxy");
        },
        deleteProperty() {
          throw new Error("Cannot delete properties from read-only proxy");
        },
        has(_, prop) {
          return typeof prop === "string" && allowed.has(prop);
        },
        ownKeys() {
          return [...allowed];
        },
        getOwnPropertyDescriptor(_, prop) {
          if (typeof prop === "string" && allowed.has(prop)) {
            return {
              configurable: true,
              enumerable: true,
              get: () => {
                const propValue = source[prop];
                if (propValue !== void 0) {
                  return propValue;
                }
                return readPropFallbackFromAttributes(source, prop);
              }
            };
          }
          return void 0;
        }
      }
    );
  };

  // ../rettangoli-fe/src/core/schema/validateSchemaContract.js
  var validateSchemaContract = ({ schema, methodExports = [] }) => {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      throw new Error("componentName is required.");
    }
    if (typeof schema.componentName !== "string" || schema.componentName.trim() === "") {
      throw new Error("componentName is required.");
    }
    if (Object.prototype.hasOwnProperty.call(schema, "attrsSchema")) {
      throw new Error("attrsSchema is not supported.");
    }
    if (Object.prototype.hasOwnProperty.call(schema, "methods")) {
      const methodsSchema = schema.methods;
      if (!methodsSchema || typeof methodsSchema !== "object" || Array.isArray(methodsSchema)) {
        throw new Error("methods must be an object schema with a properties map.");
      }
      if (Object.prototype.hasOwnProperty.call(methodsSchema, "type") && methodsSchema.type !== "object") {
        throw new Error("methods.type must be 'object'.");
      }
      if (!methodsSchema.properties || typeof methodsSchema.properties !== "object" || Array.isArray(methodsSchema.properties)) {
        throw new Error("methods.properties must be an object keyed by method name.");
      }
      for (const methodName of Object.keys(methodsSchema.properties)) {
        if (!methodExports.includes(methodName)) {
          throw new Error(
            `method '${methodName}' is declared in schema but missing in .methods.js exports.`
          );
        }
      }
    }
    return true;
  };

  // ../../node_modules/jempl/src/parse/constants.js
  var NodeType2 = {
    LITERAL: 0,
    VARIABLE: 1,
    INTERPOLATION: 2,
    FUNCTION: 3,
    BINARY: 4,
    UNARY: 5,
    CONDITIONAL: 6,
    LOOP: 7,
    OBJECT: 8,
    ARRAY: 9,
    PARTIAL: 10,
    PATH_REFERENCE: 11
  };
  var BinaryOp2 = {
    EQ: 0,
    // ==
    NEQ: 1,
    // !=
    GT: 2,
    // >
    LT: 3,
    // <
    GTE: 4,
    // >=
    LTE: 5,
    // <=
    AND: 6,
    // &&
    OR: 7,
    // ||
    IN: 8,
    // in
    ADD: 10,
    // +
    SUBTRACT: 11
    // -
  };
  var UnaryOp2 = {
    NOT: 0
    // !
  };

  // ../../node_modules/jempl/src/errors.js
  var JemplParseError2 = class extends Error {
    constructor(message) {
      super(`Parse Error: ${message}`);
      this.name = "JemplParseError";
    }
  };
  var JemplRenderError2 = class extends Error {
    constructor(message) {
      super(`Render Error: ${message}`);
      this.name = "JemplRenderError";
    }
  };
  var validateConditionExpression2 = (expr) => {
    if (!expr || expr.trim() === "") {
      throw new JemplParseError2("Missing condition expression after '$if'");
    }
    if (expr.includes("===") || expr.includes("!==")) {
      const suggestion = expr.includes("===") ? "==" : "!=";
      throw new JemplParseError2(
        `Invalid comparison operator '${expr.includes("===") ? "===" : "!=="}' - did you mean '${suggestion}'? (got: '${expr}')`
      );
    }
    const incompleteOps = ["<", ">", "<=", ">=", "==", "!="];
    for (const op of incompleteOps) {
      if (expr.trim().endsWith(op)) {
        throw new JemplParseError2(
          `Incomplete comparison expression - missing right operand (got: '${expr}')`
        );
      }
    }
  };
  var validateLoopSyntax2 = (expr) => {
    if (expr.trim().endsWith(" in")) {
      throw new JemplParseError2(
        `Missing iterable expression after 'in' (got: '$for ${expr}')`
      );
    }
    if (!expr.includes(" in ")) {
      throw new JemplParseError2(
        `Invalid loop syntax - missing 'in' keyword (got: '$for ${expr}')`
      );
    }
    const [varsExpr, iterableExpr] = expr.split(" in ");
    if (!iterableExpr || iterableExpr.trim() === "") {
      throw new JemplParseError2(
        `Missing iterable expression after 'in' (got: '$for ${expr}')`
      );
    }
    if (varsExpr.includes(",")) {
      const vars = varsExpr.split(",").map((v) => v.trim());
      for (const varName of vars) {
        if (!varName) {
          throw new JemplParseError2(
            `Invalid loop variable - variable name cannot be empty (got: '$for ${expr}')`
          );
        }
      }
    } else if (!varsExpr.trim()) {
      throw new JemplParseError2(
        `Invalid loop variable - variable name cannot be empty (got: '$for ${expr}')`
      );
    }
  };
  var createIterationRenderError2 = (expr, value, isFunction = false) => {
    if (value === null) {
      return new JemplRenderError2(
        `Cannot iterate over null value at '$for ${expr}'`
      );
    }
    if (value === void 0) {
      return new JemplRenderError2(
        `Cannot iterate over undefined value at '$for ${expr}'`
      );
    }
    const type = typeof value;
    if (isFunction) {
      return new JemplRenderError2(
        `Cannot iterate over non-array value in loop '${expr}' - got ${type} instead`
      );
    }
    return new JemplRenderError2(
      `Cannot iterate over non-array value (got: ${type}) at '$for ${expr}'`
    );
  };
  var createUnknownFunctionRenderError2 = (name, availableFunctions) => {
    const available = availableFunctions && Object.keys(availableFunctions).length > 0 ? Object.keys(availableFunctions).join(", ") : "no custom functions provided";
    return new JemplRenderError2(`Unknown function '${name}' (${available})`);
  };

  // ../../node_modules/jempl/src/render.js
  var render2 = (ast, data, options = {}) => {
    let functions = {};
    let partials = {};
    if (options && typeof options === "object") {
      if (options.functions !== void 0 || options.partials !== void 0) {
        functions = options.functions || {};
        partials = options.partials || {};
      } else if (typeof options === "object") {
        functions = options;
      }
    }
    const initialScope = {};
    const result = renderNode2(ast, { functions, partials }, data, initialScope);
    if (result === void 0) {
      return {};
    }
    return result;
  };
  var renderNode2 = (node, options, data, scope) => {
    const functions = options.functions || options;
    if (node.var && !node.type) {
      return getVariableValue2(node.var, data, scope);
    }
    if (node.type === NodeType2.LITERAL) {
      return node.value;
    }
    if (node.type === NodeType2.VARIABLE) {
      return getVariableValue2(node.path, data, scope);
    }
    if (node.type === NodeType2.INTERPOLATION) {
      return renderInterpolation2(node.parts, options, data, scope);
    }
    switch (node.type) {
      case NodeType2.FUNCTION:
        return renderFunction2(node, options, data, scope);
      case NodeType2.BINARY:
        return renderBinaryOperation2(node, options, data, scope);
      case NodeType2.UNARY:
        return renderUnaryOperation2(node, options, data, scope);
      case NodeType2.CONDITIONAL:
        return renderConditional2(node, options, data, scope);
      case NodeType2.LOOP:
        return renderLoop2(node, options, data, scope);
      case NodeType2.OBJECT:
        return renderObject2(node, options, data, scope);
      case NodeType2.ARRAY:
        return renderArray2(node, options, data, scope);
      case NodeType2.PARTIAL:
        return renderPartial2(node, options, data, scope);
      case NodeType2.PATH_REFERENCE:
        return renderPathReference2(node, options, data, scope);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  };
  var pathCache2 = /* @__PURE__ */ new Map();
  var parsePathSegment2 = (segment) => {
    const accessors = [];
    let current2 = "";
    let inBracket = false;
    for (let i = 0; i < segment.length; i++) {
      const char = segment[i];
      if (char === "[") {
        if (current2) {
          accessors.push({ type: "property", value: current2 });
          current2 = "";
        }
        inBracket = true;
      } else if (char === "]") {
        if (inBracket && current2) {
          const trimmed = current2.trim();
          if (/^\d+$/.test(trimmed)) {
            accessors.push({ type: "index", value: parseInt(trimmed, 10) });
          } else if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
            const key = trimmed.slice(1, -1);
            accessors.push({ type: "property", value: key });
          } else {
            accessors.push({ type: "property", value: trimmed });
          }
          current2 = "";
        }
        inBracket = false;
      } else {
        current2 += char;
      }
    }
    if (current2) {
      accessors.push({ type: "property", value: current2 });
    }
    return accessors;
  };
  var getVariableValue2 = (path, data, scope) => {
    if (!path)
      return void 0;
    if (path in scope) {
      return scope[path];
    }
    let parsedPath = pathCache2.get(path);
    if (!parsedPath) {
      const segments = [];
      let current3 = "";
      let bracketDepth = 0;
      for (let i = 0; i < path.length; i++) {
        const char = path[i];
        if (char === "[") {
          bracketDepth++;
          current3 += char;
        } else if (char === "]") {
          bracketDepth--;
          current3 += char;
        } else if (char === "." && bracketDepth === 0) {
          if (current3) {
            segments.push(current3);
            current3 = "";
          }
        } else {
          current3 += char;
        }
      }
      if (current3) {
        segments.push(current3);
      }
      parsedPath = [];
      for (const segment of segments) {
        const accessors = parsePathSegment2(segment.trim());
        parsedPath.push(...accessors);
      }
      pathCache2.set(path, parsedPath);
    }
    let current2 = data;
    for (let i = 0; i < parsedPath.length; i++) {
      const accessor = parsedPath[i];
      if (accessor.type === "property" && accessor.value in scope) {
        current2 = scope[accessor.value];
        continue;
      }
      if (current2 == null) {
        return void 0;
      }
      if (accessor.type === "property") {
        current2 = current2[accessor.value];
      } else if (accessor.type === "index") {
        current2 = current2[accessor.value];
      }
    }
    return current2;
  };
  var renderInterpolation2 = (parts, options, data, scope) => {
    const segments = [];
    for (const part of parts) {
      if (typeof part === "string") {
        segments.push(part);
      } else {
        const value = renderNode2(part, options, data, scope);
        segments.push(value != null ? String(value) : "");
      }
    }
    return segments.join("");
  };
  var renderFunction2 = (node, options, data, scope) => {
    const functions = options.functions || options;
    const func = functions[node.name];
    if (!func) {
      throw createUnknownFunctionRenderError2(node.name, functions);
    }
    const args = node.args.map((arg) => renderNode2(arg, options, data, scope));
    return func(...args);
  };
  var evaluateCondition2 = (node, options, data, scope) => {
    if (node.var && !node.type) {
      return getVariableValue2(node.var, data, scope);
    }
    switch (node.type) {
      case NodeType2.VARIABLE:
        return getVariableValue2(node.path, data, scope);
      case NodeType2.LITERAL:
        return node.value;
      case NodeType2.BINARY:
        return renderBinaryOperation2(node, options, data, scope);
      case NodeType2.UNARY:
        return renderUnaryOperation2(node, options, data, scope);
      case NodeType2.FUNCTION:
        return renderFunction2(node, options, data, scope);
      default:
        return renderNode2(node, options, data, scope);
    }
  };
  var renderBinaryOperation2 = (node, options, data, scope) => {
    if (node.op === BinaryOp2.AND || node.op === BinaryOp2.OR) {
      const left2 = evaluateCondition2(node.left, options, data, scope);
      const right2 = evaluateCondition2(node.right, options, data, scope);
      switch (node.op) {
        case BinaryOp2.AND:
          return left2 && right2;
        case BinaryOp2.OR:
          return left2 || right2;
      }
    }
    const left = renderNode2(node.left, options, data, scope);
    const right = renderNode2(node.right, options, data, scope);
    switch (node.op) {
      case BinaryOp2.EQ:
        return left == right;
      case BinaryOp2.NEQ:
        return left != right;
      case BinaryOp2.GT:
        return left > right;
      case BinaryOp2.LT:
        return left < right;
      case BinaryOp2.GTE:
        return left >= right;
      case BinaryOp2.LTE:
        return left <= right;
      case BinaryOp2.IN:
        return Array.isArray(right) ? right.includes(left) : false;
      case BinaryOp2.ADD:
        if (typeof left !== "number" || typeof right !== "number") {
          throw new JemplRenderError2(
            `Arithmetic operations require numbers. Got ${typeof left} + ${typeof right}`
          );
        }
        return left + right;
      case BinaryOp2.SUBTRACT:
        if (typeof left !== "number" || typeof right !== "number") {
          throw new JemplRenderError2(
            `Arithmetic operations require numbers. Got ${typeof left} - ${typeof right}`
          );
        }
        return left - right;
      default:
        throw new Error(`Unknown binary operator: ${node.op}`);
    }
  };
  var renderUnaryOperation2 = (node, options, data, scope) => {
    const operand = node.op === UnaryOp2.NOT ? evaluateCondition2(node.operand, options, data, scope) : renderNode2(node.operand, options, data, scope);
    switch (node.op) {
      case UnaryOp2.NOT:
        return !operand;
      default:
        throw new Error(`Unknown unary operator: ${node.op}`);
    }
  };
  var renderConditionalUltraFast2 = (node, options, data, scope) => {
    if (node.conditions.length === 2 && node.conditions[1] === null) {
      const condition = node.conditions[0];
      if (condition.type === NodeType2.VARIABLE) {
        const conditionValue = getVariableValue2(condition.path, data, scope);
        if (conditionValue) {
          const trueBody = node.bodies[0];
          if (trueBody.type === NodeType2.OBJECT && trueBody.properties.length <= 5) {
            const result = {};
            for (const prop of trueBody.properties) {
              const key = prop.parsedKey ? renderNode2(prop.parsedKey, options, data, scope) : prop.key;
              const valueNode = prop.value;
              if (valueNode.type === NodeType2.LITERAL) {
                result[key] = valueNode.value;
              } else if (valueNode.type === NodeType2.VARIABLE) {
                result[key] = getVariableValue2(valueNode.path, data, scope);
              } else if (valueNode.type === NodeType2.INTERPOLATION) {
                const segments = [];
                for (const part of valueNode.parts) {
                  if (typeof part === "string") {
                    segments.push(part);
                  } else if (part.type === NodeType2.VARIABLE) {
                    const value = getVariableValue2(part.path, data, scope);
                    segments.push(value != null ? String(value) : "");
                  } else {
                    const value = renderNode2(part, options, data, scope);
                    segments.push(value != null ? String(value) : "");
                  }
                }
                result[key] = segments.join("");
              } else {
                result[key] = renderNode2(valueNode, options, data, scope);
              }
            }
            return result;
          }
        } else {
          const falseBody = node.bodies[1];
          if (falseBody.type === NodeType2.OBJECT && falseBody.properties.length <= 5) {
            const result = {};
            for (const prop of falseBody.properties) {
              const key = prop.parsedKey ? renderNode2(prop.parsedKey, options, data, scope) : prop.key;
              const valueNode = prop.value;
              if (valueNode.type === NodeType2.LITERAL) {
                result[key] = valueNode.value;
              } else if (valueNode.type === NodeType2.VARIABLE) {
                result[key] = getVariableValue2(valueNode.path, data, scope);
              } else if (valueNode.type === NodeType2.INTERPOLATION) {
                const segments = [];
                for (const part of valueNode.parts) {
                  if (typeof part === "string") {
                    segments.push(part);
                  } else if (part.type === NodeType2.VARIABLE) {
                    const value = getVariableValue2(part.path, data, scope);
                    segments.push(value != null ? String(value) : "");
                  } else {
                    const value = renderNode2(part, options, data, scope);
                    segments.push(value != null ? String(value) : "");
                  }
                }
                result[key] = segments.join("");
              } else {
                result[key] = renderNode2(valueNode, options, data, scope);
              }
            }
            return result;
          }
        }
      }
    }
    return null;
  };
  var renderConditional2 = (node, options, data, scope) => {
    const ultraResult = renderConditionalUltraFast2(node, options, data, scope);
    if (ultraResult !== null) {
      return ultraResult;
    }
    for (let i = 0; i < node.conditions.length; i++) {
      const condition = node.conditions[i];
      if (condition === null) {
        return renderNode2(node.bodies[i], options, data, scope);
      }
      const conditionValue = evaluateCondition2(condition, options, data, scope);
      if (conditionValue) {
        return renderNode2(node.bodies[i], options, data, scope);
      }
    }
    return EMPTY_OBJECT2;
  };
  var renderLoopConditionalUltraFast2 = (node, iterable) => {
    const body = node.body;
    const itemVar = node.itemVar;
    if (body.type === NodeType2.CONDITIONAL && body.conditions.length === 1 && body.conditions[0].type === NodeType2.VARIABLE) {
      const conditionPath = body.conditions[0].path;
      const trueBody = body.bodies[0];
      if (conditionPath.startsWith(itemVar + ".")) {
        const condProp = conditionPath.substring(itemVar.length + 1);
        if (trueBody.type === NodeType2.OBJECT && trueBody.properties.length <= 5) {
          for (const prop of trueBody.properties) {
            if (prop.parsedKey) {
              return null;
            }
          }
          const results = [];
          for (let i = 0; i < iterable.length; i++) {
            const item = iterable[i];
            if (item[condProp]) {
              const result = {};
              for (const prop of trueBody.properties) {
                const key = prop.key;
                const valueNode = prop.value;
                if (valueNode.type === NodeType2.LITERAL) {
                  result[key] = valueNode.value;
                } else if (valueNode.type === NodeType2.VARIABLE) {
                  const path = valueNode.path;
                  if (path === itemVar) {
                    result[key] = item;
                  } else if (path.startsWith(itemVar + ".")) {
                    const propName = path.substring(itemVar.length + 1);
                    result[key] = item[propName];
                  } else {
                    return null;
                  }
                } else if (valueNode.type === NodeType2.INTERPOLATION) {
                  const segments = [];
                  let canOptimize = true;
                  for (const part of valueNode.parts) {
                    if (typeof part === "string") {
                      segments.push(part);
                    } else if (part.type === NodeType2.VARIABLE) {
                      const path = part.path;
                      if (path === itemVar) {
                        segments.push(item != null ? String(item) : "");
                      } else if (path.startsWith(itemVar + ".")) {
                        const propName = path.substring(itemVar.length + 1);
                        const value = item[propName];
                        segments.push(value != null ? String(value) : "");
                      } else {
                        canOptimize = false;
                        break;
                      }
                    } else {
                      canOptimize = false;
                      break;
                    }
                  }
                  if (!canOptimize)
                    return null;
                  result[key] = segments.join("");
                } else {
                  return null;
                }
              }
              results.push(result);
            }
          }
          return results;
        }
      }
    }
    return null;
  };
  var renderLoopUltraFast2 = (node, iterable) => {
    const body = node.body;
    const itemVar = node.itemVar;
    const conditionalResult = renderLoopConditionalUltraFast2(node, iterable);
    if (conditionalResult !== null) {
      return conditionalResult;
    }
    if (body.type === NodeType2.OBJECT && body.properties.length <= 5) {
      for (const prop of body.properties) {
        if (prop.parsedKey) {
          return null;
        }
      }
      const accessors = [];
      let isUltraFastEligible = true;
      for (const prop of body.properties) {
        const key = prop.key;
        const valueNode = prop.value;
        if (valueNode.type === NodeType2.LITERAL) {
          accessors.push({ key, type: "literal", value: valueNode.value });
        } else if (valueNode.type === NodeType2.VARIABLE) {
          const path = valueNode.path;
          if (path === itemVar) {
            accessors.push({ key, type: "item" });
          } else if (path.startsWith(itemVar + ".")) {
            const propPath = path.substring(itemVar.length + 1);
            if (!propPath.includes(".") && !propPath.includes("[")) {
              accessors.push({ key, type: "prop", prop: propPath });
            } else {
              isUltraFastEligible = false;
              break;
            }
          } else {
            isUltraFastEligible = false;
            break;
          }
        } else if (valueNode.type === NodeType2.INTERPOLATION && valueNode.parts.length === 1) {
          const part = valueNode.parts[0];
          if (part.type === NodeType2.VARIABLE) {
            const path = part.path;
            if (path === itemVar) {
              accessors.push({ key, type: "item_string" });
            } else if (path.startsWith(itemVar + ".")) {
              const propPath = path.substring(itemVar.length + 1);
              if (!propPath.includes(".") && !propPath.includes("[")) {
                accessors.push({ key, type: "prop_string", prop: propPath });
              } else {
                isUltraFastEligible = false;
                break;
              }
            } else {
              isUltraFastEligible = false;
              break;
            }
          } else {
            isUltraFastEligible = false;
            break;
          }
        } else {
          isUltraFastEligible = false;
          break;
        }
      }
      if (isUltraFastEligible) {
        const results = new Array(iterable.length);
        if (accessors.length === 3 && accessors[0].type === "prop" && accessors[0].key === "id" && accessors[1].type === "prop_string" && accessors[1].key === "title" && accessors[2].type === "prop" && accessors[2].key === "completed") {
          for (let i = 0; i < iterable.length; i++) {
            const item = iterable[i];
            results[i] = {
              id: item.id,
              title: item.title != null ? String(item.title) : "",
              completed: item.completed
            };
          }
        } else {
          for (let i = 0; i < iterable.length; i++) {
            const item = iterable[i];
            const result = {};
            for (const accessor of accessors) {
              if (accessor.type === "literal") {
                result[accessor.key] = accessor.value;
              } else if (accessor.type === "item") {
                result[accessor.key] = item;
              } else if (accessor.type === "prop") {
                result[accessor.key] = item[accessor.prop];
              } else if (accessor.type === "item_string") {
                result[accessor.key] = item != null ? String(item) : "";
              } else if (accessor.type === "prop_string") {
                const value = item[accessor.prop];
                result[accessor.key] = value != null ? String(value) : "";
              }
            }
            results[i] = result;
          }
        }
        return results;
      }
    }
    return null;
  };
  var renderLoopFastPath2 = (node, options, data, scope, iterable) => {
    const results = [];
    const body = node.body;
    if (body.type === NodeType2.OBJECT && body.fast !== false) {
      const itemVar = node.itemVar;
      const indexVar = node.indexVar;
      for (let i = 0; i < iterable.length; i++) {
        const item = iterable[i];
        const result = {};
        const loopScope = {
          ...scope,
          [itemVar]: item,
          ...indexVar && { [indexVar]: i }
        };
        if (!loopScope.__paths__) {
          loopScope.__paths__ = scope.__paths__ || {};
        }
        let iterablePath = node.iterable.path || "";
        if (scope && scope.__paths__ && iterablePath) {
          const parts = iterablePath.split(".");
          const base = parts[0];
          if (base in scope.__paths__) {
            iterablePath = scope.__paths__[base];
            if (parts.length > 1) {
              iterablePath += "." + parts.slice(1).join(".");
            }
          }
        }
        loopScope.__paths__ = {
          ...loopScope.__paths__,
          [itemVar]: `${iterablePath}[${i}]`,
          ...indexVar && { [indexVar]: i }
        };
        for (const prop of body.properties) {
          const key = prop.parsedKey ? renderNode2(prop.parsedKey, options, data, loopScope) : prop.key;
          const valueNode = prop.value;
          if (valueNode.type === NodeType2.LITERAL) {
            result[key] = valueNode.value;
          } else if (valueNode.type === NodeType2.VARIABLE) {
            const path = valueNode.path;
            if (path === itemVar) {
              result[key] = item;
            } else if (path === indexVar) {
              result[key] = i;
            } else if (path.startsWith(itemVar + ".")) {
              const propName = path.substring(itemVar.length + 1);
              if (!propName.includes(".") && !propName.includes("[")) {
                result[key] = item[propName];
              } else {
                result[key] = getVariableValue2(path, data, {
                  ...scope,
                  [itemVar]: item,
                  ...indexVar && { [indexVar]: i }
                });
              }
            } else {
              result[key] = getVariableValue2(path, data, {
                ...scope,
                [itemVar]: item,
                ...indexVar && { [indexVar]: i }
              });
            }
          } else if (valueNode.type === NodeType2.INTERPOLATION) {
            const segments = [];
            for (const part of valueNode.parts) {
              if (typeof part === "string") {
                segments.push(part);
              } else if (part.type === NodeType2.VARIABLE) {
                const path = part.path;
                let value;
                if (path === itemVar) {
                  value = item;
                } else if (path === indexVar) {
                  value = i;
                } else if (path.startsWith(itemVar + ".")) {
                  const propName = path.substring(itemVar.length + 1);
                  if (!propName.includes(".") && !propName.includes("[")) {
                    value = item[propName];
                  } else {
                    value = getVariableValue2(path, data, {
                      ...scope,
                      [itemVar]: item,
                      ...indexVar && { [indexVar]: i }
                    });
                  }
                } else {
                  value = getVariableValue2(path, data, {
                    ...scope,
                    [itemVar]: item,
                    ...indexVar && { [indexVar]: i }
                  });
                }
                segments.push(value != null ? String(value) : "");
              } else {
                const newScope = {
                  ...scope,
                  [itemVar]: item,
                  ...indexVar && { [indexVar]: i }
                };
                const value = renderNode2(part, options, data, newScope);
                segments.push(value != null ? String(value) : "");
              }
            }
            result[key] = segments.join("");
          } else {
            const newScope = {
              ...scope,
              [itemVar]: item,
              ...indexVar && { [indexVar]: i }
            };
            result[key] = renderNode2(valueNode, options, data, newScope);
          }
        }
        results.push(result);
      }
      return results;
    }
    return null;
  };
  var renderConditionalTestPatternNuclear2 = (node, iterable, itemVar) => {
    const body = node.body;
    if (body.type === NodeType2.OBJECT && body.properties.length === 1 && body.properties[0].key === "$if item.visible") {
      const conditionalProp = body.properties[0];
      const conditional = conditionalProp.value;
      if (conditional.type === NodeType2.CONDITIONAL && conditional.conditions.length === 1 && conditional.conditions[0].type === NodeType2.VARIABLE && conditional.conditions[0].path === "item.visible") {
        const trueBody = conditional.bodies[0];
        if (trueBody.type === NodeType2.OBJECT && trueBody.properties.length === 2) {
          const idProp = trueBody.properties[0];
          const nestedCondProp = trueBody.properties[1];
          if (idProp.key === "id" && idProp.value.type === NodeType2.VARIABLE && idProp.value.path === "item.id" && nestedCondProp.key === "$if item.highlighted" && nestedCondProp.value.type === NodeType2.CONDITIONAL) {
            const results = [];
            for (let i = 0; i < iterable.length; i++) {
              const item = iterable[i];
              if (item.visible) {
                const result = {
                  id: item.id
                  // Direct property access, no template overhead
                };
                if (item.highlighted) {
                  result.highlight = true;
                  result.message = `This item is highlighted: ${item.name}`;
                } else {
                  result.highlight = false;
                  result.message = item.name;
                }
                results.push(result);
              }
            }
            return results;
          }
        }
      }
    }
    return null;
  };
  var renderLoop2 = (node, options, data, scope) => {
    const iterable = renderNode2(node.iterable, options, data, scope);
    if (!Array.isArray(iterable)) {
      let iterableStr;
      let isFunction = false;
      if (node.iterable.type === NodeType2.FUNCTION) {
        isFunction = true;
        const args = node.iterable.args.map((arg) => {
          if (arg.type === NodeType2.LITERAL) {
            return typeof arg.value === "string" ? `'${arg.value}'` : String(arg.value);
          } else if (arg.type === NodeType2.VARIABLE) {
            return arg.path;
          } else if (arg.type === NodeType2.FUNCTION) {
            return `${arg.name}(...)`;
          }
          return "?";
        }).join(", ");
        iterableStr = `${node.iterable.name}(${args})`;
      } else {
        iterableStr = node.iterable.path || "undefined";
      }
      const loopExpr = `${node.itemVar}${node.indexVar ? `, ${node.indexVar}` : ""} in ${iterableStr}`;
      throw createIterationRenderError2(loopExpr, iterable, isFunction);
    }
    if (!node.indexVar) {
      const nuclearResult = renderConditionalTestPatternNuclear2(
        node,
        iterable,
        node.itemVar
      );
      if (nuclearResult !== null) {
        return nuclearResult;
      }
    }
    if (!node.indexVar) {
      const ultraResult = renderLoopUltraFast2(node, iterable);
      if (ultraResult !== null) {
        return ultraResult;
      }
    }
    const fastResult = renderLoopFastPath2(node, options, data, scope, iterable);
    if (fastResult !== null) {
      return fastResult;
    }
    const results = [];
    let iterablePath = node.iterable.path || "";
    if (scope && scope.__paths__ && iterablePath) {
      const parts = iterablePath.split(".");
      const base = parts[0];
      if (base in scope.__paths__) {
        iterablePath = scope.__paths__[base];
        if (parts.length > 1) {
          iterablePath += "." + parts.slice(1).join(".");
        }
      }
    }
    let shouldPreserveArray = false;
    if (node.body.type === NodeType2.ARRAY) {
      if (node.body.items.length <= 1) {
        shouldPreserveArray = false;
      } else {
        shouldPreserveArray = node.body._shouldPreserveArray ??= node.body.items.some(
          (item) => item.type === NodeType2.OBJECT && item.properties.some(
            (prop) => prop.key.startsWith("$if ") || prop.key.startsWith("$when ")
          )
        );
      }
    }
    for (let i = 0; i < iterable.length; i++) {
      const newScope = node.indexVar ? { ...scope, [node.itemVar]: iterable[i], [node.indexVar]: i } : { ...scope, [node.itemVar]: iterable[i] };
      if (!newScope.__paths__) {
        newScope.__paths__ = scope.__paths__ || {};
      }
      newScope.__paths__ = {
        ...newScope.__paths__,
        [node.itemVar]: `${iterablePath}[${i}]`
      };
      if (node.indexVar) {
        newScope.__paths__[node.indexVar] = i;
      }
      const rendered = renderNode2(node.body, options, data, newScope);
      if (Array.isArray(rendered) && rendered.length === 1 && !shouldPreserveArray) {
        results.push(rendered[0]);
      } else {
        results.push(rendered);
      }
    }
    return results;
  };
  var renderObjectDeepUltraFast2 = (node, options, data, scope) => {
    if (node.whenCondition) {
      return null;
    }
    if (node.properties.length === 1) {
      const prop = node.properties[0];
      const key = prop.parsedKey ? renderNode2(prop.parsedKey, options, data, scope) : prop.key;
      const valueNode = prop.value;
      if (valueNode.type === NodeType2.OBJECT && valueNode.properties.length <= 10 && !valueNode.whenCondition) {
        const result = {};
        const nestedResult = {};
        let canUltraOptimize = true;
        for (const nestedProp of valueNode.properties) {
          const nestedKey = nestedProp.parsedKey ? renderNode2(nestedProp.parsedKey, options, data, scope) : nestedProp.key;
          const nestedValueNode = nestedProp.value;
          if (nestedValueNode.type === NodeType2.LITERAL) {
            nestedResult[nestedKey] = nestedValueNode.value;
          } else if (nestedValueNode.type === NodeType2.VARIABLE) {
            nestedResult[nestedKey] = getVariableValue2(
              nestedValueNode.path,
              data,
              scope
            );
          } else if (nestedValueNode.type === NodeType2.INTERPOLATION) {
            const segments = [];
            for (const part of nestedValueNode.parts) {
              if (typeof part === "string") {
                segments.push(part);
              } else if (part.type === NodeType2.VARIABLE) {
                const value = getVariableValue2(part.path, data, scope);
                segments.push(value != null ? String(value) : "");
              } else {
                canUltraOptimize = false;
                break;
              }
            }
            if (!canUltraOptimize)
              break;
            nestedResult[nestedKey] = segments.join("");
          } else if (nestedValueNode.type === NodeType2.OBJECT && nestedValueNode.properties.length <= 5) {
            const deepResult = {};
            for (const deepProp of nestedValueNode.properties) {
              const deepKey = deepProp.key;
              const deepValueNode = deepProp.value;
              if (deepValueNode.type === NodeType2.LITERAL) {
                deepResult[deepKey] = deepValueNode.value;
              } else if (deepValueNode.type === NodeType2.VARIABLE) {
                deepResult[deepKey] = getVariableValue2(
                  deepValueNode.path,
                  data,
                  scope
                );
              } else if (deepValueNode.type === NodeType2.INTERPOLATION) {
                const segments = [];
                for (const part of deepValueNode.parts) {
                  if (typeof part === "string") {
                    segments.push(part);
                  } else if (part.type === NodeType2.VARIABLE) {
                    const value = getVariableValue2(part.path, data, scope);
                    segments.push(value != null ? String(value) : "");
                  } else {
                    canUltraOptimize = false;
                    break;
                  }
                }
                if (!canUltraOptimize)
                  break;
                deepResult[deepKey] = segments.join("");
              } else {
                canUltraOptimize = false;
                break;
              }
            }
            if (!canUltraOptimize)
              break;
            nestedResult[nestedKey] = deepResult;
          } else {
            canUltraOptimize = false;
            break;
          }
        }
        if (canUltraOptimize) {
          result[key] = nestedResult;
          return result;
        }
      }
    }
    return null;
  };
  var renderObject2 = (node, options, data, scope) => {
    const functions = options.functions || options;
    if (node.whenCondition) {
      const conditionResult = evaluateCondition2(
        node.whenCondition,
        functions,
        data,
        scope
      );
      if (!conditionResult) {
        return void 0;
      }
    }
    const deepResult = renderObjectDeepUltraFast2(node, options, data, scope);
    if (deepResult !== null) {
      return deepResult;
    }
    if (node.fast) {
      const result2 = {};
      for (const prop of node.properties) {
        const key = prop.parsedKey ? renderNode2(prop.parsedKey, options, data, scope) : prop.key;
        const valueNode = prop.value;
        if (valueNode.type === NodeType2.LITERAL) {
          result2[key] = valueNode.value;
        } else if (valueNode.type === NodeType2.VARIABLE) {
          result2[key] = getVariableValue2(valueNode.path, data, scope);
        } else if (valueNode.type === NodeType2.INTERPOLATION) {
          const segments = [];
          for (const part of valueNode.parts) {
            if (typeof part === "string") {
              segments.push(part);
            } else if (part.type === NodeType2.VARIABLE) {
              const value = getVariableValue2(part.path, data, scope);
              segments.push(value != null ? String(value) : "");
            } else {
              const value = renderNode2(part, options, data, scope);
              segments.push(value != null ? String(value) : "");
            }
          }
          result2[key] = segments.join("");
        } else {
          result2[key] = renderNode2(valueNode, options, data, scope);
        }
      }
      return result2;
    }
    const result = {};
    let conditionalResult = null;
    let hasNonConditionalProperties = false;
    for (const prop of node.properties) {
      if (!prop.key.startsWith("$if ") && !prop.key.match(/^\$if\s+\w+.*:?$/) && !prop.key.startsWith("$elif") && !prop.key.startsWith("$else") && !prop.key.startsWith("$for ")) {
        hasNonConditionalProperties = true;
        break;
      }
    }
    for (const prop of node.properties) {
      if (prop.key.startsWith("$if ") || prop.key.match(/^\$if\s+\w+.*:?$/)) {
        const rendered = renderNode2(prop.value, options, data, scope);
        if (!hasNonConditionalProperties && rendered !== null && rendered !== void 0) {
          if (Array.isArray(rendered) && rendered.length === 1) {
            return rendered[0];
          }
          return rendered;
        }
        if (typeof rendered === "object" && rendered !== null && !Array.isArray(rendered)) {
          Object.assign(result, rendered);
        }
      } else if (prop.key.startsWith("$for ")) {
        if (node.properties.length === 1) {
          return renderNode2(prop.value, options, data, scope);
        }
      } else {
        const propValue = prop.value;
        if (propValue && propValue.type === NodeType2.OBJECT && propValue.properties) {
          const loopProp = propValue.properties.find(
            (p) => p.key.startsWith("$for ")
          );
          if (loopProp) {
            const loopResult = renderNode2(loopProp.value, options, data, scope);
            if (loopResult !== void 0) {
              result[prop.key] = loopResult;
            }
          } else {
            const renderedValue = renderNode2(prop.value, options, data, scope);
            if (renderedValue !== void 0) {
              result[prop.key] = renderedValue;
            }
          }
        } else {
          const renderedKey = prop.parsedKey ? renderNode2(prop.parsedKey, options, data, scope) : prop.key;
          const renderedValue = renderNode2(prop.value, options, data, scope);
          if (renderedValue !== void 0) {
            result[renderedKey] = renderedValue;
          }
        }
      }
    }
    return result;
  };
  var EMPTY_OBJECT2 = {};
  var renderArray2 = (node, options, data, scope) => {
    const results = [];
    for (const item of node.items) {
      if (item.type === NodeType2.LOOP) {
        const loopResults = renderNode2(item, options, data, scope);
        results.push(loopResults);
      } else {
        const rendered = renderNode2(item, options, data, scope);
        if (rendered !== EMPTY_OBJECT2 && rendered !== void 0) {
          results.push(rendered);
        }
      }
    }
    return results;
  };
  var renderPartial2 = (node, options, data, scope) => {
    const { name, data: partialData, whenCondition } = node;
    const partials = options.partials || {};
    const functions = options.functions || options;
    if (whenCondition) {
      const conditionResult = evaluateCondition2(
        whenCondition,
        functions,
        data,
        scope
      );
      if (!conditionResult) {
        return void 0;
      }
    }
    if (!partials[name]) {
      throw new JemplRenderError2(`Partial '${name}' is not defined`);
    }
    const partialStack = scope._partialStack || [];
    if (partialStack.includes(name)) {
      throw new JemplRenderError2(`Circular partial reference detected: ${name}`);
    }
    const partialTemplate = partials[name];
    let partialContext = data;
    let partialScope = { ...scope, _partialStack: [...partialStack, name] };
    if (scope) {
      partialContext = { ...data };
      for (const key of Object.keys(scope)) {
        if (!key.startsWith("_")) {
          partialContext[key] = scope[key];
        }
      }
    }
    if (partialData) {
      const renderedData = renderNode2(partialData, options, data, scope);
      partialContext = { ...partialContext, ...renderedData };
    }
    return renderNode2(partialTemplate, options, partialContext, partialScope);
  };
  var renderPathReference2 = (node, options, data, scope) => {
    const { path } = node;
    const parts = path.split(".");
    const base = parts[0];
    const properties = parts.slice(1);
    if (!scope || !(base in scope)) {
      throw new JemplRenderError2(
        `Path reference '#{${path}}' refers to '${base}' which is not a loop variable in the current scope`
      );
    }
    if (!scope.__paths__) {
      scope.__paths__ = {};
    }
    if (!(base in scope.__paths__)) {
      throw new JemplRenderError2(
        `Path reference '#{${path}}' cannot be resolved - path tracking may not be initialized properly`
      );
    }
    let fullPath = scope.__paths__[base];
    if (typeof fullPath === "number") {
      if (properties.length > 0) {
        throw new JemplRenderError2(
          `Path reference '#{${path}}' - cannot access properties on index variable '${base}'`
        );
      }
      return String(fullPath);
    }
    if (properties.length > 0) {
      fullPath += "." + properties.join(".");
    }
    return fullPath;
  };
  var render_default2 = render2;

  // ../../node_modules/jempl/src/parse/variables.js
  var VARIABLE_REGEX2 = /\$\{([^}]*)\}/g;
  var PATH_REFERENCE_REGEX2 = /#\{([^}]*)\}/g;
  var parseFunctionCall2 = (expr, functions = {}) => {
    const functionMatch = expr.match(/^(\w+)\((.*)\)$/);
    if (!functionMatch) {
      return { isFunction: false };
    }
    const [, name, argsStr] = functionMatch;
    const args = parseArguments2(argsStr, functions);
    return {
      isFunction: true,
      type: NodeType2.FUNCTION,
      name,
      args
    };
  };
  var parseArguments2 = (argsStr, functions = {}) => {
    if (!argsStr.trim())
      return [];
    const args = splitArguments2(argsStr);
    return args.map((arg) => parseArgument2(arg.trim(), functions));
  };
  var splitArguments2 = (argsStr) => {
    const args = [];
    let current2 = "";
    let depth = 0;
    let inQuotes = false;
    let quoteChar = "";
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      const prevChar = i > 0 ? argsStr[i - 1] : "";
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current2 += char;
      } else if (inQuotes && char === quoteChar && prevChar !== "\\") {
        inQuotes = false;
        quoteChar = "";
        current2 += char;
      } else if (!inQuotes && char === "(") {
        depth++;
        current2 += char;
      } else if (!inQuotes && char === ")") {
        depth--;
        current2 += char;
      } else if (!inQuotes && char === "," && depth === 0) {
        args.push(current2);
        current2 = "";
      } else {
        current2 += char;
      }
    }
    if (current2) {
      args.push(current2);
    }
    return args;
  };
  var parseArgument2 = (arg, functions = {}) => {
    if (arg.startsWith('"') && arg.endsWith('"') || arg.startsWith("'") && arg.endsWith("'")) {
      return { type: NodeType2.LITERAL, value: arg.slice(1, -1) };
    }
    if (/^-?\d+(\.\d+)?$/.test(arg)) {
      return { type: NodeType2.LITERAL, value: parseFloat(arg) };
    }
    if (arg === "true") {
      return { type: NodeType2.LITERAL, value: true };
    }
    if (arg === "false") {
      return { type: NodeType2.LITERAL, value: false };
    }
    if (arg === "null") {
      return { type: NodeType2.LITERAL, value: null };
    }
    const nestedFunction = parseFunctionCall2(arg, functions);
    if (nestedFunction.isFunction) {
      return {
        type: nestedFunction.type,
        name: nestedFunction.name,
        args: nestedFunction.args
      };
    }
    const trimmed = arg.trim();
    const arithmeticOps = [
      { op: " + ", type: "ADD" },
      { op: " - ", type: "SUBTRACT" }
    ];
    let lastArithMatch = -1;
    let lastArithOp = null;
    for (const { op, type } of arithmeticOps) {
      let pos = 0;
      while (pos < trimmed.length) {
        const match = findOperatorOutsideParens2(trimmed.substring(pos), op);
        if (match === -1)
          break;
        const actualPos = pos + match;
        if (actualPos > lastArithMatch) {
          lastArithMatch = actualPos;
          lastArithOp = { op, type };
        }
        pos = actualPos + op.length;
      }
    }
    if (lastArithMatch !== -1) {
      try {
        return parseConditionExpression2(trimmed, functions);
      } catch (error) {
        return { type: NodeType2.VARIABLE, path: trimmed };
      }
    }
    return { type: NodeType2.VARIABLE, path: trimmed };
  };
  var FUNCTION_CALL_REGEX2 = /^\w+\(.*\)$/;
  var INVALID_EXPR_REGEX2 = /\s[+\-*/%]\s|\|\||&&|\?\?|.*\?.*:/;
  var validateVariableExpression2 = (expr) => {
    if (!expr || expr.trim() === "" || FUNCTION_CALL_REGEX2.test(expr)) {
      return;
    }
    if (INVALID_EXPR_REGEX2.test(expr)) {
      if (expr.includes("?") && expr.includes(":")) {
        throw new JemplParseError2(
          `Complex expressions not supported in variable replacements - consider calculating the value in your data instead. Offending expression: "${expr}"`
        );
      } else if (expr.includes("||") || expr.includes("&&") || expr.includes("??")) {
        throw new JemplParseError2(
          `Logical operators not supported in variable replacements - consider calculating the value in your data instead (operators like ||, &&, ?? are not supported). Offending expression: "${expr}"`
        );
      } else {
        throw new JemplParseError2(
          `Arithmetic expressions not supported in variable replacements - consider calculating '${expr}' in your data instead (expressions with +, -, *, /, % are not supported). Offending expression: "${expr}"`
        );
      }
    }
  };
  var parsePathReference2 = (expr) => {
    const trimmed = expr.trim();
    if (FUNCTION_CALL_REGEX2.test(trimmed)) {
      throw new JemplParseError2(
        `Functions are not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    if (trimmed.includes("[")) {
      throw new JemplParseError2(
        `Array indices not supported in path references - use simple variable names or properties. Offending expression: "#{${expr}}"`
      );
    }
    if (/[+\-*/%]/.test(trimmed)) {
      throw new JemplParseError2(
        `Arithmetic expressions not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    if (/\|\||&&/.test(trimmed)) {
      throw new JemplParseError2(
        `Logical operators not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    if (trimmed.includes("?") && trimmed.includes(":")) {
      throw new JemplParseError2(
        `Complex expressions not supported in path references - path references can only refer to loop variables. Offending expression: "#{${expr}}"`
      );
    }
    return {
      type: NodeType2.PATH_REFERENCE,
      path: trimmed
    };
  };
  var parseVariable2 = (expr, functions = {}) => {
    const trimmed = expr.trim();
    validateVariableExpression2(trimmed);
    const functionNode = parseFunctionCall2(trimmed, functions);
    if (functionNode.isFunction) {
      return {
        type: functionNode.type,
        name: functionNode.name,
        args: functionNode.args
      };
    }
    if (trimmed.includes("[") && !/[\s+\-*/%|&?:]/.test(trimmed)) {
      let bracketCount = 0;
      for (const char of trimmed) {
        if (char === "[")
          bracketCount++;
        else if (char === "]")
          bracketCount--;
      }
      if (bracketCount !== 0) {
        throw new Error("Invalid array index syntax");
      }
    }
    return {
      type: NodeType2.VARIABLE,
      path: trimmed
    };
  };
  var parseStringValue2 = (str, functions = {}) => {
    let processedStr = str;
    const escapedParts = [];
    if (str.includes("\\${") || str.includes("\\#{")) {
      processedStr = str.replace(/\\\\(\$\{[^}]*\})/g, "\\DOUBLE_ESC_VAR$1");
      processedStr = processedStr.replace(
        /\\\\(#\{[^}]*\})/g,
        "\\DOUBLE_ESC_PATH$1"
      );
      processedStr = processedStr.replace(
        /\\(\$\{[^}]*\})/g,
        (match, dollarExpr) => {
          const placeholder = `__ESCAPED_${escapedParts.length}__`;
          escapedParts.push(dollarExpr);
          return placeholder;
        }
      );
      processedStr = processedStr.replace(
        /\\(#\{[^}]*\})/g,
        (match, hashExpr) => {
          const placeholder = `__ESCAPED_${escapedParts.length}__`;
          escapedParts.push(hashExpr);
          return placeholder;
        }
      );
      processedStr = processedStr.replace(/\\DOUBLE_ESC_VAR/g, "\\");
      processedStr = processedStr.replace(/\\DOUBLE_ESC_PATH/g, "\\");
    }
    const varMatches = [...processedStr.matchAll(VARIABLE_REGEX2)];
    const pathMatches = [...processedStr.matchAll(PATH_REFERENCE_REGEX2)];
    const allMatches = [
      ...varMatches.map((m) => ({ match: m, type: "variable" })),
      ...pathMatches.map((m) => ({ match: m, type: "pathref" }))
    ].sort((a, b) => a.match.index - b.match.index);
    if (allMatches.length === 0) {
      let finalValue = processedStr;
      for (let i = 0; i < escapedParts.length; i++) {
        finalValue = finalValue.replace(`__ESCAPED_${i}__`, escapedParts[i]);
      }
      return {
        type: NodeType2.LITERAL,
        value: finalValue
      };
    }
    if (allMatches.length === 1 && allMatches[0].match[0] === processedStr && escapedParts.length === 0) {
      const { match, type } = allMatches[0];
      try {
        if (type === "variable") {
          return parseVariable2(match[1], functions);
        } else {
          return parsePathReference2(match[1]);
        }
      } catch (e) {
        if (e.message === "Invalid array index syntax") {
          return {
            type: NodeType2.LITERAL,
            value: processedStr
          };
        }
        throw e;
      }
    }
    const parts = [];
    let lastIndex = 0;
    for (const { match, type } of allMatches) {
      const [fullMatch, expr] = match;
      const index = match.index;
      if (index > lastIndex) {
        let literalPart = processedStr.substring(lastIndex, index);
        for (let i = 0; i < escapedParts.length; i++) {
          literalPart = literalPart.replace(`__ESCAPED_${i}__`, escapedParts[i]);
        }
        if (literalPart) {
          parts.push(literalPart);
        }
      }
      try {
        let parsedExpr;
        if (type === "variable") {
          parsedExpr = parseVariable2(expr.trim(), functions);
        } else {
          parsedExpr = parsePathReference2(expr.trim());
        }
        parts.push(parsedExpr);
      } catch (e) {
        if (e.message === "Invalid array index syntax") {
          parts.push(fullMatch);
        } else {
          throw e;
        }
      }
      lastIndex = index + fullMatch.length;
    }
    if (lastIndex < processedStr.length) {
      let literalPart = processedStr.substring(lastIndex);
      for (let i = 0; i < escapedParts.length; i++) {
        literalPart = literalPart.replace(`__ESCAPED_${i}__`, escapedParts[i]);
      }
      if (literalPart) {
        parts.push(literalPart);
      }
    }
    return {
      type: NodeType2.INTERPOLATION,
      parts
    };
  };

  // ../../node_modules/jempl/src/parse/utils.js
  var parseValue2 = (value, functions) => {
    if (typeof value === "string") {
      return parseStringValue2(value, functions);
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return parseArray2(value, functions);
      } else {
        return parseObject2(value, functions);
      }
    } else {
      return {
        type: NodeType2.LITERAL,
        value
      };
    }
  };
  var parseArray2 = (arr, functions) => {
    const items = [];
    let hasDynamicContent = false;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const keys = Object.keys(item);
        if (keys.length === 1 && keys[0].startsWith("$for ")) {
          const loop = parseLoop2(keys[0], item[keys[0]], functions);
          items.push(loop);
          hasDynamicContent = true;
          continue;
        }
      }
      const parsedItem = parseValue2(item, functions);
      items.push(parsedItem);
      if (parsedItem.type === NodeType2.FUNCTION || parsedItem.type === NodeType2.CONDITIONAL || parsedItem.type === NodeType2.LOOP || parsedItem.type === NodeType2.PARTIAL || parsedItem.type === NodeType2.OBJECT && !parsedItem.fast || parsedItem.type === NodeType2.ARRAY && !parsedItem.fast) {
        hasDynamicContent = true;
      }
    }
    return {
      type: NodeType2.ARRAY,
      items,
      fast: !hasDynamicContent
    };
  };
  var parseObject2 = (obj, functions) => {
    const properties = [];
    let hasDynamicContent = false;
    let whenCondition = null;
    const entries = Object.entries(obj);
    let i = 0;
    if (obj.$partial !== void 0) {
      if (typeof obj.$partial !== "string") {
        throw new JemplParseError2("$partial value must be a string");
      }
      if (obj.$partial.trim() === "") {
        throw new JemplParseError2("$partial value cannot be an empty string");
      }
      const conflictingDirectives = ["$if", "$elif", "$else", "$for"];
      const conflicts = [];
      for (const [key] of entries) {
        for (const directive of conflictingDirectives) {
          if (key === directive || key.startsWith(directive + " ") || key.startsWith(directive + "#")) {
            conflicts.push(directive);
            break;
          }
        }
      }
      if (conflicts.length > 0) {
        throw new JemplParseError2(
          `Cannot use $partial with ${conflicts.join(", ")} at the same level. Wrap $partial in a parent object if you need conditionals.`
        );
      }
      const { $partial, $when, ...rawData } = obj;
      const data = {};
      let hasData = false;
      for (const [key, value] of Object.entries(rawData)) {
        let actualKey = key;
        if (key.startsWith("\\$")) {
          actualKey = key.slice(1);
        } else if (key.startsWith("$$")) {
          actualKey = key.slice(1);
        }
        data[actualKey] = value;
        hasData = true;
      }
      let parsedData = null;
      if (hasData) {
        parsedData = parseValue2(data, functions);
        if (parsedData.type === NodeType2.OBJECT) {
          let hasDynamicData = false;
          for (const prop of parsedData.properties) {
            if (prop.value.type === NodeType2.VARIABLE || prop.value.type === NodeType2.INTERPOLATION || prop.value.type === NodeType2.FUNCTION || prop.value.type === NodeType2.CONDITIONAL || prop.value.type === NodeType2.LOOP || prop.value.type === NodeType2.OBJECT && !prop.value.fast || prop.value.type === NodeType2.ARRAY && !prop.value.fast) {
              hasDynamicData = true;
              break;
            }
          }
          if (hasDynamicData) {
            parsedData.fast = false;
          }
        }
      }
      const result2 = {
        type: NodeType2.PARTIAL,
        name: $partial,
        data: parsedData
      };
      if ($when !== void 0) {
        let whenCondition2;
        if (typeof $when === "string") {
          if ($when.trim() === "") {
            throw new JemplParseError2("Empty condition expression after '$when'");
          }
          whenCondition2 = parseConditionExpression2($when, functions);
        } else {
          whenCondition2 = {
            type: NodeType2.LITERAL,
            value: $when
          };
        }
        result2.whenCondition = whenCondition2;
      }
      return result2;
    }
    for (const [key, value] of entries) {
      if (key === "$when") {
        if (whenCondition !== null) {
          throw new JemplParseError2(
            "Multiple '$when' directives on the same object are not allowed"
          );
        }
        if (value === void 0 || value === null) {
          throw new JemplParseError2("Missing condition expression after '$when'");
        }
        const conditionStr = typeof value === "string" ? value : JSON.stringify(value);
        if (conditionStr.trim() === "") {
          throw new JemplParseError2("Empty condition expression after '$when'");
        }
        whenCondition = parseConditionExpression2(conditionStr, functions);
        hasDynamicContent = true;
      } else if (key.startsWith("$when#") || key.startsWith("$when ")) {
        throw new JemplParseError2(
          "'$when' does not support ID syntax or inline conditions - use '$when' as a property"
        );
      }
    }
    while (i < entries.length) {
      const [key, value] = entries[i];
      if (key === "$when") {
        i++;
        continue;
      }
      if (key.startsWith("$if ") || key.match(/^\$if#\w+\s/) || key.match(/^\$if\s+\w+.*:$/)) {
        const conditional = parseConditional2(entries, i, functions);
        properties.push({
          key,
          value: conditional.node
        });
        hasDynamicContent = true;
        i = conditional.nextIndex;
      } else if (key.startsWith("$for ")) {
        const loop = parseLoop2(key, value, functions);
        properties.push({
          key,
          value: loop
        });
        hasDynamicContent = true;
        i++;
      } else if (key.startsWith("$elif ") || key.startsWith("$else")) {
        throw new JemplParseError2(
          `'${key.split(" ")[0]}' without matching '$if'`
        );
      } else if (key === "$if" || key === "$if:") {
        throw new JemplParseError2("Missing condition expression after '$if'");
      } else {
        const parsedValue = parseValue2(value, functions);
        if (parsedValue.type === NodeType2.FUNCTION || parsedValue.type === NodeType2.CONDITIONAL || parsedValue.type === NodeType2.LOOP || parsedValue.type === NodeType2.PARTIAL || parsedValue.type === NodeType2.OBJECT && !parsedValue.fast || parsedValue.type === NodeType2.ARRAY && !parsedValue.fast) {
          hasDynamicContent = true;
        }
        const parsedKey = parseStringValue2(key, functions);
        const prop = { key, value: parsedValue };
        if (parsedKey.type !== NodeType2.LITERAL || parsedKey.value !== key) {
          prop.parsedKey = parsedKey;
        }
        properties.push(prop);
        i++;
      }
    }
    const result = {
      type: NodeType2.OBJECT,
      properties,
      fast: !hasDynamicContent
    };
    if (whenCondition) {
      result.whenCondition = whenCondition;
    }
    return result;
  };
  var parseConditional2 = (entries, startIndex, functions = {}) => {
    const conditions = [];
    const bodies = [];
    let currentIndex = startIndex;
    const [ifKey, ifValue] = entries[currentIndex];
    let conditionId = null;
    let conditionExpr;
    if (ifKey.startsWith("$if#")) {
      const match = ifKey.match(/^\$if#(\w+)\s+(.+)$/);
      if (match) {
        conditionId = match[1];
        conditionExpr = match[2];
      } else {
        throw new JemplParseError2(`Invalid conditional syntax: ${ifKey}`);
      }
    } else {
      conditionExpr = ifKey.substring(4);
      if (conditionExpr.endsWith(":")) {
        conditionExpr = conditionExpr.slice(0, -1).trim();
      }
    }
    validateConditionExpression2(conditionExpr);
    const ifCondition = parseConditionExpression2(conditionExpr, functions);
    conditions.push(ifCondition);
    bodies.push(parseValue2(ifValue, functions));
    currentIndex++;
    while (currentIndex < entries.length) {
      const [key, value] = entries[currentIndex];
      let isMatching = false;
      let elifConditionExpr;
      if (conditionId) {
        if (key.startsWith(`$elif#${conditionId} `)) {
          elifConditionExpr = key.substring(`$elif#${conditionId} `.length);
          if (elifConditionExpr.endsWith(":")) {
            elifConditionExpr = elifConditionExpr.slice(0, -1).trim();
          }
          isMatching = true;
        } else if (key === `$else#${conditionId}` || key === `$else#${conditionId}:`) {
          isMatching = true;
          elifConditionExpr = null;
        }
      } else {
        if (key.startsWith("$elif ")) {
          elifConditionExpr = key.substring(6);
          if (elifConditionExpr.endsWith(":")) {
            elifConditionExpr = elifConditionExpr.slice(0, -1).trim();
          }
          isMatching = true;
        } else if (key === "$else" || key === "$else:") {
          isMatching = true;
          elifConditionExpr = null;
        }
      }
      if (isMatching) {
        if (elifConditionExpr === null) {
          conditions.push(null);
        } else {
          validateConditionExpression2(elifConditionExpr);
          const elifCondition = parseConditionExpression2(
            elifConditionExpr,
            functions
          );
          conditions.push(elifCondition);
        }
        bodies.push(parseValue2(value, functions));
        currentIndex++;
        if (elifConditionExpr === null) {
          break;
        }
      } else {
        break;
      }
    }
    return {
      node: {
        type: NodeType2.CONDITIONAL,
        conditions,
        bodies,
        id: conditionId
      },
      nextIndex: currentIndex
    };
  };
  var parseConditionExpression2 = (expr, functions = {}) => {
    expr = expr.trim();
    if (expr.startsWith("(") && expr.endsWith(")")) {
      const inner = expr.slice(1, -1);
      let depth = 0;
      let valid = true;
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === "(")
          depth++;
        else if (inner[i] === ")")
          depth--;
        if (depth < 0) {
          valid = false;
          break;
        }
      }
      if (valid && depth === 0) {
        return parseConditionExpression2(inner, functions);
      }
    }
    const orMatch = findOperatorOutsideParens2(expr, "||");
    if (orMatch !== -1) {
      return {
        type: NodeType2.BINARY,
        op: BinaryOp2.OR,
        left: parseConditionExpression2(
          expr.substring(0, orMatch).trim(),
          functions
        ),
        right: parseConditionExpression2(
          expr.substring(orMatch + 2).trim(),
          functions
        )
      };
    }
    const andMatch = findOperatorOutsideParens2(expr, "&&");
    if (andMatch !== -1) {
      return {
        type: NodeType2.BINARY,
        op: BinaryOp2.AND,
        left: parseConditionExpression2(
          expr.substring(0, andMatch).trim(),
          functions
        ),
        right: parseConditionExpression2(
          expr.substring(andMatch + 2).trim(),
          functions
        )
      };
    }
    const compOps = [
      { op: ">=", type: BinaryOp2.GTE },
      { op: "<=", type: BinaryOp2.LTE },
      { op: "==", type: BinaryOp2.EQ },
      { op: "!=", type: BinaryOp2.NEQ },
      { op: ">", type: BinaryOp2.GT },
      { op: "<", type: BinaryOp2.LT },
      { op: " in ", type: BinaryOp2.IN }
    ];
    for (const { op, type } of compOps) {
      const opMatch = findOperatorOutsideParens2(expr, op);
      if (opMatch !== -1) {
        return {
          type: NodeType2.BINARY,
          op: type,
          left: parseConditionExpression2(
            expr.substring(0, opMatch).trim(),
            functions
          ),
          right: parseConditionExpression2(
            expr.substring(opMatch + op.length).trim(),
            functions
          )
        };
      }
    }
    let lastArithMatch = -1;
    let lastArithOp = null;
    const arithmeticOps = [
      { op: " + ", type: BinaryOp2.ADD },
      { op: " - ", type: BinaryOp2.SUBTRACT }
    ];
    for (const { op, type } of arithmeticOps) {
      let pos = 0;
      while (pos < expr.length) {
        const match = findOperatorOutsideParens2(expr.substring(pos), op);
        if (match === -1)
          break;
        const actualPos = pos + match;
        if (actualPos > lastArithMatch) {
          lastArithMatch = actualPos;
          lastArithOp = { op, type };
        }
        pos = actualPos + op.length;
      }
    }
    if (lastArithMatch !== -1 && lastArithOp) {
      return {
        type: NodeType2.BINARY,
        op: lastArithOp.type,
        left: parseConditionExpression2(
          expr.substring(0, lastArithMatch).trim(),
          functions
        ),
        right: parseConditionExpression2(
          expr.substring(lastArithMatch + lastArithOp.op.length).trim(),
          functions
        )
      };
    }
    const blockedArithmeticOps = [" * ", " / ", " % "];
    for (const op of blockedArithmeticOps) {
      if (findOperatorOutsideParens2(expr, op) !== -1) {
        throw new JemplParseError2(
          `Arithmetic operations are not allowed in conditionals: "${op}"`
        );
      }
    }
    if (expr.startsWith("!")) {
      return {
        type: NodeType2.UNARY,
        op: UnaryOp2.NOT,
        operand: parseConditionExpression2(expr.substring(1).trim(), functions)
      };
    }
    return parseIterableExpression2(expr, functions);
  };
  var findOperatorOutsideParens2 = (expr, operator) => {
    let parenDepth = 0;
    let i = 0;
    while (i <= expr.length - operator.length) {
      if (expr[i] === "(") {
        parenDepth++;
      } else if (expr[i] === ")") {
        parenDepth--;
      } else if (parenDepth === 0 && expr.substring(i, i + operator.length) === operator) {
        return i;
      }
      i++;
    }
    return -1;
  };
  var parseAtomicExpression2 = (expr) => {
    expr = expr.trim();
    if (expr === "true") {
      return { type: NodeType2.LITERAL, value: true };
    }
    if (expr === "false") {
      return { type: NodeType2.LITERAL, value: false };
    }
    if (expr === "null") {
      return { type: NodeType2.LITERAL, value: null };
    }
    if (expr.startsWith('"') && expr.endsWith('"') || expr.startsWith("'") && expr.endsWith("'")) {
      return { type: NodeType2.LITERAL, value: expr.slice(1, -1) };
    }
    if (expr === '""' || expr === "''") {
      return { type: NodeType2.LITERAL, value: "" };
    }
    if (expr === "{}") {
      return { type: NodeType2.LITERAL, value: {} };
    }
    if (expr === "[]") {
      return { type: NodeType2.LITERAL, value: [] };
    }
    const num = Number(expr);
    if (!isNaN(num) && isFinite(num)) {
      return { type: NodeType2.LITERAL, value: num };
    }
    return { type: NodeType2.VARIABLE, path: expr };
  };
  var parseIterableExpression2 = (expr, functions) => {
    const trimmed = expr.trim();
    const functionMatch = trimmed.match(/^(\w+)\((.*)\)$/);
    if (functionMatch) {
      return parseVariable2(trimmed, functions);
    }
    const atomicResult = parseAtomicExpression2(trimmed);
    if (atomicResult.type === NodeType2.LITERAL) {
      return atomicResult;
    }
    if (/^[a-zA-Z_$][\w.$]*$/.test(trimmed)) {
      return {
        type: NodeType2.VARIABLE,
        path: trimmed
      };
    }
    try {
      return parseVariable2(trimmed, functions);
    } catch (error) {
      if (error.message && error.message.includes("not supported")) {
        return atomicResult;
      }
      throw error;
    }
  };
  var parseLoop2 = (key, value, functions) => {
    const loopExpr = key.substring(5).trim();
    validateLoopSyntax2(loopExpr);
    const inMatch = loopExpr.match(/^(.+?)\s+in\s+(.+)$/);
    if (!inMatch) {
      throw new JemplParseError2(
        `Invalid loop syntax - missing 'in' keyword (got: '$for ${loopExpr}')`
      );
    }
    const varsExpr = inMatch[1].trim();
    const iterableExpr = inMatch[2].trim();
    let itemVar, indexVar = null;
    if (varsExpr.includes(",")) {
      const vars = varsExpr.split(",").map((v) => v.trim());
      if (vars.length !== 2) {
        throw new JemplParseError2(
          `Invalid loop variables: ${varsExpr}. Expected format: "item" or "item, index"`
        );
      }
      itemVar = vars[0];
      indexVar = vars[1];
    } else {
      itemVar = varsExpr;
    }
    const iterable = parseIterableExpression2(iterableExpr, functions);
    const body = parseValue2(value, functions);
    return {
      type: NodeType2.LOOP,
      itemVar,
      indexVar,
      iterable,
      body
    };
  };

  // ../../node_modules/jempl/src/parse/index.js
  var parse2 = (template, options = {}) => {
    const { functions = {} } = options;
    return parseValue2(template, functions);
  };
  var parse_default2 = parse2;

  // ../../node_modules/jempl/src/functions.js
  var functions_exports2 = {};
  __export(functions_exports2, {
    now: () => now2
  });
  var now2 = () => {
    return Date.now();
  };

  // ../../node_modules/jempl/src/parseAndRender.js
  var parseAndRender2 = (template, data, options = {}) => {
    const { functions = {}, partials = {} } = options;
    const allFunctions = { ...functions_exports2, ...functions };
    const ast = parse_default2(template, { functions: allFunctions });
    const parsedPartials = {};
    for (const [name, partialTemplate] of Object.entries(partials)) {
      parsedPartials[name] = parse_default2(partialTemplate, { functions: allFunctions });
    }
    return render_default2(ast, data, {
      functions: allFunctions,
      partials: parsedPartials
    });
  };
  var parseAndRender_default2 = parseAndRender2;

  // ../rettangoli-fe/src/core/runtime/payload.js
  var isObjectPayload = (value) => {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  };

  // ../rettangoli-fe/src/core/runtime/methods.js
  var bindMethods = (element, methods) => {
    if (!methods || typeof methods !== "object") {
      return;
    }
    Object.entries(methods).forEach(([methodName, methodFn]) => {
      if (methodName === "default") {
        throw new Error(
          "[Methods] Invalid method name 'default'. Use named exports in .methods.js; default export is not supported."
        );
      }
      if (typeof methodFn !== "function") {
        return;
      }
      if (methodName in element) {
        throw new Error(
          `[Methods] Cannot define method '${methodName}' because it already exists on the component instance.`
        );
      }
      Object.defineProperty(element, methodName, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: (payload = {}) => {
          const normalizedPayload = payload === void 0 ? {} : payload;
          if (!isObjectPayload(normalizedPayload)) {
            throw new Error(
              `[Methods] Method '${methodName}' expects payload to be an object.`
            );
          }
          return methodFn.call(element, normalizedPayload);
        }
      });
    });
  };

  // ../../node_modules/immer/dist/immer.mjs
  var NOTHING = Symbol.for("immer-nothing");
  var DRAFTABLE = Symbol.for("immer-draftable");
  var DRAFT_STATE = Symbol.for("immer-state");
  var errors = true ? [
    // All error codes, starting by 0:
    function(plugin) {
      return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
    },
    function(thing) {
      return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
    },
    "This object has been frozen and should not be mutated",
    function(data) {
      return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
    },
    "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
    "Immer forbids circular references",
    "The first or second argument to `produce` must be a function",
    "The third argument to `produce` must be a function or undefined",
    "First argument to `createDraft` must be a plain object, an array, or an immerable object",
    "First argument to `finishDraft` must be a draft returned by `createDraft`",
    function(thing) {
      return `'current' expects a draft, got: ${thing}`;
    },
    "Object.defineProperty() cannot be used on an Immer draft",
    "Object.setPrototypeOf() cannot be used on an Immer draft",
    "Immer only supports deleting array indices",
    "Immer only supports setting array indices and the 'length' property",
    function(thing) {
      return `'original' expects a draft, got: ${thing}`;
    }
    // Note: if more errors are added, the errorOffset in Patches.ts should be increased
    // See Patches.ts for additional errors
  ] : [];
  function die(error, ...args) {
    if (true) {
      const e = errors[error];
      const msg = typeof e === "function" ? e.apply(null, args) : e;
      throw new Error(`[Immer] ${msg}`);
    }
    throw new Error(
      `[Immer] minified error nr: ${error}. Full error at: https://bit.ly/3cXEKWf`
    );
  }
  var getPrototypeOf = Object.getPrototypeOf;
  function isDraft(value) {
    return !!value && !!value[DRAFT_STATE];
  }
  function isDraftable(value) {
    if (!value)
      return false;
    return isPlainObject2(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!value.constructor?.[DRAFTABLE] || isMap(value) || isSet(value);
  }
  var objectCtorString = Object.prototype.constructor.toString();
  function isPlainObject2(value) {
    if (!value || typeof value !== "object")
      return false;
    const proto = getPrototypeOf(value);
    if (proto === null) {
      return true;
    }
    const Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
    if (Ctor === Object)
      return true;
    return typeof Ctor == "function" && Function.toString.call(Ctor) === objectCtorString;
  }
  function each(obj, iter) {
    if (getArchtype(obj) === 0) {
      Reflect.ownKeys(obj).forEach((key) => {
        iter(key, obj[key], obj);
      });
    } else {
      obj.forEach((entry, index) => iter(index, entry, obj));
    }
  }
  function getArchtype(thing) {
    const state = thing[DRAFT_STATE];
    return state ? state.type_ : Array.isArray(thing) ? 1 : isMap(thing) ? 2 : isSet(thing) ? 3 : 0;
  }
  function has(thing, prop) {
    return getArchtype(thing) === 2 ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
  }
  function set2(thing, propOrOldValue, value) {
    const t = getArchtype(thing);
    if (t === 2)
      thing.set(propOrOldValue, value);
    else if (t === 3) {
      thing.add(value);
    } else
      thing[propOrOldValue] = value;
  }
  function is(x, y) {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    } else {
      return x !== x && y !== y;
    }
  }
  function isMap(target) {
    return target instanceof Map;
  }
  function isSet(target) {
    return target instanceof Set;
  }
  function latest(state) {
    return state.copy_ || state.base_;
  }
  function shallowCopy(base, strict) {
    if (isMap(base)) {
      return new Map(base);
    }
    if (isSet(base)) {
      return new Set(base);
    }
    if (Array.isArray(base))
      return Array.prototype.slice.call(base);
    const isPlain = isPlainObject2(base);
    if (strict === true || strict === "class_only" && !isPlain) {
      const descriptors = Object.getOwnPropertyDescriptors(base);
      delete descriptors[DRAFT_STATE];
      let keys = Reflect.ownKeys(descriptors);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const desc = descriptors[key];
        if (desc.writable === false) {
          desc.writable = true;
          desc.configurable = true;
        }
        if (desc.get || desc.set)
          descriptors[key] = {
            configurable: true,
            writable: true,
            // could live with !!desc.set as well here...
            enumerable: desc.enumerable,
            value: base[key]
          };
      }
      return Object.create(getPrototypeOf(base), descriptors);
    } else {
      const proto = getPrototypeOf(base);
      if (proto !== null && isPlain) {
        return { ...base };
      }
      const obj = Object.create(proto);
      return Object.assign(obj, base);
    }
  }
  function freeze(obj, deep = false) {
    if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj))
      return obj;
    if (getArchtype(obj) > 1) {
      obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections;
    }
    Object.freeze(obj);
    if (deep)
      Object.entries(obj).forEach(([key, value]) => freeze(value, true));
    return obj;
  }
  function dontMutateFrozenCollections() {
    die(2);
  }
  function isFrozen(obj) {
    return Object.isFrozen(obj);
  }
  var plugins = {};
  function getPlugin(pluginKey) {
    const plugin = plugins[pluginKey];
    if (!plugin) {
      die(0, pluginKey);
    }
    return plugin;
  }
  var currentScope;
  function getCurrentScope() {
    return currentScope;
  }
  function createScope(parent_, immer_) {
    return {
      drafts_: [],
      parent_,
      immer_,
      // Whenever the modified draft contains a draft from another scope, we
      // need to prevent auto-freezing so the unowned draft can be finalized.
      canAutoFreeze_: true,
      unfinalizedDrafts_: 0
    };
  }
  function usePatchesInScope(scope, patchListener) {
    if (patchListener) {
      getPlugin("Patches");
      scope.patches_ = [];
      scope.inversePatches_ = [];
      scope.patchListener_ = patchListener;
    }
  }
  function revokeScope(scope) {
    leaveScope(scope);
    scope.drafts_.forEach(revokeDraft);
    scope.drafts_ = null;
  }
  function leaveScope(scope) {
    if (scope === currentScope) {
      currentScope = scope.parent_;
    }
  }
  function enterScope(immer2) {
    return currentScope = createScope(currentScope, immer2);
  }
  function revokeDraft(draft) {
    const state = draft[DRAFT_STATE];
    if (state.type_ === 0 || state.type_ === 1)
      state.revoke_();
    else
      state.revoked_ = true;
  }
  function processResult(result, scope) {
    scope.unfinalizedDrafts_ = scope.drafts_.length;
    const baseDraft = scope.drafts_[0];
    const isReplaced = result !== void 0 && result !== baseDraft;
    if (isReplaced) {
      if (baseDraft[DRAFT_STATE].modified_) {
        revokeScope(scope);
        die(4);
      }
      if (isDraftable(result)) {
        result = finalize(scope, result);
        if (!scope.parent_)
          maybeFreeze(scope, result);
      }
      if (scope.patches_) {
        getPlugin("Patches").generateReplacementPatches_(
          baseDraft[DRAFT_STATE].base_,
          result,
          scope.patches_,
          scope.inversePatches_
        );
      }
    } else {
      result = finalize(scope, baseDraft, []);
    }
    revokeScope(scope);
    if (scope.patches_) {
      scope.patchListener_(scope.patches_, scope.inversePatches_);
    }
    return result !== NOTHING ? result : void 0;
  }
  function finalize(rootScope, value, path) {
    if (isFrozen(value))
      return value;
    const state = value[DRAFT_STATE];
    if (!state) {
      each(
        value,
        (key, childValue) => finalizeProperty(rootScope, state, value, key, childValue, path)
      );
      return value;
    }
    if (state.scope_ !== rootScope)
      return value;
    if (!state.modified_) {
      maybeFreeze(rootScope, state.base_, true);
      return state.base_;
    }
    if (!state.finalized_) {
      state.finalized_ = true;
      state.scope_.unfinalizedDrafts_--;
      const result = state.copy_;
      let resultEach = result;
      let isSet2 = false;
      if (state.type_ === 3) {
        resultEach = new Set(result);
        result.clear();
        isSet2 = true;
      }
      each(
        resultEach,
        (key, childValue) => finalizeProperty(rootScope, state, result, key, childValue, path, isSet2)
      );
      maybeFreeze(rootScope, result, false);
      if (path && rootScope.patches_) {
        getPlugin("Patches").generatePatches_(
          state,
          path,
          rootScope.patches_,
          rootScope.inversePatches_
        );
      }
    }
    return state.copy_;
  }
  function finalizeProperty(rootScope, parentState, targetObject, prop, childValue, rootPath, targetIsSet) {
    if (childValue === targetObject)
      die(5);
    if (isDraft(childValue)) {
      const path = rootPath && parentState && parentState.type_ !== 3 && // Set objects are atomic since they have no keys.
      !has(parentState.assigned_, prop) ? rootPath.concat(prop) : void 0;
      const res = finalize(rootScope, childValue, path);
      set2(targetObject, prop, res);
      if (isDraft(res)) {
        rootScope.canAutoFreeze_ = false;
      } else
        return;
    } else if (targetIsSet) {
      targetObject.add(childValue);
    }
    if (isDraftable(childValue) && !isFrozen(childValue)) {
      if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
        return;
      }
      finalize(rootScope, childValue);
      if ((!parentState || !parentState.scope_.parent_) && typeof prop !== "symbol" && Object.prototype.propertyIsEnumerable.call(targetObject, prop))
        maybeFreeze(rootScope, childValue);
    }
  }
  function maybeFreeze(scope, value, deep = false) {
    if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
      freeze(value, deep);
    }
  }
  function createProxyProxy(base, parent) {
    const isArray = Array.isArray(base);
    const state = {
      type_: isArray ? 1 : 0,
      // Track which produce call this is associated with.
      scope_: parent ? parent.scope_ : getCurrentScope(),
      // True for both shallow and deep changes.
      modified_: false,
      // Used during finalization.
      finalized_: false,
      // Track which properties have been assigned (true) or deleted (false).
      assigned_: {},
      // The parent draft state.
      parent_: parent,
      // The base state.
      base_: base,
      // The base proxy.
      draft_: null,
      // set below
      // The base copy with any updated values.
      copy_: null,
      // Called by the `produce` function.
      revoke_: null,
      isManual_: false
    };
    let target = state;
    let traps = objectTraps;
    if (isArray) {
      target = [state];
      traps = arrayTraps;
    }
    const { revoke, proxy } = Proxy.revocable(target, traps);
    state.draft_ = proxy;
    state.revoke_ = revoke;
    return proxy;
  }
  var objectTraps = {
    get(state, prop) {
      if (prop === DRAFT_STATE)
        return state;
      const source = latest(state);
      if (!has(source, prop)) {
        return readPropFromProto(state, source, prop);
      }
      const value = source[prop];
      if (state.finalized_ || !isDraftable(value)) {
        return value;
      }
      if (value === peek(state.base_, prop)) {
        prepareCopy(state);
        return state.copy_[prop] = createProxy(value, state);
      }
      return value;
    },
    has(state, prop) {
      return prop in latest(state);
    },
    ownKeys(state) {
      return Reflect.ownKeys(latest(state));
    },
    set(state, prop, value) {
      const desc = getDescriptorFromProto(latest(state), prop);
      if (desc?.set) {
        desc.set.call(state.draft_, value);
        return true;
      }
      if (!state.modified_) {
        const current2 = peek(latest(state), prop);
        const currentState = current2?.[DRAFT_STATE];
        if (currentState && currentState.base_ === value) {
          state.copy_[prop] = value;
          state.assigned_[prop] = false;
          return true;
        }
        if (is(value, current2) && (value !== void 0 || has(state.base_, prop)))
          return true;
        prepareCopy(state);
        markChanged(state);
      }
      if (state.copy_[prop] === value && // special case: handle new props with value 'undefined'
      (value !== void 0 || prop in state.copy_) || // special case: NaN
      Number.isNaN(value) && Number.isNaN(state.copy_[prop]))
        return true;
      state.copy_[prop] = value;
      state.assigned_[prop] = true;
      return true;
    },
    deleteProperty(state, prop) {
      if (peek(state.base_, prop) !== void 0 || prop in state.base_) {
        state.assigned_[prop] = false;
        prepareCopy(state);
        markChanged(state);
      } else {
        delete state.assigned_[prop];
      }
      if (state.copy_) {
        delete state.copy_[prop];
      }
      return true;
    },
    // Note: We never coerce `desc.value` into an Immer draft, because we can't make
    // the same guarantee in ES5 mode.
    getOwnPropertyDescriptor(state, prop) {
      const owner = latest(state);
      const desc = Reflect.getOwnPropertyDescriptor(owner, prop);
      if (!desc)
        return desc;
      return {
        writable: true,
        configurable: state.type_ !== 1 || prop !== "length",
        enumerable: desc.enumerable,
        value: owner[prop]
      };
    },
    defineProperty() {
      die(11);
    },
    getPrototypeOf(state) {
      return getPrototypeOf(state.base_);
    },
    setPrototypeOf() {
      die(12);
    }
  };
  var arrayTraps = {};
  each(objectTraps, (key, fn) => {
    arrayTraps[key] = function() {
      arguments[0] = arguments[0][0];
      return fn.apply(this, arguments);
    };
  });
  arrayTraps.deleteProperty = function(state, prop) {
    if (isNaN(parseInt(prop)))
      die(13);
    return arrayTraps.set.call(this, state, prop, void 0);
  };
  arrayTraps.set = function(state, prop, value) {
    if (prop !== "length" && isNaN(parseInt(prop)))
      die(14);
    return objectTraps.set.call(this, state[0], prop, value, state[0]);
  };
  function peek(draft, prop) {
    const state = draft[DRAFT_STATE];
    const source = state ? latest(state) : draft;
    return source[prop];
  }
  function readPropFromProto(state, source, prop) {
    const desc = getDescriptorFromProto(source, prop);
    return desc ? `value` in desc ? desc.value : (
      // This is a very special case, if the prop is a getter defined by the
      // prototype, we should invoke it with the draft as context!
      desc.get?.call(state.draft_)
    ) : void 0;
  }
  function getDescriptorFromProto(source, prop) {
    if (!(prop in source))
      return void 0;
    let proto = getPrototypeOf(source);
    while (proto) {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (desc)
        return desc;
      proto = getPrototypeOf(proto);
    }
    return void 0;
  }
  function markChanged(state) {
    if (!state.modified_) {
      state.modified_ = true;
      if (state.parent_) {
        markChanged(state.parent_);
      }
    }
  }
  function prepareCopy(state) {
    if (!state.copy_) {
      state.copy_ = shallowCopy(
        state.base_,
        state.scope_.immer_.useStrictShallowCopy_
      );
    }
  }
  var Immer2 = class {
    constructor(config) {
      this.autoFreeze_ = true;
      this.useStrictShallowCopy_ = false;
      this.produce = (base, recipe, patchListener) => {
        if (typeof base === "function" && typeof recipe !== "function") {
          const defaultBase = recipe;
          recipe = base;
          const self = this;
          return function curriedProduce(base2 = defaultBase, ...args) {
            return self.produce(base2, (draft) => recipe.call(this, draft, ...args));
          };
        }
        if (typeof recipe !== "function")
          die(6);
        if (patchListener !== void 0 && typeof patchListener !== "function")
          die(7);
        let result;
        if (isDraftable(base)) {
          const scope = enterScope(this);
          const proxy = createProxy(base, void 0);
          let hasError = true;
          try {
            result = recipe(proxy);
            hasError = false;
          } finally {
            if (hasError)
              revokeScope(scope);
            else
              leaveScope(scope);
          }
          usePatchesInScope(scope, patchListener);
          return processResult(result, scope);
        } else if (!base || typeof base !== "object") {
          result = recipe(base);
          if (result === void 0)
            result = base;
          if (result === NOTHING)
            result = void 0;
          if (this.autoFreeze_)
            freeze(result, true);
          if (patchListener) {
            const p = [];
            const ip = [];
            getPlugin("Patches").generateReplacementPatches_(base, result, p, ip);
            patchListener(p, ip);
          }
          return result;
        } else
          die(1, base);
      };
      this.produceWithPatches = (base, recipe) => {
        if (typeof base === "function") {
          return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
        }
        let patches, inversePatches;
        const result = this.produce(base, recipe, (p, ip) => {
          patches = p;
          inversePatches = ip;
        });
        return [result, patches, inversePatches];
      };
      if (typeof config?.autoFreeze === "boolean")
        this.setAutoFreeze(config.autoFreeze);
      if (typeof config?.useStrictShallowCopy === "boolean")
        this.setUseStrictShallowCopy(config.useStrictShallowCopy);
    }
    createDraft(base) {
      if (!isDraftable(base))
        die(8);
      if (isDraft(base))
        base = current(base);
      const scope = enterScope(this);
      const proxy = createProxy(base, void 0);
      proxy[DRAFT_STATE].isManual_ = true;
      leaveScope(scope);
      return proxy;
    }
    finishDraft(draft, patchListener) {
      const state = draft && draft[DRAFT_STATE];
      if (!state || !state.isManual_)
        die(9);
      const { scope_: scope } = state;
      usePatchesInScope(scope, patchListener);
      return processResult(void 0, scope);
    }
    /**
     * Pass true to automatically freeze all copies created by Immer.
     *
     * By default, auto-freezing is enabled.
     */
    setAutoFreeze(value) {
      this.autoFreeze_ = value;
    }
    /**
     * Pass true to enable strict shallow copy.
     *
     * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
     */
    setUseStrictShallowCopy(value) {
      this.useStrictShallowCopy_ = value;
    }
    applyPatches(base, patches) {
      let i;
      for (i = patches.length - 1; i >= 0; i--) {
        const patch2 = patches[i];
        if (patch2.path.length === 0 && patch2.op === "replace") {
          base = patch2.value;
          break;
        }
      }
      if (i > -1) {
        patches = patches.slice(i + 1);
      }
      const applyPatchesImpl = getPlugin("Patches").applyPatches_;
      if (isDraft(base)) {
        return applyPatchesImpl(base, patches);
      }
      return this.produce(
        base,
        (draft) => applyPatchesImpl(draft, patches)
      );
    }
  };
  function createProxy(value, parent) {
    const draft = isMap(value) ? getPlugin("MapSet").proxyMap_(value, parent) : isSet(value) ? getPlugin("MapSet").proxySet_(value, parent) : createProxyProxy(value, parent);
    const scope = parent ? parent.scope_ : getCurrentScope();
    scope.drafts_.push(draft);
    return draft;
  }
  function current(value) {
    if (!isDraft(value))
      die(10, value);
    return currentImpl(value);
  }
  function currentImpl(value) {
    if (!isDraftable(value) || isFrozen(value))
      return value;
    const state = value[DRAFT_STATE];
    let copy;
    if (state) {
      if (!state.modified_)
        return state.base_;
      state.finalized_ = true;
      copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_);
    } else {
      copy = shallowCopy(value, true);
    }
    each(copy, (key, childValue) => {
      set2(copy, key, currentImpl(childValue));
    });
    if (state) {
      state.finalized_ = false;
    }
    return copy;
  }
  var immer = new Immer2();
  var produce = immer.produce;
  var produceWithPatches = immer.produceWithPatches.bind(
    immer
  );
  var setAutoFreeze = immer.setAutoFreeze.bind(immer);
  var setUseStrictShallowCopy = immer.setUseStrictShallowCopy.bind(immer);
  var applyPatches = immer.applyPatches.bind(immer);
  var createDraft = immer.createDraft.bind(immer);
  var finishDraft = immer.finishDraft.bind(immer);

  // ../rettangoli-fe/src/core/runtime/store.js
  var bindStore = (store, props, constants) => {
    const { createInitialState: createInitialState16, ...selectorsAndActions } = store;
    const selectors = {};
    const actions = {};
    let currentState = {};
    if (createInitialState16) {
      currentState = createInitialState16({ props, constants });
    }
    Object.entries(selectorsAndActions).forEach(([key, fn]) => {
      if (key.startsWith("select")) {
        selectors[key] = (...args) => {
          return fn({ state: currentState, props, constants }, ...args);
        };
        return;
      }
      actions[key] = (payload = {}) => {
        const normalizedPayload = payload === void 0 ? {} : payload;
        if (!isObjectPayload(normalizedPayload)) {
          throw new Error(
            `[Store] Action '${key}' expects payload to be an object.`
          );
        }
        currentState = produce(currentState, (draft) => {
          return fn({ state: draft, props, constants }, normalizedPayload);
        });
        return currentState;
      };
    });
    return {
      getState: () => currentState,
      ...actions,
      ...selectors
    };
  };

  // ../rettangoli-fe/src/core/runtime/constants.js
  var deepFreeze = (value) => {
    if (!isObjectPayload(value) || Object.isFrozen(value)) {
      return value;
    }
    Object.values(value).forEach((nestedValue) => {
      deepFreeze(nestedValue);
    });
    return Object.freeze(value);
  };
  var resolveConstants = ({ setupConstants, fileConstants }) => {
    const normalizedSetupConstants = isObjectPayload(setupConstants) ? setupConstants : {};
    const normalizedFileConstants = isObjectPayload(fileConstants) ? fileConstants : {};
    return deepFreeze({
      ...normalizedSetupConstants,
      ...normalizedFileConstants
    });
  };

  // ../rettangoli-fe/src/core/style/yamlToCss.js
  var yamlToCss = (_elementName, styleObject) => {
    if (!styleObject || typeof styleObject !== "object") {
      return "";
    }
    let css2 = ``;
    const convertPropertiesToCss = (properties) => {
      return Object.entries(properties).map(([property, value]) => `  ${property}: ${value};`).join("\n");
    };
    const processSelector = (selector, rules) => {
      if (typeof rules !== "object" || rules === null) {
        return "";
      }
      if (selector.startsWith("@")) {
        const nestedCss = Object.entries(rules).map(([nestedSelector, nestedRules]) => {
          const nestedProperties = convertPropertiesToCss(nestedRules);
          return `  ${nestedSelector} {
${nestedProperties.split("\n").map((line) => line ? `  ${line}` : "").join("\n")}
  }`;
        }).join("\n");
        return `${selector} {
${nestedCss}
}`;
      }
      const properties = convertPropertiesToCss(rules);
      return `${selector} {
${properties}
}`;
    };
    Object.entries(styleObject).forEach(([selector, rules]) => {
      const selectorCss = processSelector(selector, rules);
      if (selectorCss) {
        css2 += (css2 ? "\n\n" : "") + selectorCss;
      }
    });
    return css2;
  };

  // ../rettangoli-fe/src/common.js
  var flattenArrays = (items) => {
    if (!Array.isArray(items)) {
      return items;
    }
    return items.reduce((acc, item) => {
      if (Array.isArray(item)) {
        acc.push(...flattenArrays(item));
      } else {
        if (item && typeof item === "object") {
          const entries = Object.entries(item);
          if (entries.length > 0) {
            const [key, value] = entries[0];
            if (Array.isArray(value)) {
              item = { [key]: flattenArrays(value) };
            }
          }
        }
        acc.push(item);
      }
      return acc;
    }, []);
  };

  // ../rettangoli-fe/src/core/view/bindings.js
  var PROP_PREFIX = ":";
  var UNSAFE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  var lodashGet = (obj, path) => {
    if (!path)
      return obj;
    const parts = [];
    let current2 = "";
    let inBrackets = false;
    let quoteChar = null;
    for (let i = 0; i < path.length; i++) {
      const char = path[i];
      if (!inBrackets && char === ".") {
        if (current2) {
          parts.push(current2);
          current2 = "";
        }
      } else if (!inBrackets && char === "[") {
        if (current2) {
          parts.push(current2);
          current2 = "";
        }
        inBrackets = true;
      } else if (inBrackets && char === "]") {
        if (current2) {
          if (current2.startsWith('"') && current2.endsWith('"') || current2.startsWith("'") && current2.endsWith("'")) {
            parts.push(current2.slice(1, -1));
          } else {
            const numValue = Number(current2);
            parts.push(Number.isNaN(numValue) ? current2 : numValue);
          }
          current2 = "";
        }
        inBrackets = false;
        quoteChar = null;
      } else if (inBrackets && (char === '"' || char === "'")) {
        if (!quoteChar) {
          quoteChar = char;
        } else if (char === quoteChar) {
          quoteChar = null;
        }
        current2 += char;
      } else {
        current2 += char;
      }
    }
    if (current2) {
      parts.push(current2);
    }
    return parts.reduce((acc, part) => {
      if (acc == null)
        return void 0;
      const key = typeof part === "number" ? part : String(part);
      if (typeof key === "string" && UNSAFE_KEYS.has(key))
        return void 0;
      return acc[key];
    }, obj);
  };
  var toCamelCase2 = (value) => {
    return value.replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
  };
  var parseNodeBindings = ({
    attrsString = "",
    viewData = {},
    tagName: tagName2,
    isWebComponent
  }) => {
    const attrs = {};
    const props = {};
    const assertSupportedBooleanToggleAttr = (attrName) => {
      if (attrName === "role" || attrName.startsWith("aria-") || attrName.startsWith("data-")) {
        throw new Error(
          `[Parser] Invalid boolean attribute '?${attrName}'. Use normal binding for value-carrying attributes such as aria-*, data-*, and role.`
        );
      }
    };
    const setComponentProp = (rawPropName, propValue, sourceLabel) => {
      const normalizedPropName = toCamelCase2(rawPropName);
      if (!normalizedPropName) {
        throw new Error(`[Parser] Invalid ${sourceLabel} prop name on '${tagName2}'.`);
      }
      if (Object.prototype.hasOwnProperty.call(props, normalizedPropName)) {
        throw new Error(
          `[Parser] Duplicate prop binding '${normalizedPropName}' on '${tagName2}'. Use only one of 'name=value' or ':name=value'.`
        );
      }
      props[normalizedPropName] = propValue;
    };
    if (!attrsString) {
      return { attrs, props };
    }
    const attrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]*))/g;
    let match;
    const processedAttrs = /* @__PURE__ */ new Set();
    while ((match = attrRegex.exec(attrsString)) !== null) {
      const rawBindingName = match[1];
      const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
      processedAttrs.add(rawBindingName);
      if (rawBindingName.startsWith(".")) {
        attrs[rawBindingName] = rawValue;
        continue;
      }
      if (rawBindingName.startsWith(PROP_PREFIX)) {
        const propName = rawBindingName.substring(1);
        let propValue = rawValue;
        if (match[4] !== void 0 && match[4] !== "") {
          const valuePathName = match[4];
          const resolvedPathValue = lodashGet(viewData, valuePathName);
          if (resolvedPathValue !== void 0) {
            propValue = resolvedPathValue;
          }
        }
        setComponentProp(propName, propValue, "property-form");
        continue;
      }
      if (rawBindingName.startsWith("?")) {
        const attrName = rawBindingName.substring(1);
        const attrValue = rawValue;
        assertSupportedBooleanToggleAttr(attrName);
        let evalValue;
        if (attrValue === "true") {
          evalValue = true;
        } else if (attrValue === "false") {
          evalValue = false;
        } else if (attrValue === "") {
          evalValue = false;
        } else {
          evalValue = lodashGet(viewData, attrValue);
        }
        if (evalValue) {
          attrs[attrName] = "";
        }
        if (isWebComponent && attrName !== "id") {
          setComponentProp(attrName, !!evalValue, "boolean attribute-form");
        }
        continue;
      }
      attrs[rawBindingName] = rawValue;
      if (isWebComponent && rawBindingName !== "id") {
        setComponentProp(rawBindingName, rawValue, "attribute-form");
      }
    }
    let remainingAttrsString = attrsString;
    const processedMatches = [];
    let tempMatch;
    const tempAttrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]*))/g;
    while ((tempMatch = tempAttrRegex.exec(attrsString)) !== null) {
      processedMatches.push(tempMatch[0]);
    }
    processedMatches.forEach((processedMatch) => {
      remainingAttrsString = remainingAttrsString.replace(processedMatch, " ");
    });
    const booleanAttrRegex = /\b(\S+?)(?=\s|$)/g;
    let boolMatch;
    while ((boolMatch = booleanAttrRegex.exec(remainingAttrsString)) !== null) {
      const attrName = boolMatch[1];
      if (attrName.startsWith(".")) {
        continue;
      }
      if (!processedAttrs.has(attrName) && !attrName.startsWith(PROP_PREFIX) && !attrName.includes("=")) {
        attrs[attrName] = "";
        if (isWebComponent && attrName !== "id") {
          setComponentProp(attrName, true, "boolean attribute-form");
        }
      }
    }
    return { attrs, props };
  };

  // ../rettangoli-fe/src/core/view/refs.js
  var REF_ID_KEY_REGEX = /^[a-z][a-zA-Z0-9]*\*?$/;
  var REF_CLASS_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*\*?$/;
  var REF_ID_REGEX = /^[a-z][a-zA-Z0-9]*$/;
  var GLOBAL_REF_KEYS = /* @__PURE__ */ new Set(["window", "document"]);
  var createRefMatchers = (refs) => {
    return Object.entries(refs || {}).map(([refKey, refConfig]) => {
      if (GLOBAL_REF_KEYS.has(refKey)) {
        return {
          refKey,
          refConfig,
          targetType: "global",
          isWildcard: false,
          prefix: refKey
        };
      }
      let targetType = "id";
      let rawKey = refKey;
      if (refKey.startsWith(".")) {
        targetType = "class";
        rawKey = refKey.slice(1);
      } else if (refKey.startsWith("#")) {
        targetType = "id";
        rawKey = refKey.slice(1);
      }
      const reservedBaseKey = rawKey.endsWith("*") ? rawKey.slice(0, -1) : rawKey;
      if (GLOBAL_REF_KEYS.has(reservedBaseKey)) {
        throw new Error(
          `[Parser] Invalid ref key '${refKey}'. Reserved global keys must be exactly 'window' or 'document'.`
        );
      }
      if (targetType === "id" && !REF_ID_KEY_REGEX.test(rawKey)) {
        throw new Error(
          `[Parser] Invalid ref key '${refKey}'. Use camelCase IDs (optional '#', optional '*') or class refs with '.' prefix.`
        );
      }
      if (targetType === "class" && !REF_CLASS_KEY_REGEX.test(rawKey)) {
        throw new Error(
          `[Parser] Invalid ref key '${refKey}'. Class refs must start with '.' and use class-compatible names (optional '*').`
        );
      }
      const isWildcard = rawKey.endsWith("*");
      const prefix = isWildcard ? rawKey.slice(0, -1) : rawKey;
      return {
        refKey,
        refConfig,
        targetType,
        isWildcard,
        prefix
      };
    });
  };
  var validateElementIdForRefs = (elementIdForRefs) => {
    if (!REF_ID_REGEX.test(elementIdForRefs)) {
      throw new Error(
        `[Parser] Invalid element id '${elementIdForRefs}' for refs. Use camelCase ids only. Kebab-case ids are not supported.`
      );
    }
  };
  var matchByPrefix = ({ value, prefix, isWildcard }) => {
    if (typeof value !== "string" || value.length === 0) {
      return false;
    }
    if (isWildcard) {
      return value.startsWith(prefix);
    }
    return value === prefix;
  };
  var resolveBestRefMatcher = ({
    elementIdForRefs,
    classNames = [],
    refMatchers
  }) => {
    const candidates = [];
    const normalizedClassNames = Array.isArray(classNames) ? classNames : [];
    refMatchers.forEach((refMatcher) => {
      if (refMatcher.targetType === "global") {
        return;
      }
      if (refMatcher.targetType === "id") {
        if (matchByPrefix({
          value: elementIdForRefs,
          prefix: refMatcher.prefix,
          isWildcard: refMatcher.isWildcard
        })) {
          candidates.push({
            ...refMatcher,
            matchedValue: elementIdForRefs
          });
        }
        return;
      }
      const matchingClassName = normalizedClassNames.find((className) => {
        return matchByPrefix({
          value: className,
          prefix: refMatcher.prefix,
          isWildcard: refMatcher.isWildcard
        });
      });
      if (matchingClassName) {
        candidates.push({
          ...refMatcher,
          matchedValue: matchingClassName
        });
      }
    });
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((a, b) => {
      const aTypeRank = a.targetType === "id" ? 2 : 1;
      const bTypeRank = b.targetType === "id" ? 2 : 1;
      if (aTypeRank !== bTypeRank) {
        return bTypeRank - aTypeRank;
      }
      if (!a.isWildcard && b.isWildcard)
        return -1;
      if (a.isWildcard && !b.isWildcard)
        return 1;
      return b.prefix.length - a.prefix.length;
    });
    return candidates[0];
  };
  var assertBooleanEventOption = ({ optionName, optionValue, eventType, refKey }) => {
    if (optionValue === void 0) {
      return;
    }
    if (typeof optionValue !== "boolean") {
      throw new Error(
        `[Parser] Invalid '${optionName}' for event '${eventType}' on ref '${refKey}'. Expected boolean.`
      );
    }
  };
  var assertNumberEventOption = ({ optionName, optionValue, eventType, refKey }) => {
    if (optionValue === void 0) {
      return;
    }
    if (typeof optionValue !== "number" || Number.isNaN(optionValue) || !Number.isFinite(optionValue) || optionValue < 0) {
      throw new Error(
        `[Parser] Invalid '${optionName}' for event '${eventType}' on ref '${refKey}'. Expected non-negative number.`
      );
    }
  };
  var validateEventConfig = ({ eventType, eventConfig, refKey }) => {
    if (typeof eventConfig !== "object" || eventConfig === null) {
      throw new Error(
        `[Parser] Invalid event config for event '${eventType}' on ref '${refKey}'.`
      );
    }
    const hasDebounce = Object.prototype.hasOwnProperty.call(eventConfig, "debounce");
    const hasThrottle = Object.prototype.hasOwnProperty.call(eventConfig, "throttle");
    assertBooleanEventOption({
      optionName: "preventDefault",
      optionValue: eventConfig.preventDefault,
      eventType,
      refKey
    });
    assertBooleanEventOption({
      optionName: "stopPropagation",
      optionValue: eventConfig.stopPropagation,
      eventType,
      refKey
    });
    assertBooleanEventOption({
      optionName: "stopImmediatePropagation",
      optionValue: eventConfig.stopImmediatePropagation,
      eventType,
      refKey
    });
    assertBooleanEventOption({
      optionName: "targetOnly",
      optionValue: eventConfig.targetOnly,
      eventType,
      refKey
    });
    assertBooleanEventOption({
      optionName: "once",
      optionValue: eventConfig.once,
      eventType,
      refKey
    });
    assertNumberEventOption({
      optionName: "debounce",
      optionValue: eventConfig.debounce,
      eventType,
      refKey
    });
    assertNumberEventOption({
      optionName: "throttle",
      optionValue: eventConfig.throttle,
      eventType,
      refKey
    });
    if (hasDebounce && hasThrottle) {
      throw new Error(
        `[Parser] Event '${eventType}' on ref '${refKey}' cannot define both 'debounce' and 'throttle'.`
      );
    }
    if (eventConfig.handler && eventConfig.action) {
      throw new Error("Each listener can have handler or action but not both");
    }
    if (!eventConfig.handler && !eventConfig.action) {
      throw new Error("Each listener must define either handler or action");
    }
    return {
      hasDebounce,
      hasThrottle
    };
  };

  // ../rettangoli-fe/src/core/runtime/events.js
  var getEventRateLimitState = (handlers) => {
    if (!handlers.__eventRateLimitState) {
      Object.defineProperty(handlers, "__eventRateLimitState", {
        value: /* @__PURE__ */ new Map(),
        enumerable: false,
        configurable: true
      });
    }
    return handlers.__eventRateLimitState;
  };
  var createEventDispatchCallback = ({
    eventConfig,
    handlers,
    onMissingHandler,
    parseAndRenderFn
  }) => {
    const getPayload = (event) => {
      const payloadTemplate = eventConfig.payload && typeof eventConfig.payload === "object" && !Array.isArray(eventConfig.payload) ? eventConfig.payload : {};
      if (typeof parseAndRenderFn !== "function") {
        return payloadTemplate;
      }
      return parseAndRenderFn(payloadTemplate, {
        _event: event
      });
    };
    if (eventConfig.action) {
      if (typeof handlers.handleCallStoreAction !== "function") {
        throw new Error(
          `[Runtime] Action listener '${eventConfig.action}' requires handlers.handleCallStoreAction.`
        );
      }
      return (event) => {
        const payload = getPayload(event);
        handlers.handleCallStoreAction({
          ...payload,
          _event: event,
          _action: eventConfig.action
        });
      };
    }
    if (eventConfig.handler && handlers[eventConfig.handler]) {
      return (event) => {
        const payload = getPayload(event);
        handlers[eventConfig.handler]({
          ...payload,
          _event: event
        });
      };
    }
    if (eventConfig.handler) {
      onMissingHandler?.(eventConfig.handler);
    }
    return null;
  };
  var createManagedEventListener = ({
    eventConfig,
    callback,
    hasDebounce,
    hasThrottle,
    stateKey,
    eventRateLimitState,
    fallbackCurrentTarget = null,
    nowFn = Date.now,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout
  }) => {
    return (event) => {
      const state = eventRateLimitState.get(stateKey) || {};
      const currentTarget = event.currentTarget || fallbackCurrentTarget;
      if (eventConfig.once) {
        if (currentTarget) {
          if (!state.onceTargets) {
            state.onceTargets = /* @__PURE__ */ new WeakSet();
          }
          if (state.onceTargets.has(currentTarget)) {
            eventRateLimitState.set(stateKey, state);
            return;
          }
          state.onceTargets.add(currentTarget);
        } else if (state.onceTriggered) {
          eventRateLimitState.set(stateKey, state);
          return;
        } else {
          state.onceTriggered = true;
        }
      }
      if (eventConfig.targetOnly && event.target !== event.currentTarget) {
        eventRateLimitState.set(stateKey, state);
        return;
      }
      if (eventConfig.preventDefault) {
        event.preventDefault();
      }
      if (eventConfig.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      } else if (eventConfig.stopPropagation) {
        event.stopPropagation();
      }
      if (hasDebounce) {
        if (state.debounceTimer) {
          clearTimeoutFn(state.debounceTimer);
        }
        state.debounceTimer = setTimeoutFn(() => {
          const timerId = state.debounceTimer;
          try {
            callback(event);
          } catch (err) {
            clearTimeoutFn(timerId);
            state.debounceTimer = null;
            throw err;
          }
          state.debounceTimer = null;
        }, eventConfig.debounce);
        eventRateLimitState.set(stateKey, state);
        return;
      }
      if (hasThrottle) {
        if (!Object.prototype.hasOwnProperty.call(state, "lastThrottleAt")) {
          state.lastThrottleAt = void 0;
        }
        const now3 = nowFn();
        if (state.lastThrottleAt === void 0 || now3 - state.lastThrottleAt >= eventConfig.throttle) {
          state.lastThrottleAt = now3;
          eventRateLimitState.set(stateKey, state);
          callback(event);
          return;
        }
        eventRateLimitState.set(stateKey, state);
        return;
      }
      eventRateLimitState.set(stateKey, state);
      callback(event);
    };
  };
  var createConfiguredEventListener = ({
    eventType,
    eventConfig,
    refKey,
    handlers,
    eventRateLimitState,
    stateKey,
    fallbackCurrentTarget = null,
    parseAndRenderFn,
    onMissingHandler,
    nowFn = Date.now,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout
  }) => {
    const { hasDebounce, hasThrottle } = validateEventConfig({
      eventType,
      eventConfig,
      refKey
    });
    const callback = createEventDispatchCallback({
      eventConfig,
      handlers,
      onMissingHandler,
      parseAndRenderFn
    });
    if (!callback) {
      return null;
    }
    return createManagedEventListener({
      eventConfig,
      callback,
      hasDebounce,
      hasThrottle,
      stateKey,
      eventRateLimitState,
      fallbackCurrentTarget,
      nowFn,
      setTimeoutFn,
      clearTimeoutFn
    });
  };

  // ../rettangoli-fe/src/parser.js
  var parseView = ({
    h: h2,
    template,
    viewData,
    refs,
    handlers,
    createComponentUpdateHook
  }) => {
    const result = render_default2(template, viewData, {});
    const flattenedResult = flattenArrays(result);
    const childNodes = createVirtualDom({
      h: h2,
      items: flattenedResult,
      refs,
      handlers,
      viewData,
      createComponentUpdateHook
    });
    const vdom = h2("div", { style: { display: "contents" } }, childNodes);
    return vdom;
  };
  var createVirtualDom = ({
    h: h2,
    items,
    refs = {},
    handlers = {},
    viewData = {},
    createComponentUpdateHook
  }) => {
    if (!Array.isArray(items)) {
      throw new Error("[Parser] Input to createVirtualDom must be an array, got " + typeof items);
    }
    const refMatchers = createRefMatchers(refs);
    const hasIdRefMatchers = refMatchers.some((refMatcher) => refMatcher.targetType === "id");
    function processItems(currentItems, parentPath = "") {
      return currentItems.map((item, index) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }
        if (typeof item !== "object" || item === null) {
          console.warn("Skipping invalid item in DOM structure:", item);
          return null;
        }
        const entries = Object.entries(item);
        if (entries.length === 0) {
          return null;
        }
        const [keyString, value] = entries[0];
        if (!isNaN(Number(keyString))) {
          if (Array.isArray(value)) {
            return processItems(value, `${parentPath}.${keyString}`);
          } else if (typeof value === "object" && value !== null) {
            const nestedEntries = Object.entries(value);
            if (nestedEntries.length > 0) {
              return processItems([value], `${parentPath}.${keyString}`);
            }
          }
          return String(value);
        }
        if (entries.length > 1) {
          console.warn(
            "Item has multiple keys, processing only the first:",
            keyString
          );
        }
        let selector;
        let attrsString;
        const firstSpaceIndex = keyString.indexOf(" ");
        if (firstSpaceIndex === -1) {
          selector = keyString;
          attrsString = "";
        } else {
          selector = keyString.substring(0, firstSpaceIndex);
          attrsString = keyString.substring(firstSpaceIndex + 1).trim();
        }
        const tagName2 = selector.split(/[.#]/)[0];
        const isWebComponent = tagName2.includes("-");
        let attrs;
        let props;
        try {
          ({ attrs, props } = parseNodeBindings({
            attrsString,
            viewData,
            tagName: tagName2,
            isWebComponent
          }));
        } catch (error) {
          throw new Error(
            `[Parser] Failed to parse bindings for selector '${selector}' with attrs '${attrsString}': ${error.message}`
          );
        }
        const idMatchInSelector = selector.match(/#([^.#\s]+)/);
        if (idMatchInSelector && !Object.prototype.hasOwnProperty.call(attrs, "id")) {
          attrs.id = idMatchInSelector[1];
        }
        let elementIdForRefs = null;
        if (attrs.id) {
          elementIdForRefs = attrs.id;
        }
        const selectorClassMatches = selector.match(/\.([^.#]+)/g) || [];
        const selectorClassNames = selectorClassMatches.map((classMatch) => classMatch.substring(1));
        const attributeClassNames = typeof attrs.class === "string" ? attrs.class.split(/\s+/).filter(Boolean) : [];
        const classNamesForRefs = [.../* @__PURE__ */ new Set([...selectorClassNames, ...attributeClassNames])];
        const classObj = /* @__PURE__ */ Object.create(null);
        let elementId = null;
        if (!isWebComponent) {
          selectorClassNames.forEach((className) => {
            classObj[className] = true;
          });
          const idMatch = selector.match(/#([^.#\s]+)/);
          if (idMatch) {
            elementId = idMatch[1];
          }
        }
        let childrenOrText;
        if (typeof value === "string" || typeof value === "number") {
          childrenOrText = String(value);
        } else if (Array.isArray(value)) {
          childrenOrText = processItems(value, `${parentPath}.${keyString}`);
        } else {
          childrenOrText = [];
        }
        if (elementId && !isWebComponent) {
          attrs.id = elementId;
        }
        const eventHandlers = /* @__PURE__ */ Object.create(null);
        if (refMatchers.length > 0) {
          if (hasIdRefMatchers && elementIdForRefs) {
            validateElementIdForRefs(elementIdForRefs);
          }
          const bestMatchRef = resolveBestRefMatcher({
            elementIdForRefs,
            classNames: classNamesForRefs,
            refMatchers
          });
          if (bestMatchRef) {
            const bestMatchRefKey = bestMatchRef.refKey;
            const matchIdentity = bestMatchRef.matchedValue || elementIdForRefs || bestMatchRefKey;
            if (bestMatchRef.refConfig && bestMatchRef.refConfig.eventListeners) {
              const eventListeners = bestMatchRef.refConfig.eventListeners;
              const eventRateLimitState = getEventRateLimitState(handlers);
              Object.entries(eventListeners).forEach(
                ([eventType, eventConfig]) => {
                  const stateKey = `${bestMatchRefKey}:${matchIdentity}:${eventType}`;
                  const listener = createConfiguredEventListener({
                    eventType,
                    eventConfig,
                    refKey: bestMatchRefKey,
                    handlers,
                    eventRateLimitState,
                    stateKey,
                    parseAndRenderFn: parseAndRender_default2,
                    onMissingHandler: (missingHandlerName) => {
                      console.warn(
                        `[Parser] Handler '${missingHandlerName}' for refKey '${bestMatchRefKey}' (matching '${matchIdentity}') is referenced but not found in available handlers.`
                      );
                    }
                  });
                  if (!listener) {
                    return;
                  }
                  eventHandlers[eventType] = listener;
                }
              );
            }
          }
        }
        const snabbdomData = {};
        if (elementIdForRefs) {
          snabbdomData.key = elementIdForRefs;
        } else if (selector) {
          const itemPath = parentPath ? `${parentPath}.${index}` : String(index);
          snabbdomData.key = `${selector}-${itemPath}`;
          const propKeys = Object.keys(props);
          if (propKeys.length > 0) {
            snabbdomData.key += `-p:${propKeys.join(",")}`;
          }
        }
        if (Object.keys(attrs).length > 0) {
          snabbdomData.attrs = attrs;
        }
        if (Object.keys(classObj).length > 0) {
          snabbdomData.class = classObj;
        }
        if (Object.keys(eventHandlers).length > 0) {
          snabbdomData.on = eventHandlers;
        }
        if (Object.keys(props).length > 0) {
          snabbdomData.props = props;
        }
        if (isWebComponent && typeof createComponentUpdateHook === "function") {
          const componentHook = createComponentUpdateHook({
            selector,
            tagName: tagName2
          });
          if (componentHook) {
            snabbdomData.hook = componentHook;
          }
        }
        try {
          return h2(tagName2, snabbdomData, childrenOrText);
        } catch (error) {
          throw new Error(
            `[Parser] Error creating virtual node for '${tagName2}': ${error.message}`
          );
        }
      }).filter(Boolean);
    }
    return processItems(items);
  };

  // ../rettangoli-fe/src/core/runtime/lifecycle.js
  var createRuntimeDeps = ({
    baseDeps,
    refs,
    dispatchEvent,
    store,
    render: render3
  }) => {
    return {
      ...baseDeps,
      refs,
      dispatchEvent,
      store,
      render: render3
    };
  };
  var createStoreActionDispatcher = ({
    store,
    render: render3,
    parseAndRenderFn
  }) => {
    return (payload) => {
      const { _event, _action } = payload;
      const context = parseAndRenderFn(payload, {
        _event
      });
      if (!store[_action]) {
        throw new Error(`[Store] Action 'store.${_action}' is not defined.`);
      }
      store[_action](context);
      render3();
    };
  };
  var createTransformedHandlers = ({
    handlers,
    deps: deps2,
    parseAndRenderFn
  }) => {
    const transformedHandlers = {
      handleCallStoreAction: createStoreActionDispatcher({
        store: deps2.store,
        render: deps2.render,
        parseAndRenderFn
      })
    };
    Object.keys(handlers || {}).forEach((key) => {
      transformedHandlers[key] = (payload) => {
        return handlers[key](deps2, payload);
      };
    });
    return transformedHandlers;
  };
  var ensureSyncBeforeMountResult = (beforeMountResult) => {
    if (beforeMountResult && typeof beforeMountResult.then === "function") {
      throw new Error("handleBeforeMount must be synchronous and cannot return a Promise.");
    }
    return beforeMountResult;
  };
  var runBeforeMount = ({ handlers, deps: deps2 }) => {
    if (!handlers?.handleBeforeMount) {
      return void 0;
    }
    const beforeMountResult = handlers.handleBeforeMount(deps2);
    return ensureSyncBeforeMountResult(beforeMountResult);
  };
  var runAfterMount = ({ handlers, deps: deps2 }) => {
    if (!handlers?.handleAfterMount) {
      return;
    }
    handlers.handleAfterMount(deps2);
  };
  var buildOnUpdateChanges = ({
    attributeName,
    oldValue,
    newValue,
    deps: deps2,
    propsSchemaKeys,
    toCamelCase: toCamelCase3,
    normalizeAttributeValue: normalizeAttributeValue2
  }) => {
    const changedProp = toCamelCase3(attributeName);
    const newProps = {};
    propsSchemaKeys.forEach((propKey) => {
      const propValue = deps2.props[propKey];
      if (propValue !== void 0) {
        newProps[propKey] = propValue;
      }
    });
    const oldProps = {
      ...newProps
    };
    const normalizedOldValue = normalizeAttributeValue2(oldValue);
    const normalizedNewValue = normalizeAttributeValue2(newValue);
    if (normalizedOldValue === void 0) {
      delete oldProps[changedProp];
    } else {
      oldProps[changedProp] = normalizedOldValue;
    }
    if (normalizedNewValue === void 0) {
      delete newProps[changedProp];
    } else {
      newProps[changedProp] = normalizedNewValue;
    }
    return {
      changedProp,
      oldProps,
      newProps
    };
  };

  // ../rettangoli-fe/src/core/runtime/globalListeners.js
  var resolveGlobalTarget = ({ refKey, targets }) => {
    if (refKey === "window") {
      return targets.window;
    }
    if (refKey === "document") {
      return targets.document;
    }
    return null;
  };
  var attachGlobalRefListeners = ({
    refs = {},
    handlers = {},
    targets = {
      window: globalThis.window,
      document: globalThis.document
    },
    parseAndRenderFn,
    timing = {
      nowFn: Date.now,
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout
    },
    warnFn = console.warn
  }) => {
    const cleanupCallbacks = [];
    const stateKeys = /* @__PURE__ */ new Set();
    const eventRateLimitState = getEventRateLimitState(handlers);
    Object.entries(refs).forEach(([refKey, refConfig]) => {
      if (refKey !== "window" && refKey !== "document") {
        return;
      }
      const target = resolveGlobalTarget({ refKey, targets });
      if (!target || !refConfig?.eventListeners) {
        return;
      }
      Object.entries(refConfig.eventListeners).forEach(([eventType, eventConfig]) => {
        const stateKey = `${refKey}:${eventType}`;
        stateKeys.add(stateKey);
        const listener = createConfiguredEventListener({
          eventType,
          eventConfig,
          refKey,
          handlers,
          eventRateLimitState,
          stateKey,
          fallbackCurrentTarget: target,
          parseAndRenderFn,
          nowFn: timing.nowFn,
          setTimeoutFn: timing.setTimeoutFn,
          clearTimeoutFn: timing.clearTimeoutFn,
          onMissingHandler: (missingHandlerName) => {
            warnFn(
              `[Runtime] Handler '${missingHandlerName}' for global ref '${refKey}' is referenced but not found in available handlers.`
            );
          }
        });
        if (!listener) {
          return;
        }
        target.addEventListener(eventType, listener);
        cleanupCallbacks.push(() => {
          target.removeEventListener(eventType, listener);
        });
      });
    });
    return () => {
      cleanupCallbacks.forEach((cleanup) => cleanup());
      stateKeys.forEach((stateKey) => {
        const state = eventRateLimitState.get(stateKey);
        if (state && state.debounceTimer) {
          timing.clearTimeoutFn(state.debounceTimer);
        }
        eventRateLimitState.delete(stateKey);
      });
    };
  };

  // ../rettangoli-fe/src/core/runtime/refs.js
  var createRuntimeRefMatchers = (refs) => createRefMatchers(refs);
  var getVNodeClassNames = (vNode) => {
    const classNames = [];
    const classObject = vNode?.data?.class;
    if (classObject && typeof classObject === "object") {
      Object.entries(classObject).forEach(([className, enabled]) => {
        if (enabled) {
          classNames.push(className);
        }
      });
    }
    const classAttr = vNode?.data?.attrs?.class;
    if (typeof classAttr === "string") {
      classAttr.split(/\s+/).filter(Boolean).forEach((className) => classNames.push(className));
    }
    return [...new Set(classNames)];
  };
  var collectRefElements = ({ rootVNode, refs }) => {
    const ids = {};
    const refMatchers = createRuntimeRefMatchers(refs);
    const findRefElements = (vNode) => {
      if (!vNode || typeof vNode !== "object") {
        return;
      }
      const id = vNode?.data?.attrs?.id;
      const classNames = getVNodeClassNames(vNode);
      const bestMatchRef = resolveBestRefMatcher({
        elementIdForRefs: id,
        classNames,
        refMatchers
      });
      if (vNode.elm && bestMatchRef) {
        const key = id || bestMatchRef.refKey;
        ids[key] = vNode.elm;
      }
      if (Array.isArray(vNode.children)) {
        vNode.children.forEach(findRefElements);
      }
    };
    findRefElements(rootVNode);
    return ids;
  };

  // ../rettangoli-fe/src/core/runtime/componentRuntime.js
  var buildObservedAttributes = ({ propsSchemaKeys = [], toKebabCase: toKebabCase2 }) => {
    const observedAttrs = /* @__PURE__ */ new Set(["key"]);
    propsSchemaKeys.forEach((propKey) => {
      observedAttrs.add(propKey);
      observedAttrs.add(toKebabCase2(propKey));
    });
    return [...observedAttrs];
  };
  var createComponentRuntimeDeps = ({
    baseDeps,
    refs,
    dispatchEvent,
    store,
    render: render3
  }) => {
    return createRuntimeDeps({
      baseDeps,
      refs,
      dispatchEvent,
      store,
      render: render3
    });
  };
  var syncRefIds = ({ refIds, nextRefIds = {} }) => {
    Object.keys(refIds).forEach((key) => {
      delete refIds[key];
    });
    Object.assign(refIds, nextRefIds);
    return refIds;
  };
  var cleanupEventRateLimitState = ({
    transformedHandlers,
    clearTimerFn = clearTimeout
  }) => {
    const eventRateLimitState = transformedHandlers?.__eventRateLimitState;
    if (!(eventRateLimitState instanceof Map)) {
      return 0;
    }
    let clearedTimers = 0;
    eventRateLimitState.forEach((state) => {
      if (state && state.debounceTimer) {
        clearTimerFn(state.debounceTimer);
        clearedTimers += 1;
      }
    });
    eventRateLimitState.clear();
    return clearedTimers;
  };

  // ../rettangoli-fe/src/core/runtime/componentOrchestrator.js
  var createRuntimeDepsForInstance = ({ instance }) => {
    return createComponentRuntimeDeps({
      baseDeps: instance.deps,
      refs: instance.refIds,
      dispatchEvent: instance.dispatchEvent.bind(instance),
      store: instance.store,
      render: instance.render.bind(instance)
    });
  };
  var runConnectedComponentLifecycle = ({
    instance,
    parseAndRenderFn,
    renderFn,
    createTransformedHandlersFn = createTransformedHandlers,
    runBeforeMountFn = runBeforeMount,
    attachGlobalRefListenersFn = attachGlobalRefListeners,
    runAfterMountFn = runAfterMount
  }) => {
    const runtimeDeps = createRuntimeDepsForInstance({ instance });
    instance.transformedHandlers = createTransformedHandlersFn({
      handlers: instance.handlers,
      deps: runtimeDeps,
      parseAndRenderFn
    });
    instance._unmountCallback = runBeforeMountFn({
      handlers: instance.handlers,
      deps: runtimeDeps
    });
    instance._globalListenersCleanup = attachGlobalRefListenersFn({
      refs: instance.refs,
      handlers: instance.transformedHandlers,
      parseAndRenderFn
    });
    renderFn();
    runAfterMountFn({
      handlers: instance.handlers,
      deps: runtimeDeps
    });
    return runtimeDeps;
  };
  var runDisconnectedComponentLifecycle = ({
    instance,
    clearTimerFn = clearTimeout
  }) => {
    if (instance._unmountCallback) {
      instance._unmountCallback();
    }
    if (instance._globalListenersCleanup) {
      instance._globalListenersCleanup();
    }
    return cleanupEventRateLimitState({
      transformedHandlers: instance.transformedHandlers,
      clearTimerFn
    });
  };
  var runAttributeChangedComponentLifecycle = ({
    instance,
    attributeName,
    oldValue,
    newValue,
    scheduleFrameFn
  }) => {
    if (oldValue === newValue || !instance.render) {
      return;
    }
    if (instance.handlers?.handleOnUpdate) {
      const runtimeDeps = createRuntimeDepsForInstance({ instance });
      const changes = buildOnUpdateChanges({
        attributeName,
        oldValue,
        newValue,
        deps: runtimeDeps,
        propsSchemaKeys: instance._propsSchemaKeys,
        toCamelCase,
        normalizeAttributeValue
      });
      instance.handlers.handleOnUpdate(runtimeDeps, changes);
      return;
    }
    scheduleFrameFn(() => {
      instance.render();
    });
  };
  var runRenderComponentLifecycle = ({
    instance,
    createComponentUpdateHookFn,
    parseViewFn = parseView,
    collectRefElementsFn = collectRefElements,
    onError = (error) => {
      console.error("Error during render:", error);
    }
  }) => {
    if (!instance.patch) {
      console.error("Patch function is not defined!");
      return null;
    }
    if (!instance.template) {
      console.error("Template is not defined!");
      return null;
    }
    try {
      const vDom = parseViewFn({
        h: instance._snabbdomH,
        template: instance.template,
        viewData: instance.viewData,
        refs: instance.refs,
        handlers: instance.transformedHandlers,
        createComponentUpdateHook: createComponentUpdateHookFn
      });
      if (!instance._oldVNode) {
        instance._oldVNode = instance.patch(instance.renderTarget, vDom);
      } else {
        instance._oldVNode = instance.patch(instance._oldVNode, vDom);
      }
      const ids = collectRefElementsFn({
        rootVNode: instance._oldVNode,
        refs: instance.refs
      });
      syncRefIds({
        refIds: instance.refIds,
        nextRefIds: ids
      });
      return instance._oldVNode;
    } catch (error) {
      onError(error);
      return instance._oldVNode || null;
    }
  };

  // ../rettangoli-fe/src/web/componentDom.js
  var COMMON_LINK_STYLE_TEXT = `
  a, a:link, a:visited, a:hover, a:active {
    display: contents;
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    cursor: pointer;
  }
`;
  var initializeComponentDom = ({
    host,
    cssText,
    createStyleSheet = () => new CSSStyleSheet(),
    createElement: createElement2 = (tagName2) => document.createElement(tagName2)
  }) => {
    const shadow = host.attachShadow({ mode: "open" });
    const commonStyleSheet = createStyleSheet();
    commonStyleSheet.replaceSync(COMMON_LINK_STYLE_TEXT);
    const adoptedStyleSheets = [commonStyleSheet];
    if (cssText) {
      const styleSheet = createStyleSheet();
      styleSheet.replaceSync(cssText);
      adoptedStyleSheets.push(styleSheet);
    }
    shadow.adoptedStyleSheets = adoptedStyleSheets;
    const renderTarget = createElement2("div");
    renderTarget.style.cssText = "display: contents;";
    shadow.appendChild(renderTarget);
    if (!renderTarget.parentNode) {
      host.appendChild(renderTarget);
    }
    host.style.display = "contents";
    return {
      shadow,
      renderTarget,
      adoptedStyleSheets
    };
  };

  // ../rettangoli-fe/src/web/scheduler.js
  var scheduleFrame = (callback, requestAnimationFrameFn = requestAnimationFrame) => {
    return requestAnimationFrameFn(callback);
  };

  // ../rettangoli-fe/src/web/componentUpdateHook.js
  var createWebComponentUpdateHook = ({
    scheduleFrameFn = scheduleFrame
  } = {}) => {
    return {
      update: (oldVnode, vnode2) => {
        const oldProps = oldVnode.data?.props || {};
        const newProps = vnode2.data?.props || {};
        const propsChanged = JSON.stringify(oldProps) !== JSON.stringify(newProps);
        if (!propsChanged) {
          return;
        }
        const element = vnode2.elm;
        if (!element || typeof element.render !== "function") {
          return;
        }
        element.setAttribute("isDirty", "true");
        scheduleFrameFn(() => {
          element.render();
          element.removeAttribute("isDirty");
          if (element.handlers && element.handlers.handleOnUpdate) {
            const deps2 = {
              ...element.deps,
              store: element.store,
              render: element.render.bind(element),
              handlers: element.handlers,
              dispatchEvent: element.dispatchEvent.bind(element),
              refs: element.refIds || {}
            };
            element.handlers.handleOnUpdate(deps2, {
              oldProps,
              newProps
            });
          }
        });
      }
    };
  };

  // ../rettangoli-fe/src/web/createWebComponentClass.js
  var createWebComponentClass = ({
    elementName,
    propsSchema,
    propsSchemaKeys,
    template,
    refs,
    styles: styles9,
    handlers,
    methods,
    constants,
    store,
    patch: patch2,
    h: h2,
    deps: deps2
  }) => {
    class BaseComponent extends HTMLElement {
      elementName;
      styles;
      _snabbdomH;
      store;
      props;
      propsSchema;
      template;
      handlers;
      methods;
      constants;
      transformedHandlers = {};
      refs;
      refIds = {};
      patch;
      _unmountCallback;
      _globalListenersCleanup;
      _oldVNode;
      deps;
      _propsSchemaKeys = [];
      cssText;
      static get observedAttributes() {
        return ["key"];
      }
      get viewData() {
        let data = {};
        if (this.store.selectViewData) {
          data = this.store.selectViewData();
        }
        return data;
      }
      connectedCallback() {
        const dom = initializeComponentDom({
          host: this,
          cssText: this.cssText
        });
        this.shadow = dom.shadow;
        this.renderTarget = dom.renderTarget;
        runConnectedComponentLifecycle({
          instance: this,
          parseAndRenderFn: parseAndRender_default2,
          renderFn: this.render
        });
      }
      disconnectedCallback() {
        runDisconnectedComponentLifecycle({
          instance: this,
          clearTimerFn: clearTimeout
        });
      }
      attributeChangedCallback(name, oldValue, newValue) {
        runAttributeChangedComponentLifecycle({
          instance: this,
          attributeName: name,
          oldValue,
          newValue,
          scheduleFrameFn: scheduleFrame
        });
      }
      render = () => {
        runRenderComponentLifecycle({
          instance: this,
          createComponentUpdateHookFn: createWebComponentUpdateHook
        });
      };
    }
    class MyComponent extends BaseComponent {
      static get observedAttributes() {
        return buildObservedAttributes({
          propsSchemaKeys,
          toKebabCase
        });
      }
      constructor() {
        super();
        this.constants = resolveConstants({
          setupConstants: deps2?.constants,
          fileConstants: constants
        });
        this.propsSchema = propsSchema;
        this.props = propsSchema ? createPropsProxy(this, propsSchemaKeys) : {};
        this._propsSchemaKeys = propsSchemaKeys;
        this.elementName = elementName;
        this.styles = styles9;
        this.store = bindStore(store, this.props, this.constants);
        this.template = template;
        this.handlers = handlers;
        this.methods = methods;
        this.refs = refs;
        this.patch = patch2;
        this.deps = {
          ...deps2,
          store: this.store,
          render: this.render,
          handlers,
          props: this.props,
          constants: this.constants
        };
        bindMethods(this, this.methods);
        this._snabbdomH = h2;
        this.cssText = yamlToCss(elementName, styles9);
      }
    }
    return MyComponent;
  };

  // ../../node_modules/snabbdom/build/vnode.js
  function vnode(sel, data, children, text, elm) {
    const key = data === void 0 ? void 0 : data.key;
    return { sel, data, children, text, elm, key };
  }

  // ../../node_modules/snabbdom/build/is.js
  var array = Array.isArray;
  function primitive(s) {
    return typeof s === "string" || typeof s === "number" || s instanceof String || s instanceof Number;
  }

  // ../../node_modules/snabbdom/build/htmldomapi.js
  function createElement(tagName2, options) {
    return document.createElement(tagName2, options);
  }
  function createElementNS(namespaceURI, qualifiedName, options) {
    return document.createElementNS(namespaceURI, qualifiedName, options);
  }
  function createDocumentFragment() {
    return parseFragment(document.createDocumentFragment());
  }
  function createTextNode(text) {
    return document.createTextNode(text);
  }
  function createComment(text) {
    return document.createComment(text);
  }
  function insertBefore(parentNode2, newNode, referenceNode) {
    if (isDocumentFragment(parentNode2)) {
      let node = parentNode2;
      while (node && isDocumentFragment(node)) {
        const fragment = parseFragment(node);
        node = fragment.parent;
      }
      parentNode2 = node !== null && node !== void 0 ? node : parentNode2;
    }
    if (isDocumentFragment(newNode)) {
      newNode = parseFragment(newNode, parentNode2);
    }
    if (referenceNode && isDocumentFragment(referenceNode)) {
      referenceNode = parseFragment(referenceNode).firstChildNode;
    }
    parentNode2.insertBefore(newNode, referenceNode);
  }
  function removeChild(node, child) {
    node.removeChild(child);
  }
  function appendChild(node, child) {
    if (isDocumentFragment(child)) {
      child = parseFragment(child, node);
    }
    node.appendChild(child);
  }
  function parentNode(node) {
    if (isDocumentFragment(node)) {
      while (node && isDocumentFragment(node)) {
        const fragment = parseFragment(node);
        node = fragment.parent;
      }
      return node !== null && node !== void 0 ? node : null;
    }
    return node.parentNode;
  }
  function nextSibling(node) {
    var _a;
    if (isDocumentFragment(node)) {
      const fragment = parseFragment(node);
      const parent = parentNode(fragment);
      if (parent && fragment.lastChildNode) {
        const children = Array.from(parent.childNodes);
        const index = children.indexOf(fragment.lastChildNode);
        return (_a = children[index + 1]) !== null && _a !== void 0 ? _a : null;
      }
      return null;
    }
    return node.nextSibling;
  }
  function tagName(elm) {
    return elm.tagName;
  }
  function setTextContent(node, text) {
    node.textContent = text;
  }
  function getTextContent(node) {
    return node.textContent;
  }
  function isElement(node) {
    return node.nodeType === 1;
  }
  function isText(node) {
    return node.nodeType === 3;
  }
  function isComment(node) {
    return node.nodeType === 8;
  }
  function isDocumentFragment(node) {
    return node.nodeType === 11;
  }
  function parseFragment(fragmentNode, parentNode2) {
    var _a, _b, _c;
    const fragment = fragmentNode;
    (_a = fragment.parent) !== null && _a !== void 0 ? _a : fragment.parent = parentNode2 !== null && parentNode2 !== void 0 ? parentNode2 : null;
    (_b = fragment.firstChildNode) !== null && _b !== void 0 ? _b : fragment.firstChildNode = fragmentNode.firstChild;
    (_c = fragment.lastChildNode) !== null && _c !== void 0 ? _c : fragment.lastChildNode = fragmentNode.lastChild;
    return fragment;
  }
  var htmlDomApi = {
    createElement,
    createElementNS,
    createTextNode,
    createDocumentFragment,
    createComment,
    insertBefore,
    removeChild,
    appendChild,
    parentNode,
    nextSibling,
    tagName,
    setTextContent,
    getTextContent,
    isElement,
    isText,
    isComment,
    isDocumentFragment
  };

  // ../../node_modules/snabbdom/build/init.js
  function isUndef(s) {
    return s === void 0;
  }
  function isDef(s) {
    return s !== void 0;
  }
  var emptyNode = vnode("", {}, [], void 0, void 0);
  function sameVnode(vnode1, vnode2) {
    var _a, _b;
    const isSameKey = vnode1.key === vnode2.key;
    const isSameIs = ((_a = vnode1.data) === null || _a === void 0 ? void 0 : _a.is) === ((_b = vnode2.data) === null || _b === void 0 ? void 0 : _b.is);
    const isSameSel = vnode1.sel === vnode2.sel;
    const isSameTextOrFragment = !vnode1.sel && vnode1.sel === vnode2.sel ? typeof vnode1.text === typeof vnode2.text : true;
    return isSameSel && isSameKey && isSameIs && isSameTextOrFragment;
  }
  function documentFragmentIsNotSupported() {
    throw new Error("The document fragment is not supported on this platform.");
  }
  function isElement2(api, vnode2) {
    return api.isElement(vnode2);
  }
  function isDocumentFragment2(api, vnode2) {
    return api.isDocumentFragment(vnode2);
  }
  function createKeyToOldIdx(children, beginIdx, endIdx) {
    var _a;
    const map = {};
    for (let i = beginIdx; i <= endIdx; ++i) {
      const key = (_a = children[i]) === null || _a === void 0 ? void 0 : _a.key;
      if (key !== void 0) {
        map[key] = i;
      }
    }
    return map;
  }
  var hooks = [
    "create",
    "update",
    "remove",
    "destroy",
    "pre",
    "post"
  ];
  function init(modules, domApi, options) {
    const cbs = {
      create: [],
      update: [],
      remove: [],
      destroy: [],
      pre: [],
      post: []
    };
    const api = domApi !== void 0 ? domApi : htmlDomApi;
    for (const hook of hooks) {
      for (const module of modules) {
        const currentHook = module[hook];
        if (currentHook !== void 0) {
          cbs[hook].push(currentHook);
        }
      }
    }
    function emptyNodeAt(elm) {
      const id = elm.id ? "#" + elm.id : "";
      const classes = elm.getAttribute("class");
      const c = classes ? "." + classes.split(" ").join(".") : "";
      return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], void 0, elm);
    }
    function emptyDocumentFragmentAt(frag) {
      return vnode(void 0, {}, [], void 0, frag);
    }
    function createRmCb(childElm, listeners) {
      return function rmCb() {
        if (--listeners === 0) {
          const parent = api.parentNode(childElm);
          if (parent !== null) {
            api.removeChild(parent, childElm);
          }
        }
      };
    }
    function createElm(vnode2, insertedVnodeQueue) {
      var _a, _b, _c, _d;
      let i;
      let data = vnode2.data;
      if (data !== void 0) {
        const init2 = (_a = data.hook) === null || _a === void 0 ? void 0 : _a.init;
        if (isDef(init2)) {
          init2(vnode2);
          data = vnode2.data;
        }
      }
      const children = vnode2.children;
      const sel = vnode2.sel;
      if (sel === "!") {
        if (isUndef(vnode2.text)) {
          vnode2.text = "";
        }
        vnode2.elm = api.createComment(vnode2.text);
      } else if (sel === "") {
        vnode2.elm = api.createTextNode(vnode2.text);
      } else if (sel !== void 0) {
        const hashIdx = sel.indexOf("#");
        const dotIdx = sel.indexOf(".", hashIdx);
        const hash = hashIdx > 0 ? hashIdx : sel.length;
        const dot = dotIdx > 0 ? dotIdx : sel.length;
        const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
        const elm = vnode2.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag, data) : api.createElement(tag, data);
        if (hash < dot)
          elm.setAttribute("id", sel.slice(hash + 1, dot));
        if (dotIdx > 0)
          elm.setAttribute("class", sel.slice(dot + 1).replace(/\./g, " "));
        for (i = 0; i < cbs.create.length; ++i)
          cbs.create[i](emptyNode, vnode2);
        if (primitive(vnode2.text) && (!array(children) || children.length === 0)) {
          api.appendChild(elm, api.createTextNode(vnode2.text));
        }
        if (array(children)) {
          for (i = 0; i < children.length; ++i) {
            const ch = children[i];
            if (ch != null) {
              api.appendChild(elm, createElm(ch, insertedVnodeQueue));
            }
          }
        }
        const hook = vnode2.data.hook;
        if (isDef(hook)) {
          (_b = hook.create) === null || _b === void 0 ? void 0 : _b.call(hook, emptyNode, vnode2);
          if (hook.insert) {
            insertedVnodeQueue.push(vnode2);
          }
        }
      } else if (((_c = options === null || options === void 0 ? void 0 : options.experimental) === null || _c === void 0 ? void 0 : _c.fragments) && vnode2.children) {
        vnode2.elm = ((_d = api.createDocumentFragment) !== null && _d !== void 0 ? _d : documentFragmentIsNotSupported)();
        for (i = 0; i < cbs.create.length; ++i)
          cbs.create[i](emptyNode, vnode2);
        for (i = 0; i < vnode2.children.length; ++i) {
          const ch = vnode2.children[i];
          if (ch != null) {
            api.appendChild(vnode2.elm, createElm(ch, insertedVnodeQueue));
          }
        }
      } else {
        vnode2.elm = api.createTextNode(vnode2.text);
      }
      return vnode2.elm;
    }
    function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
      for (; startIdx <= endIdx; ++startIdx) {
        const ch = vnodes[startIdx];
        if (ch != null) {
          api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
        }
      }
    }
    function invokeDestroyHook(vnode2) {
      var _a, _b;
      const data = vnode2.data;
      if (data !== void 0) {
        (_b = (_a = data === null || data === void 0 ? void 0 : data.hook) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a, vnode2);
        for (let i = 0; i < cbs.destroy.length; ++i)
          cbs.destroy[i](vnode2);
        if (vnode2.children !== void 0) {
          for (let j = 0; j < vnode2.children.length; ++j) {
            const child = vnode2.children[j];
            if (child != null && typeof child !== "string") {
              invokeDestroyHook(child);
            }
          }
        }
      }
    }
    function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
      var _a, _b;
      for (; startIdx <= endIdx; ++startIdx) {
        let listeners;
        let rm;
        const ch = vnodes[startIdx];
        if (ch != null) {
          if (isDef(ch.sel)) {
            invokeDestroyHook(ch);
            listeners = cbs.remove.length + 1;
            rm = createRmCb(ch.elm, listeners);
            for (let i = 0; i < cbs.remove.length; ++i)
              cbs.remove[i](ch, rm);
            const removeHook = (_b = (_a = ch === null || ch === void 0 ? void 0 : ch.data) === null || _a === void 0 ? void 0 : _a.hook) === null || _b === void 0 ? void 0 : _b.remove;
            if (isDef(removeHook)) {
              removeHook(ch, rm);
            } else {
              rm();
            }
          } else if (ch.children) {
            invokeDestroyHook(ch);
            removeVnodes(parentElm, ch.children, 0, ch.children.length - 1);
          } else {
            api.removeChild(parentElm, ch.elm);
          }
        }
      }
    }
    function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
      let oldStartIdx = 0;
      let newStartIdx = 0;
      let oldEndIdx = oldCh.length - 1;
      let oldStartVnode = oldCh[0];
      let oldEndVnode = oldCh[oldEndIdx];
      let newEndIdx = newCh.length - 1;
      let newStartVnode = newCh[0];
      let newEndVnode = newCh[newEndIdx];
      let oldKeyToIdx;
      let idxInOld;
      let elmToMove;
      let before;
      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (oldStartVnode == null) {
          oldStartVnode = oldCh[++oldStartIdx];
        } else if (oldEndVnode == null) {
          oldEndVnode = oldCh[--oldEndIdx];
        } else if (newStartVnode == null) {
          newStartVnode = newCh[++newStartIdx];
        } else if (newEndVnode == null) {
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldStartVnode, newStartVnode)) {
          patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
          oldStartVnode = oldCh[++oldStartIdx];
          newStartVnode = newCh[++newStartIdx];
        } else if (sameVnode(oldEndVnode, newEndVnode)) {
          patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
          oldEndVnode = oldCh[--oldEndIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldStartVnode, newEndVnode)) {
          patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
          api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
          oldStartVnode = oldCh[++oldStartIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldEndVnode, newStartVnode)) {
          patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
          api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
          oldEndVnode = oldCh[--oldEndIdx];
          newStartVnode = newCh[++newStartIdx];
        } else {
          if (oldKeyToIdx === void 0) {
            oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
          }
          idxInOld = oldKeyToIdx[newStartVnode.key];
          if (isUndef(idxInOld)) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
            newStartVnode = newCh[++newStartIdx];
          } else if (isUndef(oldKeyToIdx[newEndVnode.key])) {
            api.insertBefore(parentElm, createElm(newEndVnode, insertedVnodeQueue), api.nextSibling(oldEndVnode.elm));
            newEndVnode = newCh[--newEndIdx];
          } else {
            elmToMove = oldCh[idxInOld];
            if (elmToMove.sel !== newStartVnode.sel) {
              api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
            } else {
              patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
              oldCh[idxInOld] = void 0;
              api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
            }
            newStartVnode = newCh[++newStartIdx];
          }
        }
      }
      if (newStartIdx <= newEndIdx) {
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
        addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
      }
      if (oldStartIdx <= oldEndIdx) {
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
      }
    }
    function patchVnode(oldVnode, vnode2, insertedVnodeQueue) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const hook = (_a = vnode2.data) === null || _a === void 0 ? void 0 : _a.hook;
      (_b = hook === null || hook === void 0 ? void 0 : hook.prepatch) === null || _b === void 0 ? void 0 : _b.call(hook, oldVnode, vnode2);
      const elm = vnode2.elm = oldVnode.elm;
      if (oldVnode === vnode2)
        return;
      if (vnode2.data !== void 0 || isDef(vnode2.text) && vnode2.text !== oldVnode.text) {
        (_c = vnode2.data) !== null && _c !== void 0 ? _c : vnode2.data = {};
        (_d = oldVnode.data) !== null && _d !== void 0 ? _d : oldVnode.data = {};
        for (let i = 0; i < cbs.update.length; ++i)
          cbs.update[i](oldVnode, vnode2);
        (_g = (_f = (_e = vnode2.data) === null || _e === void 0 ? void 0 : _e.hook) === null || _f === void 0 ? void 0 : _f.update) === null || _g === void 0 ? void 0 : _g.call(_f, oldVnode, vnode2);
      }
      const oldCh = oldVnode.children;
      const ch = vnode2.children;
      if (isUndef(vnode2.text)) {
        if (isDef(oldCh) && isDef(ch)) {
          if (oldCh !== ch)
            updateChildren(elm, oldCh, ch, insertedVnodeQueue);
        } else if (isDef(ch)) {
          if (isDef(oldVnode.text))
            api.setTextContent(elm, "");
          addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
        } else if (isDef(oldCh)) {
          removeVnodes(elm, oldCh, 0, oldCh.length - 1);
        } else if (isDef(oldVnode.text)) {
          api.setTextContent(elm, "");
        }
      } else if (oldVnode.text !== vnode2.text) {
        if (isDef(oldCh)) {
          removeVnodes(elm, oldCh, 0, oldCh.length - 1);
        }
        api.setTextContent(elm, vnode2.text);
      }
      (_h = hook === null || hook === void 0 ? void 0 : hook.postpatch) === null || _h === void 0 ? void 0 : _h.call(hook, oldVnode, vnode2);
    }
    return function patch2(oldVnode, vnode2) {
      let i, elm, parent;
      const insertedVnodeQueue = [];
      for (i = 0; i < cbs.pre.length; ++i)
        cbs.pre[i]();
      if (isElement2(api, oldVnode)) {
        oldVnode = emptyNodeAt(oldVnode);
      } else if (isDocumentFragment2(api, oldVnode)) {
        oldVnode = emptyDocumentFragmentAt(oldVnode);
      }
      if (sameVnode(oldVnode, vnode2)) {
        patchVnode(oldVnode, vnode2, insertedVnodeQueue);
      } else {
        elm = oldVnode.elm;
        parent = api.parentNode(elm);
        createElm(vnode2, insertedVnodeQueue);
        if (parent !== null) {
          api.insertBefore(parent, vnode2.elm, api.nextSibling(elm));
          removeVnodes(parent, [oldVnode], 0, 0);
        }
      }
      for (i = 0; i < insertedVnodeQueue.length; ++i) {
        insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
      }
      for (i = 0; i < cbs.post.length; ++i)
        cbs.post[i]();
      return vnode2;
    };
  }

  // ../../node_modules/snabbdom/build/modules/class.js
  function updateClass(oldVnode, vnode2) {
    let cur;
    let name;
    const elm = vnode2.elm;
    let oldClass = oldVnode.data.class;
    let klass = vnode2.data.class;
    if (!oldClass && !klass)
      return;
    if (oldClass === klass)
      return;
    oldClass = oldClass || {};
    klass = klass || {};
    for (name in oldClass) {
      if (oldClass[name] && !Object.prototype.hasOwnProperty.call(klass, name)) {
        elm.classList.remove(name);
      }
    }
    for (name in klass) {
      cur = klass[name];
      if (cur !== oldClass[name]) {
        elm.classList[cur ? "add" : "remove"](name);
      }
    }
  }
  var classModule = { create: updateClass, update: updateClass };

  // ../../node_modules/snabbdom/build/modules/props.js
  function updateProps(oldVnode, vnode2) {
    let key;
    let cur;
    let old;
    const elm = vnode2.elm;
    let oldProps = oldVnode.data.props;
    let props = vnode2.data.props;
    if (!oldProps && !props)
      return;
    if (oldProps === props)
      return;
    oldProps = oldProps || {};
    props = props || {};
    for (key in props) {
      cur = props[key];
      old = oldProps[key];
      if (old !== cur && (key !== "value" || elm[key] !== cur)) {
        elm[key] = cur;
      }
    }
  }
  var propsModule = { create: updateProps, update: updateProps };

  // ../../node_modules/snabbdom/build/modules/attributes.js
  var xlinkNS = "http://www.w3.org/1999/xlink";
  var xmlnsNS = "http://www.w3.org/2000/xmlns/";
  var xmlNS = "http://www.w3.org/XML/1998/namespace";
  var colonChar = 58;
  var xChar = 120;
  var mChar = 109;
  function updateAttrs(oldVnode, vnode2) {
    let key;
    const elm = vnode2.elm;
    let oldAttrs = oldVnode.data.attrs;
    let attrs = vnode2.data.attrs;
    if (!oldAttrs && !attrs)
      return;
    if (oldAttrs === attrs)
      return;
    oldAttrs = oldAttrs || {};
    attrs = attrs || {};
    for (key in attrs) {
      const cur = attrs[key];
      const old = oldAttrs[key];
      if (old !== cur) {
        if (cur === true) {
          elm.setAttribute(key, "");
        } else if (cur === false) {
          elm.removeAttribute(key);
        } else {
          if (key.charCodeAt(0) !== xChar) {
            elm.setAttribute(key, cur);
          } else if (key.charCodeAt(3) === colonChar) {
            elm.setAttributeNS(xmlNS, key, cur);
          } else if (key.charCodeAt(5) === colonChar) {
            key.charCodeAt(1) === mChar ? elm.setAttributeNS(xmlnsNS, key, cur) : elm.setAttributeNS(xlinkNS, key, cur);
          } else {
            elm.setAttribute(key, cur);
          }
        }
      }
    }
    for (key in oldAttrs) {
      if (!(key in attrs)) {
        elm.removeAttribute(key);
      }
    }
  }
  var attributesModule = {
    create: updateAttrs,
    update: updateAttrs
  };

  // ../../node_modules/snabbdom/build/modules/style.js
  var raf = typeof (window === null || window === void 0 ? void 0 : window.requestAnimationFrame) === "function" ? window.requestAnimationFrame.bind(window) : setTimeout;
  var nextFrame = function(fn) {
    raf(function() {
      raf(fn);
    });
  };
  var reflowForced = false;
  function setNextFrame(obj, prop, val) {
    nextFrame(function() {
      obj[prop] = val;
    });
  }
  function updateStyle(oldVnode, vnode2) {
    let cur;
    let name;
    const elm = vnode2.elm;
    let oldStyle = oldVnode.data.style;
    let style = vnode2.data.style;
    if (!oldStyle && !style)
      return;
    if (oldStyle === style)
      return;
    oldStyle = oldStyle || {};
    style = style || {};
    const oldHasDel = "delayed" in oldStyle;
    for (name in oldStyle) {
      if (!(name in style)) {
        if (name[0] === "-" && name[1] === "-") {
          elm.style.removeProperty(name);
        } else {
          elm.style[name] = "";
        }
      }
    }
    for (name in style) {
      cur = style[name];
      if (name === "delayed" && style.delayed) {
        for (const name2 in style.delayed) {
          cur = style.delayed[name2];
          if (!oldHasDel || cur !== oldStyle.delayed[name2]) {
            setNextFrame(elm.style, name2, cur);
          }
        }
      } else if (name !== "remove" && cur !== oldStyle[name]) {
        if (name[0] === "-" && name[1] === "-") {
          elm.style.setProperty(name, cur);
        } else {
          elm.style[name] = cur;
        }
      }
    }
  }
  function applyDestroyStyle(vnode2) {
    let style;
    let name;
    const elm = vnode2.elm;
    const s = vnode2.data.style;
    if (!s || !(style = s.destroy))
      return;
    for (name in style) {
      elm.style[name] = style[name];
    }
  }
  function applyRemoveStyle(vnode2, rm) {
    const s = vnode2.data.style;
    if (!s || !s.remove) {
      rm();
      return;
    }
    if (!reflowForced) {
      vnode2.elm.offsetLeft;
      reflowForced = true;
    }
    let name;
    const elm = vnode2.elm;
    let i = 0;
    const style = s.remove;
    let amount = 0;
    const applied = [];
    for (name in style) {
      applied.push(name);
      elm.style[name] = style[name];
    }
    const compStyle = getComputedStyle(elm);
    const props = compStyle["transition-property"].split(", ");
    for (; i < props.length; ++i) {
      if (applied.indexOf(props[i]) !== -1)
        amount++;
    }
    elm.addEventListener("transitionend", function(ev) {
      if (ev.target === elm)
        --amount;
      if (amount === 0)
        rm();
    });
  }
  function forceReflow() {
    reflowForced = false;
  }
  var styleModule = {
    pre: forceReflow,
    create: updateStyle,
    update: updateStyle,
    destroy: applyDestroyStyle,
    remove: applyRemoveStyle
  };

  // ../../node_modules/snabbdom/build/modules/eventlisteners.js
  function invokeHandler(handler, vnode2, event) {
    if (typeof handler === "function") {
      handler.call(vnode2, event, vnode2);
    } else if (typeof handler === "object") {
      for (let i = 0; i < handler.length; i++) {
        invokeHandler(handler[i], vnode2, event);
      }
    }
  }
  function handleEvent(event, vnode2) {
    const name = event.type;
    const on = vnode2.data.on;
    if (on && on[name]) {
      invokeHandler(on[name], vnode2, event);
    }
  }
  function createListener() {
    return function handler(event) {
      handleEvent(event, handler.vnode);
    };
  }
  function updateEventListeners(oldVnode, vnode2) {
    const oldOn = oldVnode.data.on;
    const oldListener = oldVnode.listener;
    const oldElm = oldVnode.elm;
    const on = vnode2 && vnode2.data.on;
    const elm = vnode2 && vnode2.elm;
    let name;
    if (oldOn === on) {
      return;
    }
    if (oldOn && oldListener) {
      if (!on) {
        for (name in oldOn) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      } else {
        for (name in oldOn) {
          if (!on[name]) {
            oldElm.removeEventListener(name, oldListener, false);
          }
        }
      }
    }
    if (on) {
      const listener = vnode2.listener = oldVnode.listener || createListener();
      listener.vnode = vnode2;
      if (!oldOn) {
        for (name in on) {
          elm.addEventListener(name, listener, false);
        }
      } else {
        for (name in on) {
          if (!oldOn[name]) {
            elm.addEventListener(name, listener, false);
          }
        }
      }
    }
  }
  var eventListenersModule = {
    create: updateEventListeners,
    update: updateEventListeners,
    destroy: updateEventListeners
  };

  // ../rettangoli-fe/src/createWebPatch.js
  var createWebPatch = () => {
    return init([
      classModule,
      propsModule,
      attributesModule,
      styleModule,
      eventListenersModule
    ]);
  };
  var createWebPatch_default = createWebPatch;

  // ../../node_modules/snabbdom/build/h.js
  function addNS(data, children, sel) {
    data.ns = "http://www.w3.org/2000/svg";
    if (sel !== "foreignObject" && children !== void 0) {
      for (let i = 0; i < children.length; ++i) {
        const child = children[i];
        if (typeof child === "string")
          continue;
        const childData = child.data;
        if (childData !== void 0) {
          addNS(childData, child.children, child.sel);
        }
      }
    }
  }
  function h(sel, b, c) {
    let data = {};
    let children;
    let text;
    let i;
    if (c !== void 0) {
      if (b !== null) {
        data = b;
      }
      if (array(c)) {
        children = c;
      } else if (primitive(c)) {
        text = c.toString();
      } else if (c && c.sel) {
        children = [c];
      }
    } else if (b !== void 0 && b !== null) {
      if (array(b)) {
        children = b;
      } else if (primitive(b)) {
        text = b.toString();
      } else if (b && b.sel) {
        children = [b];
      } else {
        data = b;
      }
    }
    if (children !== void 0) {
      for (i = 0; i < children.length; ++i) {
        if (primitive(children[i]))
          children[i] = vnode(void 0, void 0, void 0, children[i], void 0);
      }
    }
    if (sel.startsWith("svg") && (sel.length === 3 || sel[3] === "." || sel[3] === "#")) {
      addNS(data, children, sel);
    }
    return vnode(sel, data, children, text, void 0);
  }

  // ../rettangoli-fe/src/createComponent.js
  var patch = createWebPatch_default();
  var createComponent = ({ handlers, methods, constants, schema, view, store }, deps2) => {
    if (!view) {
      throw new Error("view is not defined");
    }
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      throw new Error("schema is required. Define component metadata in .schema.yaml.");
    }
    const resolvedSchema = schema;
    const { template, refs, styles: styles9 } = view;
    validateSchemaContract({
      schema: resolvedSchema,
      methodExports: Object.keys(methods || {})
    });
    const elementName = resolvedSchema.componentName;
    const propsSchema = resolvedSchema.propsSchema;
    const propsSchemaKeys = propsSchema?.properties ? [...new Set(Object.keys(propsSchema.properties).map((propKey) => toCamelCase(propKey)))] : [];
    return createWebComponentClass({
      elementName,
      propsSchema,
      propsSchemaKeys,
      template,
      refs,
      styles: styles9,
      handlers,
      methods,
      constants,
      store,
      patch,
      h,
      deps: deps2
    });
  };
  var createComponent_default = createComponent;

  // src/deps/createGlobalUI.js
  var createGlobalUI = (globalUIElement) => {
    let listeners = {};
    return {
      /**
       * Registers a one-time event listener for the specified event.
       * The listener will be automatically removed after the first event.
       *
       * @param {string} event - The event name to listen for
       * @param {Function} callback - The callback function to execute
       * @returns {void}
       */
      once: (event, callback) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        const onceCallback = (...args) => {
          callback(...args);
          listeners[event] = listeners[event].filter((cb) => cb !== onceCallback);
        };
        listeners[event].push(onceCallback);
      },
      /**
       * Emits an event to all registered listeners for the specified event type.
       *
       * @param {string} event - The event name to emit
       * @param {...any} args - Arguments to pass to the event listeners
       * @returns {void}
       */
      emit: (event, ...args) => {
        if (listeners[event]) {
          listeners[event].forEach((callback) => {
            callback(...args);
          });
        }
      },
      /**
       * Shows an alert dialog with the specified options.
       * The alert displays a message with a single OK button.
       *
       * @param {Object} options - Alert configuration options
       * @param {string} options.message - The alert message (required)
       * @param {string} [options.title] - Optional alert title
       * @param {('info'|'warning'|'error')} [options.status] - Optional status type
       * @param {string} [options.confirmText] - Text for the confirm button (default: "OK")
       * @returns {Promise<void>} Promise that resolves when the alert is closed
       * @throws {Error} If globalUIElement is not initialized
       */
      showAlert: async (options) => {
        if (!globalUIElement) {
          throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
        }
        globalUIElement.transformedHandlers.handleShowAlert(options);
      },
      /**
       * Shows a confirmation dialog with the specified options.
       * The dialog displays a message with confirm and cancel buttons.
       *
       * @param {Object} options - Confirmation dialog configuration options
       * @param {string} options.message - The confirmation message (required)
       * @param {string} [options.title] - Optional dialog title
       * @param {('info'|'warning'|'error')} [options.status] - Optional status type
       * @param {string} [options.confirmText] - Text for the confirm button (default: "Yes")
       * @param {string} [options.cancelText] - Text for the cancel button (default: "Cancel")
       * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
       * @throws {Error} If globalUIElement is not initialized
       */
      showConfirm: async (options) => {
        if (!globalUIElement) {
          throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
        }
        return globalUIElement.transformedHandlers.handleShowConfirm(options);
      },
      /**
       * Shows a dropdown menu at the specified position with the given items.
       * The dropdown can contain various item types including labels, items, and separators.
       *
       * @param {Object} options - Dropdown menu configuration options
       * @param {Array<Object>} options.items - Array of dropdown menu items (required)
       * @param {number} options.x - X coordinate position (required)
       * @param {number} options.y - Y coordinate position (required)
       * @param {string} [options.place] - Dropdown menu place token (default: "bs")
       * @returns {Promise<Object|null>} Promise that resolves with clicked item info or null if closed without selection
       * @returns {Object} [result.index] - Index of the clicked item
       * @returns {Object} [result.item] - The clicked item object
       * @throws {Error} If globalUIElement is not initialized
       */
      showDropdownMenu: async (options) => {
        if (!globalUIElement) {
          throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
        }
        return globalUIElement.transformedHandlers.handleShowDropdownMenu(options);
      },
      /**
       * General-purpose function to close all currently open UI components.
       * This includes dialogs, popovers, tooltips, selects, dropdown menus, and any other floating UI elements.
       * Useful for programmatically cleaning up the entire UI surface.
       *
       * @returns {Promise<void>} Promise that resolves when all UI components are closed
       * @throws {Error} If globalUIElement is not initialized
       */
      closeAll: async () => {
        if (!globalUIElement) {
          throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
        }
        return globalUIElement.transformedHandlers.handleCloseAll();
      }
    };
  };
  var createGlobalUI_default = createGlobalUI;

  // src/setup.js
  var globalUI = createGlobalUI_default();
  var componentDependencies = {
    globalUI
  };
  var deps = {
    components: componentDependencies
  };

  // .temp/dynamicImport.js
  var imports = {
    "components": {
      "accordionItem": {
        "handlers": accordionItem_handlers_exports,
        "schema": accordionItem_schema_default,
        "store": accordionItem_store_exports,
        "view": accordionItem_view_default
      },
      "breadcrumb": {
        "handlers": breadcrumb_handlers_exports,
        "schema": breadcrumb_schema_default,
        "store": breadcrumb_store_exports,
        "view": breadcrumb_view_default
      },
      "dropdownMenu": {
        "handlers": dropdownMenu_handlers_exports,
        "schema": dropdownMenu_schema_default,
        "store": dropdownMenu_store_exports,
        "view": dropdownMenu_view_default
      },
      "form": {
        "handlers": form_handlers_exports,
        "methods": form_methods_exports,
        "schema": form_schema_default,
        "store": form_store_exports,
        "view": form_view_default
      },
      "globalUi": {
        "handlers": globalUi_handlers_exports,
        "schema": globalUi_schema_default,
        "store": globalUi_store_exports,
        "view": globalUi_view_default
      },
      "navbar": {
        "handlers": navbar_handlers_exports,
        "schema": navbar_schema_default,
        "store": navbar_store_exports,
        "view": navbar_view_default
      },
      "pageOutline": {
        "handlers": pageOutline_handlers_exports,
        "schema": pageOutline_schema_default,
        "store": pageOutline_store_exports,
        "view": pageOutline_view_default
      },
      "popoverInput": {
        "handlers": popoverInput_handlers_exports,
        "schema": popoverInput_schema_default,
        "store": popoverInput_store_exports,
        "view": popoverInput_view_default
      },
      "select": {
        "handlers": select_handlers_exports,
        "schema": select_schema_default,
        "store": select_store_exports,
        "view": select_view_default
      },
      "sidebar": {
        "handlers": sidebar_handlers_exports,
        "schema": sidebar_schema_default,
        "store": sidebar_store_exports,
        "view": sidebar_view_default
      },
      "sliderInput": {
        "handlers": sliderInput_handlers_exports,
        "schema": sliderInput_schema_default,
        "store": sliderInput_store_exports,
        "view": sliderInput_view_default
      },
      "table": {
        "handlers": table_handlers_exports,
        "schema": table_schema_default,
        "store": table_store_exports,
        "view": table_view_default
      },
      "tabs": {
        "handlers": tabs_handlers_exports,
        "schema": tabs_schema_default,
        "store": tabs_store_exports,
        "view": tabs_view_default
      },
      "tooltip": {
        "handlers": tooltip_handlers_exports,
        "schema": tooltip_schema_default,
        "store": tooltip_store_exports,
        "view": tooltip_view_default
      },
      "waveform": {
        "handlers": waveform_handlers_exports,
        "schema": waveform_schema_default,
        "store": waveform_store_exports,
        "view": waveform_view_default
      }
    }
  };
  Object.keys(imports).forEach((category) => {
    Object.keys(imports[category]).forEach((component) => {
      const componentConfig = imports[category][component];
      const webComponent = createComponent_default({ ...componentConfig }, deps[category]);
      const elementName = componentConfig.schema?.componentName;
      if (!elementName) {
        throw new Error(`[Build] Missing schema.componentName for ${category}/${component}. Define it in .schema.yaml.`);
      }
      customElements.define(elementName, webComponent);
    });
  });

  // src/entry-iife-ui.js
  customElements.define("rtgl-button", button_default({}));
  customElements.define("rtgl-view", view_default({}));
  customElements.define("rtgl-text", text_default({}));
  customElements.define("rtgl-image", image_default({}));
  customElements.define("rtgl-svg", svg_default({}));
  customElements.define("rtgl-input", input_default({}));
  customElements.define("rtgl-input-date", input_date_default({}));
  customElements.define("rtgl-input-time", input_time_default({}));
  customElements.define("rtgl-input-datetime", input_datetime_default({}));
  customElements.define("rtgl-input-number", input_number_default({}));
  customElements.define("rtgl-textarea", textarea_default({}));
  customElements.define("rtgl-color-picker", colorPicker_default({}));
  customElements.define("rtgl-slider", slider_default({}));
  customElements.define("rtgl-checkbox", checkbox_default({}));
  customElements.define("rtgl-dialog", dialog_default({}));
  customElements.define("rtgl-popover", popover_default({}));
})();
//# sourceMappingURL=main.js.map
