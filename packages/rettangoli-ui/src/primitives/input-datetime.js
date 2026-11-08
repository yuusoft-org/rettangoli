import { createForcedTypeInputBase } from "./input-forced-type.js";

class RettangoliInputDateTimeElement extends createForcedTypeInputBase("datetime-local") {}

export default ({ render, html }) => {
  return RettangoliInputDateTimeElement;
};
