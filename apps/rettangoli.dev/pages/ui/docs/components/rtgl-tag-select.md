---
template: docs
_bind:
  docs: docs
title: Tag Select
tags: documentation
sidebarId: rtgl-tag-select
---

A controlled multi-tag picker that reuses the same option shape as `rtgl-select`. When tags exceed the trigger width, they wrap onto additional lines.

## Quickstart

```html codePreview
<rtgl-view d="v" g="sm" w="280">
  <rtgl-text c="mu">Tags</rtgl-text>
  <rtgl-tag-select id="issue-tags" placeholder="Add tag" w="f"></rtgl-tag-select>
</rtgl-view>

<script>
  const tagSelect = document.getElementById("issue-tags");

  tagSelect.options = [
    { value: "bug", label: "Bug" },
    { value: "docs", label: "Docs" },
    { value: "feature", label: "Feature" },
    { value: "backend", label: "Backend" },
    { value: "qa", label: "QA" },
    { value: "urgent", label: "Urgent" },
    { value: "accessibility", label: "Accessibility" },
  ];
  tagSelect.addOption = { label: "Add tag" };
  tagSelect.selectedValues = ["bug", "docs", "backend", "qa"];

  tagSelect.addEventListener("add-option-click", () => {
    console.log("Host should open create-tag flow");
  });

  tagSelect.addEventListener("value-change", (e) => {
    console.log(e.detail.value);
  });

  tagSelect.render();
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Placeholder | `placeholder` | string | `Add tag` |
| Selected Values | `selected-values` / `selectedValues` | any[] | `[]` |
| Options | `options` (property) | `{ type?: "item" \| "section" \| "separator", label?: string, value?: any, icon?: string, shortcut?: string, suffixText?: string, testId?: string }[]` | `[]` |
| Add Option | `addOption` (property) | `{ label?: string }` | `{ label: "Add tag" }` visual default |
| No Add | `no-add` / `noAdd` | boolean | `false` |
| Disabled | `disabled` | boolean | `false` |
| Width | `w` | number, `%`, `xs`-`xl`, `f`, CSS length/value | content-based |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-change` | `{ value, operation, changedValue, label, index, item }` | Fires after draft tag changes are committed via the popover submit button |
| `add-option-click` | `{}` | Fires when the popover add-tag button is clicked so the host can create a missing tag |

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `refreshPopover()` | void | Re-renders the component. If the popover is open, it also recomputes its position and rebuilds the open option list while preserving the current draft selection. |

## Behavior

- Click the field to open the add popover.
- When no tags are selected, the trigger shows a placeholder chip using the `placeholder` text.
- The popover shows all available options as chips, including selected and unselected tags.
- The popover chip list ends with a low-chrome `Add tag` button that emits `add-option-click` for host-managed tag creation.
- Set `no-add` / `noAdd` to hide the popover `Add tag` button when tag creation is not allowed.
- Click chips in the popover to toggle draft selection on or off.
- Draft changes are applied only when you click the popover submit button.
- Clicking `Add tag` does not commit draft changes or close the popover.
- If the host mutates `options` in place during an add flow, call `refreshPopover()` to rebuild the currently open popover without losing draft selections.
- Selected tags wrap to additional lines when they do not fit in the current width.
- `options` uses the same row shape as `rtgl-select`, including `section` and `separator`.

## Host-Managed Add Flow

Use `add-option-click` when the host owns tag creation. If you replace the `options` array reference, normal prop updates are enough. If you mutate the array in place, call `refreshPopover()` after updating it.

```html codePreview
<rtgl-view d="v" g="sm" w="320">
  <rtgl-tag-select id="managed-tags" w="f"></rtgl-tag-select>
</rtgl-view>

<script>
  const tagSelect = document.getElementById("managed-tags");
  const options = [
    { value: "bug", label: "Bug" },
    { value: "docs", label: "Docs" },
  ];

  tagSelect.options = options;
  tagSelect.selectedValues = ["bug"];
  tagSelect.addOption = { label: "Add tag" };

  tagSelect.addEventListener("add-option-click", () => {
    if (!options.some((option) => option.value === "platform")) {
      options.push({ value: "platform", label: "Platform" });
    }

    tagSelect.refreshPopover();
  });
</script>
```

## Form Field

`rtgl-form` supports this via `type: "tag-select"`.

If the host owns tag creation while the picker is rendered inside `rtgl-form`, update the nested field instance's `options` prop or replace the form schema, then call `refreshPopover()` on that `rtgl-tag-select` instance if the popover is already open.

```yaml
- name: tags
  type: tag-select
  label: Tags
  placeholder: Add tag
  noAdd: true
  options:
    - value: bug
      label: Bug
    - value: docs
      label: Docs
    - value: feature
      label: Feature
```
