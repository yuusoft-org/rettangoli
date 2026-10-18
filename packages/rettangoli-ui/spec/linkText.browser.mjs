// Run after bun run build:dev: node spec/linkText.browser.mjs.
// Real-Chromium check for text-segment links: alert/confirm message links
// (click does not close the dialog, keyboard Tab reaches the link, unsafe
// hrefs degrade to plain text, newlines are preserved) and a form with
// description + checkbox links (click does not toggle the checkbox, Tab order
// stays sane, aria text is flattened).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const script = await readFile("vt/static/public/main.js", "utf8");
const css =
  (await readFile("vt/static/public/base.css", "utf8")) +
  (await readFile("vt/static/public/theme-rtgl-slate.css", "utf8"));

const alertTitleSegments = [
  "Please read the ",
  { text: "terms of service", href: "#alert-title-link", newTab: true },
];
const alertMessageSegments = [
  "Please read the ",
  { text: "terms of service", href: "#alert-link" },
  " before continuing.\n",
  { text: "Email us", href: "mailto:support@example.com" },
  " for help, or see ",
  { text: "run this", href: " javascript:alert(1)" },
  ".",
];
const confirmMessageSegments = [
  "Delete this asset?\n",
  "This cannot be undone. See the ",
  { text: "deletion policy", href: "https://example.com/policy", newTab: true },
  " first.",
];

