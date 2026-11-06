import { createForcedTypeInputBase } from "./input-forced-type.js";

class RettangoliInputDateElement extends createForcedTypeInputBase("date") {}

export default ({ render, html }) => {
  return RettangoliInputDateElement;
};
