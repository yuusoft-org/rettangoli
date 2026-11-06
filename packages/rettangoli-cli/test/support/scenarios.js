// Every scenario runs cli.js against the recording fakes and is compared with
// test/golden/<group>.json. Scenario shape:
//   { id, group, argv, files?, cwd?, env?, omitPackages? }
// `files` maps project-relative paths to contents. `env` sets FAKE_THROW,
// FAKE_REJECT, FAKE_DELAY (see fixtures/fake-packages/trace.js) or RTGL_DEBUG.
export const groups = ["root", "check", "fe", "vt", "sites", "ui"];

export const scenarios = [];

function add(group, id, argv, extra = {}) {
  scenarios.push({ id, group, argv, ...extra });
}

const configFile = (yaml) => ({ "rettangoli.config.yaml": yaml });

// A project whose fe.dirs exist. `feLines` adds more fe keys (indented 2).
const feProject = (feLines = "") => ({
  ...configFile(`fe:\n  dirs:\n    - src/components\n${feLines}`),
  "src/components/.keep": "",
});

// A config that exists but has no fe, vt or ui section.
const otherConfig = configFile("other: 1\n");

const throwing = (fn) => ({ env: { FAKE_THROW: fn } });
const rejecting = (fn) => ({ env: { FAKE_REJECT: fn } });
const delaying = (fn) => ({ env: { FAKE_DELAY: fn } });

// ---------------------------------------------------------------- root
add("root", "root-version", ["--version"]);
add("root", "root-version-short", ["-V"]);
add("root", "root-help", ["--help"]);
add("root", "root-help-command", ["help"]);
add("root", "root-help-command-fe", ["help", "fe"]);
add("root", "root-no-args", []);
add("root", "root-unknown-command", ["bogus"]);
add("root", "root-unknown-option", ["--bogus"]);
add("root", "root-fe-help", ["fe", "--help"]);
add("root", "root-fe-unknown-subcommand", ["fe", "bogus"]);

// ---------------------------------------------------------------- check
add("check", "check-help", ["check", "--help"]);
add("check", "check-defaults", ["check"]);
add("check", "check-all-flags", [
  "check",
  "--dir",
  "a",
  "--dir",
  "b",
  "--format",
  "json",
  "--warn-as-error",
  "--no-yahtml",
  "--expr",
  "--style",
  "--watch",
  "--watch-interval-ms",
  "250",
]);
add("check", "check-format-sarif", ["check", "--format", "sarif"]);
add("check", "check-format-unvalidated", ["check", "--format", "yaml"]);
add("check", "check-watch-interval-text", ["check", "--watch-interval-ms", "abc"]);
add("check", "check-watch-interval-fraction", ["check", "--watch-interval-ms", "1.5"]);
add("check", "check-watch-interval-zero", ["check", "--watch-interval-ms", "0"]);
add("check", "check-watch-interval-negative", ["check", "--watch-interval-ms", "-5"]);
// The config is read from the working directory only, never searched upward.
add("check", "check-from-subdirectory", ["check"], { files: { "sub/.keep": "" }, cwd: "sub" });
add("check", "check-throw", ["check"], throwing("check"));
add("check", "check-reject", ["check"], rejecting("check"));
add("check", "check-package-missing", ["check"], { omitPackages: ["check"] });