const formSchema = () => ({
  title: "Account setup",
  description: [
    "Please read the ",
    { text: "terms of service", href: "#form-terms" },
    " before continuing.",
  ],
  fields: [
    {
      type: "section",
      label: "Agreements",
      description: [
        "Read the ",
        { text: "guidelines", href: "#section-guidelines" },
        " first.",
      ],
      fields: [
        {
          name: "email",
          type: "input-text",
          label: "Email",
          description: [
            "We only use this for ",
            { text: "updates", href: "#email-updates" },
            ".",
          ],
        },
        {
          name: "agree",
          type: "checkbox",
          content: [
            "I agree to the ",
            { text: "terms", href: "#checkbox-terms" },
            " and privacy policy.",
          ],
        },
      ],
    },
  ],
  actions: {
    buttons: [{ id: "save", label: "Save", variant: "pr" }],
  },
});

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<body class="dark"><rtgl-global-ui></rtgl-global-ui></body>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });

  // --- alert with title + message links ---
  await page.locator("rtgl-global-ui").evaluate((element, options) => {
    window.dialogResult = "pending";
    void element.transformedHandlers.handleShowAlert(options).then((result) => {
      window.dialogResult = result;
    });
  }, { title: alertTitleSegments, message: alertMessageSegments });
  await page.locator(".dialog-message").waitFor({ state: "visible" });

  const alertLayout = await page.evaluate(() => {
    const globalUI = document.querySelector("rtgl-global-ui");
    const title = globalUI.shadowRoot.querySelector('rtgl-text[s="lg"]');
    const message = globalUI.shadowRoot.querySelector(".dialog-message");
    const messageAnchors = [...message.querySelectorAll("a")];
    const titleAnchors = [...(title?.querySelectorAll("a") ?? [])];
    return {
      titleText: title?.textContent ?? null,
      titleAnchors: titleAnchors.map((anchor) => ({
        href: anchor.getAttribute("href"),
        target: anchor.getAttribute("target"),
        rel: anchor.getAttribute("rel"),
        text: anchor.textContent,
      })),
      text: message.textContent,
      whiteSpace: getComputedStyle(message).whiteSpace,
      hostHref: message.getAttribute("href"),
      anchorCount: messageAnchors.length,
      // rettangoli-fe resets component-shadow anchors to `display: contents` with no
      // decoration; segment links must opt back into real inline, underlined links.
      anchorsRendered: [...messageAnchors, ...titleAnchors].every((anchor) => {
        const style = getComputedStyle(anchor);
        return anchor.getClientRects().length > 0
          && style.display === "inline"
          && style.textDecorationLine.includes("underline");
      }),
      anchors: messageAnchors.map((anchor) => ({
        href: anchor.getAttribute("href"),
        target: anchor.getAttribute("target"),
        rel: anchor.getAttribute("rel"),
        text: anchor.textContent,
      })),
      directChildren: [...message.childNodes].map((node) =>
        node.nodeType === Node.TEXT_NODE ? `text:${node.textContent}` : `${node.nodeName}:${node.textContent}`,
      ),
    };
  });

  assert.equal(alertLayout.whiteSpace, "pre-wrap");
  assert.equal(alertLayout.hostHref, null);
  assert.equal(alertLayout.anchorCount, 2);
  assert.equal(alertLayout.anchorsRendered, true, "alert links must be visible, inline, underlined and focusable");
  assert.deepEqual(alertLayout.anchors, [
    // Same-tab links render inert empty target/rel attributes (no _blank, no restrictions).
    { href: "#alert-link", target: "", rel: "", text: "terms of service" },
    { href: "mailto:support@example.com", target: "", rel: "", text: "Email us" },
  ]);
  assert.deepEqual(alertLayout.titleAnchors, [
    { href: "#alert-title-link", target: "_blank", rel: "noopener noreferrer", text: "terms of service" },
  ]);
  assert.equal(alertLayout.titleText, "Please read the terms of service");
  assert.equal(
    alertLayout.text,
    "Please read the terms of service before continuing.\nEmail us for help, or see run this.",
  );
  assert.deepEqual(alertLayout.directChildren, [
    "text:Please read the ",
    "A:terms of service",
    "text: before continuing.\n",
    "A:Email us",
    "text: for help, or see ",
    "text:run this",
    "text:.",
  ]);

  // Clicking the link navigates the fragment but keeps the dialog open.
  await page.locator('.dialog-message a[href="#alert-link"]').click();
  await page.waitForTimeout(120);
  const afterLinkClick = await page.evaluate(() => ({
    hash: location.hash,
    result: window.dialogResult,
    messageVisible: !!document.querySelector("rtgl-global-ui").shadowRoot.querySelector(".dialog-message"),
  }));
  assert.equal(afterLinkClick.hash, "#alert-link");
  assert.equal(afterLinkClick.result, "pending");
  assert.equal(afterLinkClick.messageVisible, true);

  // Keyboard: Tab reaches the dialog link.
  let alertLinkFocused = false;
  for (let i = 0; i < 10 && !alertLinkFocused; i++) {
    await page.keyboard.press("Tab");
    alertLinkFocused = await page.evaluate(
      () => {
        let element = document.activeElement;
        while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
        return element?.tagName === "A" && element.getAttribute("href") === "#alert-link";
      },
    );
  }
  assert.ok(alertLinkFocused, "Tab must reach the alert dialog link");

  await page.locator("#confirmButton").click();
  await page.waitForFunction(() => window.dialogResult !== "pending");
  assert.equal(await page.evaluate(() => window.dialogResult), null);

  // --- confirm with a link and a newline in the message ---
  await page.locator("rtgl-global-ui").evaluate((element, options) => {
    window.dialogResult = "pending";
    void element.transformedHandlers.handleShowConfirm(options).then((result) => {
      window.dialogResult = result;
    });
  }, { message: confirmMessageSegments });
  await page.locator(".dialog-message").waitFor({ state: "visible" });
  const confirmLayout = await page.evaluate(() => {
    const message = document.querySelector("rtgl-global-ui").shadowRoot.querySelector(".dialog-message");
    const anchors = [...message.querySelectorAll("a")];
    const policy = anchors[0]?.getBoundingClientRect();
    const emailFirstLine = [...message.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    const range = document.createRange();
    const textNode = [...message.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.includes("This cannot be undone."),
    );
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    const firstRange = document.createRange();
    firstRange.setStart(emailFirstLine, 0);
    firstRange.setEnd(emailFirstLine, 1);
    return {
      text: message.textContent,
      anchorCount: anchors.length,
      policyHref: anchors[0]?.getAttribute("href"),
      policyTarget: anchors[0]?.getAttribute("target"),
      policyRel: anchors[0]?.getAttribute("rel"),
      secondLineBelowFirst: range.getBoundingClientRect().top > firstRange.getBoundingClientRect().top,
      emailFirstLineText: emailFirstLine.textContent,
    };
  });
  assert.equal(confirmLayout.anchorCount, 1);
  assert.equal(confirmLayout.policyHref, "https://example.com/policy");
  assert.equal(confirmLayout.policyTarget, "_blank");
  assert.equal(confirmLayout.policyRel, "noopener noreferrer");
  assert.equal(
    confirmLayout.text,
    "Delete this asset?\nThis cannot be undone. See the deletion policy first.",
  );
  assert.ok(confirmLayout.secondLineBelowFirst, "newline inside segments must wrap to a new line");

  await page.locator('.dialog-message a[href="https://example.com/policy"]').click({ modifiers: ["Control"] });
  await page.waitForTimeout(120);
  const confirmAfterClick = await page.evaluate(() => ({
    result: window.dialogResult,
    messageVisible: !!document.querySelector("rtgl-global-ui").shadowRoot.querySelector(".dialog-message"),
  }));
  assert.equal(confirmAfterClick.result, "pending");
  assert.equal(confirmAfterClick.messageVisible, true);

  await page.locator("#cancelButton").click();
  await page.waitForFunction(() => window.dialogResult !== "pending");
  assert.equal(await page.evaluate(() => window.dialogResult), false);

  // --- form with description + checkbox links ---
  await page.evaluate((schema) => {
    document.body.replaceChildren();
    const form = document.createElement("rtgl-form");
    form.id = "form";
    form.setAttribute("w", "480");
    form.form = schema;
    window.formEvents = { change: [], action: [] };
    form.addEventListener("form-change", (event) => window.formEvents.change.push(event.detail));
    form.addEventListener("form-action", (event) => window.formEvents.action.push(event.detail));
    document.body.append(form);
  }, formSchema());
  await page.waitForFunction(() =>
    document.getElementById("form")?.shadowRoot?.querySelector('[data-field-name="agree"]'),
  );

  const formLayout = await page.evaluate(() => {
    const form = document.getElementById("form");
    const root = form.shadowRoot;
    const checkbox = root.querySelector('[data-field-name="agree"]');
    const input = root.querySelector('[data-field-name="email"]');
    return {
      anchorsRendered: [...root.querySelectorAll("a")].length > 0 && [...root.querySelectorAll("a")].every((anchor) => {
        const style = getComputedStyle(anchor);
        return anchor.getClientRects().length > 0
          && style.display === "inline"
          && style.textDecorationLine.includes("underline");
      }),
      descriptionLinks: [...root.querySelectorAll(".form-header a")].map((a) => a.getAttribute("href")),
      sectionDescriptionLinks: [...root.querySelectorAll("[data-form-section] a")].map((a) => a.getAttribute("href")),
      fieldDescriptionLinks: [...root.querySelectorAll(".form-field-header a")].map((a) => a.getAttribute("href")),
      checkboxAnchor: checkbox.querySelector("a")?.getAttribute("href") ?? null,
      checkboxChecked: checkbox.checked,
      checkboxLabelAttr: checkbox.getAttribute("label"),
      checkboxHasLabelAttr: checkbox.hasAttribute("label"),
      inputAriaDescription: input.getAttribute("aria-description"),
      checkboxAriaLabel: checkbox.getAttribute("aria-label"),
      descriptionText: root.querySelector(".form-header rtgl-text:nth-child(2)")?.textContent ?? "",
      sectionDescriptionText: [...root.querySelectorAll("[data-form-section] rtgl-text")]
        .map((node) => node.textContent).join("|"),
    };
  });

  assert.equal(formLayout.anchorsRendered, true, "form links must be visible, inline, underlined and focusable");
  assert.deepEqual(formLayout.descriptionLinks, ["#form-terms"]);
  assert.deepEqual(formLayout.sectionDescriptionLinks, ["#section-guidelines"]);
  assert.deepEqual(formLayout.fieldDescriptionLinks, ["#email-updates"]);
  assert.equal(formLayout.checkboxAnchor, "#checkbox-terms");
  assert.equal(formLayout.checkboxChecked, false);
  assert.equal(formLayout.checkboxHasLabelAttr, false);
  assert.equal(formLayout.inputAriaDescription, "We only use this for updates.");
  assert.equal(formLayout.checkboxAriaLabel, "");
  assert.equal(formLayout.descriptionText, "Please read the terms of service before continuing.");
  assert.ok(formLayout.sectionDescriptionText.includes("Read the guidelines first."));

  // Clicking the checkbox link must not toggle the checkbox.
  await page.locator('rtgl-checkbox[data-field-name="agree"] a[href="#checkbox-terms"]').click();
  await page.waitForTimeout(120);
  const afterCheckboxLinkClick = await page.evaluate(() => ({
    hash: location.hash,
    checked: document.getElementById("form").shadowRoot.querySelector('[data-field-name="agree"]').checked,
    changeEvents: window.formEvents.change.length,
  }));
  assert.equal(afterCheckboxLinkClick.hash, "#checkbox-terms");
  assert.equal(afterCheckboxLinkClick.checked, false, "clicking the checkbox link must not toggle it");
  assert.equal(afterCheckboxLinkClick.changeEvents, 0);

  // Clicking the plain label text still toggles the checkbox.
  await page
    .locator('rtgl-checkbox[data-field-name="agree"]')
    .evaluate((host) => {
      const label = host.shadowRoot.querySelector(".checkbox-label");
      const range = document.createRange();
      const textNode = [...label.querySelector("slot").assignedNodes()].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.includes(" and privacy policy."),
      );
      range.setStart(textNode, 0);
      range.setEnd(textNode, 4);
      const rect = range.getBoundingClientRect();
      const click = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      range.startContainer.dispatchEvent(click);
    });
  await page.waitForTimeout(120);
  assert.equal(
    await page.evaluate(() => document.getElementById("form").shadowRoot.querySelector('[data-field-name="agree"]').checked),
    true,
    "clicking plain checkbox label text must still toggle it",
  );

  // Tab order follows document order: start from the form description link, then
  // section description link, field description link, email input, checkbox input,
  // checkbox link, save button.
  await page.evaluate(() => {
    document.getElementById("form").shadowRoot.querySelector(".form-header a").focus();
  });
  const describeFocus = () =>
    page.evaluate(() => {
      let element = document.activeElement;
      while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
      if (!element) return null;
      if (element.tagName === "A") return `a:${element.getAttribute("href")}`;
      const host = element.getRootNode()?.host;
      if (element.tagName === "INPUT") return `input:${host?.getAttribute("data-field-name")}`;
      if (element.tagName === "BUTTON") return `button:${host?.getAttribute("data-action-id") ?? ""}`;
      return element.tagName;
    });
  assert.equal(await describeFocus(), "a:#form-terms");
  const tabStops = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    tabStops.push(await describeFocus());
  }
  assert.deepEqual(tabStops, [
    "a:#section-guidelines",
    "a:#email-updates",
    "input:email",
    "input:agree",
    "a:#checkbox-terms",
    "button:save",
  ]);

  // Space on the focused checkbox link must not toggle the checkbox; Enter follows the link.
  await page.evaluate(() => {
    document.getElementById("form").shadowRoot.querySelector('rtgl-checkbox[data-field-name="agree"] a').focus();
  });
  const checkedBefore = await page.evaluate(
    () => document.getElementById("form").shadowRoot.querySelector('[data-field-name="agree"]').checked,
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  const afterEnter = await page.evaluate(() => ({
    hash: location.hash,
    checked: document.getElementById("form").shadowRoot.querySelector('[data-field-name="agree"]').checked,
  }));
  assert.equal(afterEnter.hash, "#checkbox-terms");
  assert.equal(afterEnter.checked, checkedBefore, "Enter on the checkbox link must not toggle the checkbox");

  assert.deepEqual(errors, []);
  console.log(
    "linkText.browser: alert/confirm/form segment links render, stay non-dismissable on click, degrade unsafe hrefs, preserve newlines, keep checkbox toggling and Tab order intact",
  );
} finally {
  await browser.close();
}
