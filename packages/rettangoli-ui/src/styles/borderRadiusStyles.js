import { css } from '../common.js';

export default css`
:host([br="xs"]) {
    border-radius: var(--border-radius-xs);
    overflow: hidden;
}
:host([br="s"]) {
    border-radius: var(--border-radius-s);
    overflow: hidden;
}
:host([br="m"]) {
  border-radius: var(--border-radius-m);
  overflow: hidden;
}
:host([br="l"]) {
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}
:host([br="xl"]) {
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}
:host([br="f"]) {
  border-radius: 50%;
  overflow: hidden;
}
`;