import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "jempl";
import { load as loadYaml } from "js-yaml";

import { createComponent, createTuiRuntime } from "../../src/index.js";
import { deps } from "./setup.js";
import * as handlers from "./components/dashboard/dashboard.handlers.js";
import * as store from "./components/dashboard/dashboard.store.js";

const componentDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "components/dashboard",
);

const schema = loadYaml(readFileSync(path.join(componentDir, "dashboard.schema.yaml"), "utf8"));
const view = loadYaml(readFileSync(path.join(componentDir, "dashboard.view.yaml"), "utf8"));
view.template = parse(view.template);

const Dashboard = createComponent({
  schema,
  view,
  handlers,
  store,
  methods: {},
  constants: {},
}, deps.components);

const runtime = createTuiRuntime({
  componentRegistry: {
    [schema.componentName]: Dashboard,
  },
});

const isStaticMode = process.argv.includes("--static");

if (isStaticMode) {
  const output = runtime.render({
    componentName: schema.componentName,
    props: {
      environment: "staging",
    },
  });
  console.log(output);
  process.exit(0);
}

await runtime.start({
  componentName: schema.componentName,
  props: {
    environment: "staging",
  },
  quitKeys: ["q"],
});