// ---------------------------------------------------------------- fe build
add("fe", "fe-build-help", ["fe", "build", "--help"]);
add("fe", "fe-build-no-config", ["fe", "build"]);
add("fe", "fe-build-config-empty", ["fe", "build"], { files: configFile("") });
add("fe", "fe-build-config-comment-only", ["fe", "build"], {
  files: configFile("# nothing here\n"),
});
add("fe", "fe-build-config-null", ["fe", "build"], { files: configFile("~\n") });
add("fe", "fe-build-config-invalid-yaml", ["fe", "build"], {
  files: configFile("fe: [\n"),
});
add("fe", "fe-build-no-fe-section", ["fe", "build"], { files: otherConfig });
add("fe", "fe-build-dirs-empty", ["fe", "build"], {
  files: configFile("fe:\n  dirs: []\n"),
});
add("fe", "fe-build-dirs-string", ["fe", "build"], {
  files: configFile('fe:\n  dirs: "src"\n'),
});
add("fe", "fe-build-dirs-number", ["fe", "build"], {
  files: configFile("fe:\n  dirs: [42]\n"),
});
add("fe", "fe-build-dir-missing", ["fe", "build"], {
  files: {
    ...configFile("fe:\n  dirs:\n    - src/components\n    - src/missing\n"),
    "src/components/.keep": "",
  },
});
add("fe", "fe-build-config-in-parent-directory", ["fe", "build"], {
  files: { ...feProject(), "sub/.keep": "" },
  cwd: "sub",
});
add("fe", "fe-build-config-in-working-directory", ["fe", "build"], {
  files: { "sub/rettangoli.config.yaml": "fe:\n  dirs:\n    - components\n", "sub/components/.keep": "" },
  cwd: "sub",
});
add("fe", "fe-build-minimal", ["fe", "build"], { files: feProject() });
add(
  "fe",
  "fe-build-all-flags",
  ["fe", "build", "-o", "out.js", "-s", "s.js", "-d", "--sourcemap"],
  { files: feProject() },
);
add("fe", "fe-build-sourcemap-hidden", ["fe", "build", "--sourcemap", "hidden"], {
  files: feProject(),
});
add("fe", "fe-build-long-flags", ["fe", "build", "--outfile", "o.js", "--setup-path", "s.js"], {
  files: feProject(),
});
add("fe", "fe-build-config-values", ["fe", "build"], {
  files: feProject(
    "  setup: config-setup.js\n  outfile: config-out.js\n  i18n:\n    defaultLocale: en\n",
  ),
});
add("fe", "fe-build-flags-beat-config", ["fe", "build", "-o", "cli-out.js", "-s", "cli-setup.js"], {
  files: feProject("  setup: config-setup.js\n  outfile: config-out.js\n"),
});
add("fe", "fe-build-setup-number", ["fe", "build"], {
  files: feProject("  setup: 42\n"),
});
add("fe", "fe-build-outfile-number", ["fe", "build"], {
  files: feProject("  outfile: 42\n"),
});
add("fe", "fe-build-nullish-values", ["fe", "build"], {
  files: feProject("  setup: ~\n  outfile: ~\n"),
});
add("fe", "fe-build-i18n-false", ["fe", "build"], {
  files: feProject("  i18n: false\n"),
});
add("fe", "fe-build-throw", ["fe", "build"], { files: feProject(), ...throwing("build") });
add("fe", "fe-build-throw-debug", ["fe", "build"], {
  files: feProject(),
  env: { FAKE_THROW: "build", RTGL_DEBUG: "1" },
});
add("fe", "fe-build-reject", ["fe", "build"], { files: feProject(), ...rejecting("build") });
add("fe", "fe-package-missing", ["fe", "build"], {
  files: feProject(),
  omitPackages: ["fe"],
});

// ---------------------------------------------------------------- fe check
add("fe", "fe-check-help", ["fe", "check", "--help"]);
add("fe", "fe-check-ok", ["fe", "check"], { files: feProject() });
add("fe", "fe-check-format-json", ["fe", "check", "--format", "json"], {
  files: feProject(),
});
add("fe", "fe-check-no-config", ["fe", "check"]);
add("fe", "fe-check-dirs-string", ["fe", "check"], {
  files: configFile('fe:\n  dirs: "src"\n'),
});
// fe check ignores fe.setup, unlike fe build.
add("fe", "fe-check-setup-number", ["fe", "check"], {
  files: feProject("  setup: 42\n"),
});
// fe check does not await the package call, so a rejection is unhandled.
add("fe", "fe-check-reject", ["fe", "check"], { files: feProject(), ...rejecting("check") });

