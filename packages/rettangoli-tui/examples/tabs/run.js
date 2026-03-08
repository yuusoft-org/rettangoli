import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "jempl";
import { load as loadYaml } from "js-yaml";

import { createComponent, createTuiRuntime } from "../../src/index.js";
import { deps } from "./setup.js";
import * as handlers from "./components/tabsPlayground/tabsPlayground.handlers.js";
import * as store from "./components/tabsPlayground/tabsPlayground.store.js";

const componentDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "components/tabsPlayground",
);

const schema = loadYaml(readFileSync(path.join(componentDir, "tabsPlayground.schema.yaml"), "utf8"));
const view = loadYaml(readFileSync(path.join(componentDir, "tabsPlayground.view.yaml"), "utf8"));
view.template = parse(view.template);

const TabsPlayground = createComponent({
  schema,
  view,
  handlers,
  store,
  methods: {},
  constants: {},
}, deps.components);

const runtime = createTuiRuntime({
  componentRegistry: {
    [schema.componentName]: TabsPlayground,
  },
});

await runtime.start({
  componentName: schema.componentName,
  quitKeys: ["q"],
  footer: "[q] quit  [1..5] primary tab  [tab] cycle primary  [h/l] section  [r] reset",
});
