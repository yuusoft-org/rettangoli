import { Liquid } from "liquidjs";
import { deriveAnchorId } from "../section-page-key.js";
import { removeExtension } from "../spec-files.js";

// The Liquid engine for VT's spec, overview and report templates (output is not escaped).
export function createLiquidEngine() {
  const engine = new Liquid();
  // Slug-safe ids for URLs and anchors.
  engine.registerFilter("slug", (value, fallbackValue) => deriveAnchorId(value, fallbackValue));
  engine.registerFilter("remove_ext", (value) => {
    if (typeof value !== "string") return "";
    return removeExtension(value);
  });
  return engine;
}