// ---------------------------------------------------------------- fe scaffold
add("fe", "fe-scaffold-help", ["fe", "scaffold", "--help"]);
add("fe", "fe-scaffold-defaults", ["fe", "scaffold"]);
add("fe", "fe-scaffold-flags", ["fe", "scaffold", "-d", "x", "-c", "components", "-n", "my-button"]);
add("fe", "fe-scaffold-unknown-name-flag", ["fe", "scaffold", "--name", "MyButton"]);
add("fe", "fe-scaffold-reject", ["fe", "scaffold"], rejecting("scaffold"));

// ---------------------------------------------------------------- fe watch
add("fe", "fe-watch-help", ["fe", "watch", "--help"]);
add("fe", "fe-watch-defaults", ["fe", "watch"], { files: feProject() });
add(
  "fe",
  "fe-watch-all-flags",
  ["fe", "watch", "-p", "4000", "-s", "s.js", "--public-dir", "pub", "--watch-entry", "w.js"],
  { files: feProject() },
);
add("fe", "fe-watch-port-zero", ["fe", "watch", "-p", "0"], { files: feProject() });
add("fe", "fe-watch-port-text", ["fe", "watch", "-p", "notaport"], { files: feProject() });
add("fe", "fe-watch-config-public-and-entry", ["fe", "watch"], {
  files: feProject("  publicDir: pub\n  watchEntry: w.js\n  outfile: config-out.js\n"),
});
add("fe", "fe-watch-config-public-false", ["fe", "watch"], {
  files: feProject("  publicDir: false\n  watchEntry: ~\n"),
});
add("fe", "fe-watch-config-public-true", ["fe", "watch"], {
  files: feProject("  publicDir: true\n"),
});
add("fe", "fe-watch-config-public-null", ["fe", "watch"], {
  files: feProject("  publicDir: ~\n"),
});
add("fe", "fe-watch-public-flag-beats-config", ["fe", "watch", "--public-dir", "cli-pub"], {
  files: feProject("  publicDir: config-pub\n"),
});
add("fe", "fe-watch-watch-entry-number", ["fe", "watch"], {
  files: feProject("  watchEntry: 42\n"),
});
add("fe", "fe-watch-vt", ["fe", "watch"], {
  files: feProject("  watchVt: true\n  outfile: out.js\n  publicDir: pub\n"),
});
add("fe", "fe-watch-vt-public-flag", ["fe", "watch", "--public-dir", "cli-pub"], {
  files: feProject("  watchVt: true\n"),
});
// Only a literal `true` enables the VT plugin.
add("fe", "fe-watch-vt-string", ["fe", "watch"], {
  files: feProject('  watchVt: "true"\n'),
});
add("fe", "fe-watch-reject", ["fe", "watch"], { files: feProject(), ...rejecting("watch") });

// ---------------------------------------------------------------- fe examples
add("fe", "fe-examples-help", ["fe", "examples", "--help"]);
add("fe", "fe-examples-no-config", ["fe", "examples"]);
add("fe", "fe-examples-no-fe-section", ["fe", "examples"], { files: otherConfig });
add("fe", "fe-examples-default-output", ["fe", "examples"], { files: feProject() });
add("fe", "fe-examples-output-dir", ["fe", "examples"], {
  files: feProject("  examples:\n    outputDir: ./out/examples\n"),
});
add("fe", "fe-examples-reject", ["fe", "examples"], { files: feProject(), ...rejecting("examples") });

// ---------------------------------------------------------------- vt
add("vt", "vt-help", ["vt", "--help"]);

add("vt", "vt-generate-help", ["vt", "generate", "--help"]);
add("vt", "vt-generate-no-config", ["vt", "generate"]);
add("vt", "vt-generate-config-empty", ["vt", "generate"], { files: configFile("") });
add("vt", "vt-generate-defaults", ["vt", "generate"], { files: otherConfig });
add(
  "vt",
  "vt-generate-all-flags",
  [
    "vt",
    "generate",
    "--concurrency",
    "2",
    "--timeout",
    "1000",
    "--wait-event",
    "vt:ready",
    "--folder",
    "a",
    "--folder",
    "b",
    "--group",
    "g",
    "--item",
    "i",
    "--headed",
  ],
  { files: otherConfig },
);
add("vt", "vt-generate-concurrency-text", ["vt", "generate", "--concurrency", "x"], {
  files: otherConfig,
});
add("vt", "vt-generate-reject", ["vt", "generate"], { files: otherConfig, ...rejecting("generate") });
add("vt", "vt-generate-path-custom", ["vt", "generate"], {
  files: configFile("vt:\n  path: custom\n"),
});

