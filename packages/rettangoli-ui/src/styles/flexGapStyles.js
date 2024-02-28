
import { css } from '../common.js'

export default css`
:host([g="xs"]) slot {
  gap: var(--spacing-xs);
}
:host([g="s"]) slot {
  gap: var(--spacing-s);
}
:host([g="m"]) slot {
  gap: var(--spacing-m);
}
:host([g="l"]) slot {
  gap: var(--spacing-l);
}
:host([g="xl"]) slot {
  gap: var(--spacing-xl);
}
:host([gv="xs"]) slot {
  row-gap: var(--spacing-xs);
}
:host([gv="s"]) slot {
  row-gap: var(--spacing-s);
}
:host([gv="m"]) slot {
  row-gap: var(--spacing-m);
}
:host([gv="l"]) slot {
  row-gap: var(--spacing-l);
}
:host([gv="xl"]) slot {
  row-gap: var(--spacing-xl);
}
:host([gh="xs"]) slot {
  column-gap: var(--spacing-xs);
}
:host([gh="s"]) slot {
  column-gap: var(--spacing-s);
}
:host([gh="m"]) slot {
  column-gap: var(--spacing-m);
}
:host([gh="l"]) slot {
  column-gap: var(--spacing-l);
}
:host([gh="xl"]) slot {
  column-gap: var(--spacing-xl);
}
`;