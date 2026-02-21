import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "jempl";
import { load as loadYaml } from "js-yaml";

import { createComponent, createTuiRuntime } from "../../src/index.js";
import { deps } from "./setup.js";
import * as handlers from "./components/showcase/showcase.handlers.js";
import * as store from "./components/showcase/showcase.store.js";

const componentDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "components/showcase",
);

const schema = loadYaml(readFileSync(path.join(componentDir, "showcase.schema.yaml"), "utf8"));
const view = loadYaml(readFileSync(path.join(componentDir, "showcase.view.yaml"), "utf8"));
view.template = parse(view.template);

const Showcase = createComponent({
  schema,
  view,
  handlers,
  store,
  methods: {},
  constants: {},
}, deps.components);

const runtime = createTuiRuntime({
  componentRegistry: {
    [schema.componentName]: Showcase,
  },
});

const isStaticMode = process.argv.includes("--static");

if (isStaticMode) {
  const output = runtime.render({
    componentName: schema.componentName,
    props: {
      environment: "demo",
    },
  });
  console.log(output);
  process.exit(0);
}

await runtime.start({
  componentName: schema.componentName,
  props: {
    environment: "demo",
  },
  quitKeys: ["q"],
  footer: "[q] quit  [s] global full-screen selector  [f] global centered selector  [d/t] title dialog  [e] edit",
});
