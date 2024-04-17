import { css } from '../common.js';

export default css`
:host([br="xs"]) {
    border-radius: 1%;
    overflow: hidden;
}
:host([br="s"]) {
    border-radius: 2%;
    overflow: hidden;
}
:host([br="m"]) {
  border-radius: 5%;
  overflow: hidden;
}
:host([br="l"]) {
  border-radius: 10%;
  overflow: hidden;
}
:host([br="xl"]) {
  border-radius: 20%;
  overflow: hidden;
}
:host([br="f"]) {
  border-radius: 50%;
  overflow: hidden;
}
`;