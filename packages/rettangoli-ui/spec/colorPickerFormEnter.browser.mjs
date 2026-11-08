// Run after bun run build:dev: node spec/colorPickerFormEnter.browser.mjs.
// Real-browser regression check (Chromium and WebKit) for Enter inside an
// rtgl-color-picker field of an rtgl-form that sits in an open rtgl-dialog,
// where the app closes the dialog when the form submits. Enter inside the
// picker (the square right after opening, or the hex field) must only act on
// the picker. Before, it submitted the form, the dialog closed, and the
// picker's modal panel stayed open in the top layer with no layout box, which
// left the whole page unresponsive. Enter in an ordinary text field of the
// same form must still submit.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-slate.css", "utf8"));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const schema = {
  title: "Appearance",
  fields: [
    { name: "title", type: "input-text", label: "Title" },
    { name: "accent", type: "color-picker", label: "Accent" },
  ],
  actions: { buttons: [{ id: "save", label: "Save", variant: "pr" }] },
};

// A fresh page per case so a failure in one case cannot leave a stuck panel
// behind for the next. The dialog is open and holds the form; the form action
// listener removes the dialog's `open` attribute, as an app would. The probe
// button lives outside the dialog and only works once the dialog is closed.
const setupPage = async (browser, engineName, caseName) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (error) =>
    failures.push(`${engineName} ${caseName}: pageerror: ${error.message}`),
  );
  await page.setContent("<body></body>");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  await page.evaluate((formSchema) => {
    // The picker lives in the form's shadow root, which querySelector does not enter.
    window.getPicker = () =>
      document.getElementById("form").shadowRoot.querySelector("rtgl-color-picker");
    window.appState = { actions: [], changes: [], probeClicks: 0 };

    const probe = document.createElement("button");
    probe.id = "probe";
    probe.textContent = "Probe";
    probe.style.cssText = "position:fixed;left:16px;top:16px;width:96px;height:40px";
    probe.addEventListener("click", () => {
      window.appState.probeClicks += 1;
    });

    const dialog = document.createElement("rtgl-dialog");
    dialog.id = "dialog";
    const content = document.createElement("div");
    content.setAttribute("slot", "content");
    const form = document.createElement("rtgl-form");
    form.id = "form";
    form.setAttribute("w", "400");
    form.form = formSchema;
    form.addEventListener("form-change", (event) =>
      window.appState.changes.push({ name: event.detail.name, value: event.detail.value }));
    form.addEventListener("form-action", (event) => {
      window.appState.actions.push(event.detail.actionId);
      dialog.removeAttribute("open");
    });
    content.append(form);
    dialog.append(content);
    document.body.append(probe, dialog);
    dialog.setAttribute("open", "");
  }, schema);
  await page.locator("#form rtgl-color-picker button.trigger").waitFor({ state: "visible", timeout: 5000 });
  return page;
};

// Opens the picker the way a user does and waits until the square has focus.
const openPicker = async (page) => {
  await page.locator("#form rtgl-color-picker button.trigger").click();
  await page.locator("#form rtgl-popover[positioned] .sv").waitFor({ state: "visible", timeout: 3000 });
  await page
    .waitForFunction(
      () => getPicker().shadowRoot.activeElement?.className === "sv",
      null,
      { timeout: 2000 },
    )
    .catch(() => {});
  return page.evaluate(() => ({
    focused: getPicker().shadowRoot.activeElement?.className ?? null,
  }));
};

const readState = (page) =>
  page.evaluate(() => {
    const picker = getPicker();
    const popover = picker.shadowRoot.querySelector("rtgl-popover");
    const square = picker.shadowRoot.querySelector(".sv");
    const rect = square.getBoundingClientRect();
    return {
      actions: [...window.appState.actions],
      changes: window.appState.changes.map((change) => ({ ...change })),
      dialogOpen: document.getElementById("dialog").hasAttribute("open"),
      panelOpen: popover.hasAttribute("open"),
      panelHasBox: rect.width > 0 && rect.height > 0,
      pickerValue: picker.value,
      formValue: document.getElementById("form").getValues().accent,
      hexText: picker.shadowRoot.querySelector(".hexfield input").value,
    };
  });

// The page behind a leftover modal panel is inert: the probe button must be
// what a hit test finds at its centre, and a real click must reach its handler.
const checkInteractive = async (page, engineName, caseName) => {
  const hit = await page.evaluate(() => {
    const probe = document.getElementById("probe");
    const rect = probe.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const found = document.elementFromPoint(x, y);
    return {
      x,
      y,
      isProbe: found === probe || probe.contains(found),
      found: found ? found.tagName.toLowerCase() + (found.id ? `#${found.id}` : "") : null,
    };
  });
  check(
    hit.isProbe,
    `${engineName} ${caseName}: page must stay interactive, but a hit test at the probe button's centre found ${hit.found}`,
  );
  const before = await page.evaluate(() => window.appState.probeClicks);
  await page.mouse.click(hit.x, hit.y);
  const after = await page.evaluate(() => window.appState.probeClicks);
  check(
    after - before === 1,
    `${engineName} ${caseName}: clicking the probe button must run its handler once, ran ${after - before} times`,
  );
};