add("vt", "vt-screenshot-help", ["vt", "screenshot", "--help"]);
add("vt", "vt-screenshot-no-config", ["vt", "screenshot"]);
add("vt", "vt-screenshot-defaults", ["vt", "screenshot"], { files: otherConfig });
add(
  "vt",
  "vt-screenshot-all-flags",
  [
    "vt",
    "screenshot",
    "--concurrency",
    "1",
    "--timeout",
    "180000",
    "--wait-event",
    "vt:ready",
    "--isolation",
    "strict",
    "--folder",
    "a",
    "--group",
    "g",
    "--item",
    "i",
    "--headed",
  ],
  { files: otherConfig },
);
add("vt", "vt-screenshot-isolation-fast", ["vt", "screenshot", "--isolation", "fast"], {
  files: otherConfig,
});
add("vt", "vt-screenshot-isolation-bogus", ["vt", "screenshot", "--isolation", "bogus"], {
  files: otherConfig,
});
add("vt", "vt-screenshot-path-custom", ["vt", "screenshot"], {
  files: configFile("vt:\n  path: custom\n"),
});
// `vt.path: ""` falls back to "vt" (|| semantics).
add("vt", "vt-screenshot-path-empty", ["vt", "screenshot"], {
  files: configFile('vt:\n  path: ""\n'),
});
add("vt", "vt-screenshot-reject", ["vt", "screenshot"], {
  files: otherConfig,
  ...rejecting("screenshot"),
});

add("vt", "vt-report-help", ["vt", "report", "--help"]);
add("vt", "vt-report-no-config", ["vt", "report"]);
add("vt", "vt-report-defaults", ["vt", "report"], { files: otherConfig });
add("vt", "vt-report-compare-md5", ["vt", "report", "--compare-method", "md5"], {
  files: otherConfig,
});
add(
  "vt",
  "vt-report-thresholds",
  ["vt", "report", "--color-threshold", "0.1", "--diff-threshold", "0.8"],
  { files: otherConfig },
);
add(
  "vt",
  "vt-report-filters",
  ["vt", "report", "--folder", "a", "--folder", "b", "--group", "g", "--item", "i"],
  { files: otherConfig },
);
add("vt", "vt-report-path-custom", ["vt", "report"], {
  files: configFile("vt:\n  path: custom\n"),
});
// --diff-threshold goes through parseFloat: these pin what it accepts today.
for (const [name, value] of [
  ["leading-dot", ".5"],
  ["percent-suffix", "5%"],
  ["exponent", "1e-3"],
  ["padded", " 0.8 "],
  ["comma", "0,5"],
  ["text", "abc"],
  ["trailing-text", ".1x"],
  ["hex", "0x10"],
  ["infinity", "Infinity"],
]) {
  add("vt", `vt-report-diff-threshold-${name}`, ["vt", "report", "--diff-threshold", value], {
    files: otherConfig,
  });
}
add("vt", "vt-report-reject", ["vt", "report"], { files: otherConfig, ...rejecting("report") });
add("vt", "vt-report-throw", ["vt", "report"], { files: otherConfig, ...throwing("report") });

add("vt", "vt-accept-help", ["vt", "accept", "--help"]);
add("vt", "vt-accept-ok", ["vt", "accept"], { files: otherConfig });
add("vt", "vt-accept-no-config", ["vt", "accept"]);
add("vt", "vt-accept-path-custom", ["vt", "accept"], {
  files: configFile("vt:\n  path: custom\n"),
});
add("vt", "vt-accept-reject", ["vt", "accept"], { files: otherConfig, ...rejecting("accept") });

