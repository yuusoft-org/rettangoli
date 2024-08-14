import { css } from '../common.js';

export default css`
:host([bw="xs"]) {
    border-width: var(--border-width-xs);
}
:host([bw="s"]) {
    border-width: var(--border-width-s);
}
:host([bw="m"]) {
    border-width: var(--border-width-m);
}
:host([bw="l"]) {
    border-width: var(--border-width-l);
}
:host([bw="xl"]) {
    border-width: var(--border-width-xl);
}

:host([bwt="xs"]) {
    border-top-width: var(--border-width-xs);
}
:host([bwt="s"]) {
    border-top-width: var(--border-width-s);
}
:host([bwt="m"]) {
    border-top-width: var(--border-width-m);
}
:host([bwt="l"]) {
    border-top-width: var(--border-width-l);
}
:host([bwt="xl"]) {
    border-top-width: var(--border-width-xl);
}

:host([bwr="xs"]) {
    border-right-width: var(--border-width-xs);
}
:host([bwr="s"]) {
    border-right-width: var(--border-width-s);
}
:host([bwr="m"]) {
    border-right-width: var(--border-width-m);
}
:host([bwr="l"]) {
    border-right-width: var(--border-width-l);
}
:host([bwr="xl"]) {
    border-right-width: var(--border-width-xl);
}

:host([bwb="xs"]) {
    border-bottom-width: var(--border-width-xs);
}
:host([bwb="s"]) {
    border-bottom-width: var(--border-width-s);
}
:host([bwb="m"]) {
    border-bottom-width: var(--border-width-m);
}
:host([bwb="l"]) {
    border-bottom-width: var(--border-width-l);
}
:host([bwb="xl"]) {
    border-bottom-width: var(--border-width-xl);
}

:host([bwl="xs"]) {
    border-left-width: var(--border-width-xs);
}
:host([bwl="s"]) {
    border-left-width: var(--border-width-s);
}
:host([bwl="m"]) {
    border-left-width: var(--border-width-m);
}
:host([bwl="l"]) {
    border-left-width: var(--border-width-l);
}
:host([bwl="xl"]) {
    border-left-width: var(--border-width-xl);
}

:host([bc="p"]) {
    border-color: var(--color-primary);
  }
  :host([bc="pc"]) {
    border-color: var(--color-primary-container);
  }
  :host([bc="s"]) {
    border-color: var(--color-secondary);
  }
  :host([bc="sc"]) {
    border-color: var(--color-secondary-container);
  }
  :host([bc="e"]) {
    border-color: var(--color-error);
  }
  :host([bc="ec"]) {
    border-color: var(--color-error-container);
  }
  :host([bc="su"]) {
    border-color: var(--color-surface);
  }
  :host([bc="sucl"]) {
    border-color: var(--color-surface-container-low);
  }
  :host([bc="suc"]) {
    border-color: var(--color-surface-container);
  }
  :host([bc="such"]) {
    border-color: var(--color-surface-container-high);
  }
  :host([bc="isu"]) {
    border-color: var(--color-inverse-surface);
  }
  :host([bc="o"]) {
    border-color: var(--color-outline);
  }
  :host([bc="ov"]) {
    border-color: var(--color-outline-variant);
  }

  :host([h-bc="p"]:hover) {
    border-color: var(--color-primary);
  }
  :host([h-bc="pc"]:hover) {
    border-color: var(--color-primary-container);
  }
  :host([h-bc="s"]:hover) {
    border-color: var(--color-secondary);
  }
  :host([h-bc="sc"]:hover) {
    border-color: var(--color-secondary-container);
  }
  :host([h-bc="e"]:hover) {
    border-color: var(--color-error);
  }
  :host([h-bc="ec"]:hover) {
    border-color: var(--color-error-container);
  }
  :host([h-bc="su"]:hover) {
    border-color: var(--color-surface);
  }
  :host([h-bc="sucl"]:hover) {
    border-color: var(--color-surface-container-low);
  }
  :host([h-bc="suc"]:hover) {
    border-color: var(--color-surface-container);
  }
  :host([h-bc="such"]:hover) {
    border-color: var(--color-surface-container-high);
  }
  :host([h-bc="isu"]:hover) {
    border-color: var(--color-inverse-surface);
  }
`;