// If the app closed the dialog on Enter (the bug), the picker's panel must not be
// left open over the page. Escape would close a leftover panel and hide the bug,
// so this runs before the case ends. With the fix the dialog is still open here.
const checkNoStuckPanel = async (page, state, engineName, caseName) => {
  if (!state.dialogOpen) await checkInteractive(page, engineName, `${caseName}, after the dialog closed`);
};

// Ends a case the way a user would: close the picker with Escape, let the app
// close the dialog, then prove the page still responds.
const finish = async (page, engineName, caseName) => {
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.getElementById("dialog").removeAttribute("open"));
  await page.waitForTimeout(100);
  await checkInteractive(page, engineName, caseName);
};

const runCase = async (browser, engineName, caseName, body) => {
  const page = await setupPage(browser, engineName, caseName);
  try {
    await body(page);
  } catch (error) {
    failures.push(`${engineName} ${caseName}: threw ${error.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
};

for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    // (i) Enter right after opening, with focus on the colour square.
    await runCase(browser, engineName, "(i) Enter on the square", async (page) => {
      const caseName = "(i) Enter on the square";
      const opened = await openPicker(page);
      check(opened.focused === "sv", `${engineName} ${caseName}: opening must focus the square, focused: ${opened.focused}`);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      const state = await readState(page);
      check(state.actions.length === 0, `${engineName} ${caseName}: Enter in the picker must not fire form-action, fired: ${JSON.stringify(state.actions)}`);
      check(state.dialogOpen, `${engineName} ${caseName}: the dialog must stay open`);
      check(state.panelOpen && state.panelHasBox, `${engineName} ${caseName}: the picker panel must stay open and laid out (open: ${state.panelOpen}, laid out: ${state.panelHasBox})`);
      await checkNoStuckPanel(page, state, engineName, caseName);
      await finish(page, engineName, caseName);
    });

    // (ii) Type a valid hex code in the hex field and press Enter.
    await runCase(browser, engineName, "(ii) Enter in the hex field", async (page) => {
      const caseName = "(ii) Enter in the hex field";
      await openPicker(page);
      const hex = page.locator("#form rtgl-color-picker .hexfield input");
      await hex.fill("");
      await hex.pressSequentially("e74c3c");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      const state = await readState(page);
      check(state.pickerValue === "#e74c3c", `${engineName} ${caseName}: Enter must commit the picker value, got ${state.pickerValue}`);
      check(state.formValue === "#e74c3c", `${engineName} ${caseName}: Enter must update the form value, got ${state.formValue}`);
      const accentChanges = state.changes.filter((change) => change.name === "accent").map((change) => change.value);
      check(
        accentChanges.length === 1 && accentChanges[0] === "#e74c3c",
        `${engineName} ${caseName}: Enter must emit one form-change for the committed color, got ${JSON.stringify(accentChanges)}`,
      );
      check(state.actions.length === 0, `${engineName} ${caseName}: Enter in the hex field must not fire form-action, fired: ${JSON.stringify(state.actions)}`);
      check(state.dialogOpen, `${engineName} ${caseName}: the dialog must stay open`);
      check(state.panelOpen && state.panelHasBox, `${engineName} ${caseName}: the picker panel must stay open and laid out (open: ${state.panelOpen}, laid out: ${state.panelHasBox})`);
      await checkNoStuckPanel(page, state, engineName, caseName);
      await finish(page, engineName, caseName);
    });

    // (iii) After Escape closes the picker, Enter in an ordinary text field
    // still submits the form, and the app closing the dialog leaves a working page.
    await runCase(browser, engineName, "(iii) Enter in a text field", async (page) => {
      const caseName = "(iii) Enter in a text field";
      await openPicker(page);
      await page.keyboard.press("Escape");
      await page.locator("#form rtgl-popover .sv").waitFor({ state: "hidden", timeout: 3000 });
      let state = await readState(page);
      check(!state.panelOpen, `${engineName} ${caseName}: Escape must close the picker panel`);
      check(state.dialogOpen, `${engineName} ${caseName}: Escape in the picker must leave the dialog open`);
      check(state.actions.length === 0, `${engineName} ${caseName}: Escape must not fire form-action, fired: ${JSON.stringify(state.actions)}`);

      const text = page.locator('#form [data-field-name="title"] input');
      await text.fill("Sunrise");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      state = await readState(page);
      check(
        state.actions.length === 1 && state.actions[0] === "save",
        `${engineName} ${caseName}: Enter in a text field must still submit once, fired: ${JSON.stringify(state.actions)}`,
      );
      check(!state.dialogOpen, `${engineName} ${caseName}: the app's action listener must have closed the dialog`);
      await page.waitForTimeout(100);
      await checkInteractive(page, engineName, caseName);
    });
  } finally {
    await browser.close();
  }
}

assert.deepEqual(failures, []);
console.log(
  "Chromium and WebKit: Enter on the color square or in the hex field of a form color picker never submits the form (the hex field commits its value), the dialog and picker panel stay as they were, Enter in a text field still submits, and the page stays interactive.",
);
