
import { css } from '../common.js'

export default css`
:host([g="xs"]) {
  gap: var(--spacing-xs);
}
:host([g="s"]) {
  gap: var(--spacing-s);
}
:host([g="m"]) {
  gap: var(--spacing-m);
}
:host([g="l"]) {
  gap: var(--spacing-l);
}
:host([g="xl"]) {
  gap: var(--spacing-xl);
}
:host([gv="xs"]) {
  row-gap: var(--spacing-xs);
}
:host([gv="s"]) {
  row-gap: var(--spacing-s);
}
:host([gv="m"]) {
  row-gap: var(--spacing-m);
}
:host([gv="l"]) {
  row-gap: var(--spacing-l);
}
:host([gv="xl"]) {
  row-gap: var(--spacing-xl);
}
:host([gh="xs"]) {
  column-gap: var(--spacing-xs);
}
:host([gh="s"]) {
  column-gap: var(--spacing-s);
}
:host([gh="m"]) {
  column-gap: var(--spacing-m);
}
:host([gh="l"]) {
  column-gap: var(--spacing-l);
}
:host([gh="xl"]) {
  column-gap: var(--spacing-xl);
}
`;