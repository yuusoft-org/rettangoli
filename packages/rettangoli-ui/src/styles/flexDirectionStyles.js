
import { css } from '../common.js'

export default css`
  :host([d="h"]) slot {
    flex-direction: row;
  }
  :host([d="v"]) slot {
    flex-direction: column;
  }
  :host([d="h"][ah="s"]) slot {
    justify-content: flex-start;
  }
  :host([d="h"][ah="c"]) slot {
    justify-content: center;
  }
  :host([d="h"][ah="e"]) slot {
    justify-content: flex-end;
  }
  :host([d="h"][av="s"]) slot {
    align-items: flex-start;
  }
  :host([d="h"][av="c"]) slot {
    align-items: center;
  }
  :host([d="h"][av="e"]) slot {
    align-items: flex-end;
  }
  :host([d="v"][ah="s"]) slot {
    align-items: flex-start;
  }
  :host([d="v"][ah="c"]) slot {
    align-items: center;
  }
  :host([d="v"][ah="e"]) slot {
    align-items: flex-end;
  }
  :host([d="v"][av="s"]) slot {
    justify-content: flex-start;
  }
  :host([d="v"][av="c"]) slot {
    justify-content: center;
  }
  :host([d="v"][av="e"]) slot {
    justify-content: flex-end;
  }
`