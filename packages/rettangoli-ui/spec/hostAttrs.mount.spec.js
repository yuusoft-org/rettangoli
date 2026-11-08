// @vitest-environment jsdom
//
// Host attributes that are not in a component's schema stay on the host.
// fe's props proxy only exposes schema keys (in the browser and in SSR), so
// these components never copied such attributes onto their inner container.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  defineComponents,
  definePrimitives,
  installTimers,
  mountElement,
  removeTimers,
} from "./support/mountComponent.js";

const components = {
  breadcrumb: { tag: "rtgl-breadcrumb", props: { items: [{ id: "home", label: "Home" }] } },
  card: { tag: "rtgl-card", props: { head: "Billing", desc: "Invoices" } },
  form: { tag: "rtgl-form", props: { form: { fields: [{ name: "title", type: "input-text" }] } } },
  navbar: { tag: "rtgl-navbar", props: { start: { label: "Home", path: "/" } } },
  sidebar: { tag: "rtgl-sidebar", props: { items: [{ id: "one", title: "One" }] } },
  tabs: { tag: "rtgl-tabs", props: { items: [{ id: "a", label: "A" }], selectedTab: "a" } },
};

beforeAll(async () => {
  await definePrimitives();
  await defineComponents(Object.keys(components));
});
beforeEach(installTimers);
afterEach(removeTimers);

describe("host attributes outside the schema", () => {
  it.each(Object.entries(components))("%s keeps them on the host", async (_, { tag, props }) => {
    const host = await mountElement(tag, {
      props,
      attrs: { mb: "lg", op: "0.5", "data-testid": "probe" },
    });

    expect(host.getAttribute("data-testid")).toBe("probe");
    expect(host.shadowRoot.querySelector("rtgl-view")).not.toBeNull();
    expect(host.shadowRoot.querySelectorAll('[mb="lg"], [op="0.5"], [data-testid="probe"]')).toHaveLength(0);
  });
});
