import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "jempl";
import { load as loadYaml } from "js-yaml";

import { createComponent, createTuiRuntime } from "../../src/index.js";
import { deps } from "./setup.js";
import * as handlers from "./components/dialogPlayground/dialogPlayground.handlers.js";
import * as store from "./components/dialogPlayground/dialogPlayground.store.js";

const componentDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "components/dialogPlayground",
);

const schema = loadYaml(readFileSync(path.join(componentDir, "dialogPlayground.schema.yaml"), "utf8"));
const view = loadYaml(readFileSync(path.join(componentDir, "dialogPlayground.view.yaml"), "utf8"));
view.template = parse(view.template);

const DialogPlayground = createComponent({
  schema,
  view,
  handlers,
  store,
  methods: {},
  constants: {},
}, deps.components);

const runtime = createTuiRuntime({
  componentRegistry: {
    [schema.componentName]: DialogPlayground,
  },
});

await runtime.start({
  componentName: schema.componentName,
  quitKeys: ["q"],
  footer: "[q] quit  [1] info  [2] confirm  [3] single input  [4] single textarea  [5] multi-field form",
});