// ---------------------------------------------------------------- sites
add("sites", "sites-help", ["sites", "--help"]);

add("sites", "sites-init-help", ["sites", "init", "--help"]);
add("sites", "sites-init", ["sites", "init", "my-site"]);
add("sites", "sites-init-template", ["sites", "init", "my-site", "-t", "default"]);
add("sites", "sites-init-other-template", ["sites", "init", "my-site", "--template", "blog"]);
add("sites", "sites-init-missing-name", ["sites", "init"]);
// sites init does not await initSite, so a rejection is unhandled.
add("sites", "sites-init-reject", ["sites", "init", "my-site"], rejecting("initSite"));

add("sites", "sites-build-help", ["sites", "build", "--help"]);
add("sites", "sites-build-defaults", ["sites", "build"]);
add("sites", "sites-build-short-flags", ["sites", "build", "-r", "com", "-o", "out", "-q"]);
add("sites", "sites-build-website-flags", [
  "sites",
  "build",
  "--root-dir",
  "com",
  "--output-path",
  "../_site",
]);
add("sites", "sites-build-deprecated-aliases", [
  "sites",
  "build",
  "--rootDir",
  "x",
  "--outputPath",
  "y",
]);
add("sites", "sites-build-quiet", ["sites", "build", "--quiet"]);
// The success line is printed only after buildSite settles.
add("sites", "sites-build-delayed", ["sites", "build"], delaying("buildSite"));
add("sites", "sites-build-delayed-quiet", ["sites", "build", "-q"], delaying("buildSite"));
add("sites", "sites-build-throw", ["sites", "build"], throwing("buildSite"));
add("sites", "sites-build-reject", ["sites", "build"], rejecting("buildSite"));

add("sites", "sites-watch-help", ["sites", "watch", "--help"]);
add("sites", "sites-watch-defaults", ["sites", "watch"]);
add("sites", "sites-watch-website-flags", [
  "sites",
  "watch",
  "--root-dir",
  "cn",
  "--output-path",
  ".rettangoli/preview",
  "--reload-mode",
  "full",
  "--port",
  "3002",
]);
add("sites", "sites-watch-port-too-high", ["sites", "watch", "-p", "70000"]);
add("sites", "sites-watch-host", ["sites", "watch", "--host", "0.0.0.0"]);
add("sites", "sites-watch-quiet", ["sites", "watch", "-q"]);
add("sites", "sites-watch-deprecated-aliases", [
  "sites",
  "watch",
  "--rootDir",
  "x",
  "--outputPath",
  "y",
]);
add("sites", "sites-watch-reload-mode-unvalidated", ["sites", "watch", "--reload-mode", "bogus"]);
add("sites", "sites-watch-reject", ["sites", "watch"], rejecting("watchSite"));

// ---------------------------------------------------------------- ui
add("ui", "ui-help", ["ui", "--help"]);
add("ui", "ui-build-svg-help", ["ui", "build-svg", "--help"]);
add("ui", "ui-build-svg-config", ["ui", "build-svg"], {
  files: configFile("ui:\n  svg:\n    dir: icons\n    outfile: icons.js\n"),
});
add("ui", "ui-build-svg-flags", ["ui", "build-svg", "-d", "svg", "-o", "out.js"]);
add("ui", "ui-build-svg-flags-beat-config", ["ui", "build-svg", "-d", "cli-svg"], {
  files: configFile("ui:\n  svg:\n    dir: icons\n    outfile: icons.js\n"),
});
add("ui", "ui-build-svg-neither", ["ui", "build-svg"]);
add("ui", "ui-build-svg-config-dir-only", ["ui", "build-svg"], {
  files: configFile("ui:\n  svg:\n    dir: icons\n"),
});
add("ui", "ui-build-svg-invalid-yaml", ["ui", "build-svg"], {
  files: configFile("ui: [\n"),
});
add("ui", "ui-build-svg-reject", ["ui", "build-svg", "-d", "svg", "-o", "out.js"], rejecting("buildSvg"));
