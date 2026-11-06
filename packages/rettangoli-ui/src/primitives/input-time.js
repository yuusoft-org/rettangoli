import { createForcedTypeInputBase } from "./input-forced-type.js";

class RettangoliInputTimeElement extends createForcedTypeInputBase("time") {}

export default ({ render, html }) => {
  return RettangoliInputTimeElement;
};
