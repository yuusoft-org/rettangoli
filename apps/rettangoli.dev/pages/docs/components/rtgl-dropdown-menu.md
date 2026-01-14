---
template: documentation
title: Dropdown Menu
tags: documentation
sidebarId: rtgl-dropdown-menu
---

A contextual menu component that displays a list of actions or options in a popover.

## Properties

| Name | Property | Type | Default |
|-----------|------|---------|---------|
| Items | `items` | Array<{type: 'label' \| 'item' \| 'separator', label?: string}> | `[]` |

## Attributes

| Name | Attribute | Type | Default |
|-----------|------|---------|---------|
| Open | `open` | string | - |
| X Position | `x` | string | - |
| Y Position | `y` | string | - |
| Placement | `placement` | string | - |

## Events

| Name | Event | Detail |
|-----------|------|---------|
| Click Item | `click-item` | `{ index: number, item: object }` |
| Close | `close` | - |

## Basic Usage

Display a simple dropdown menu with clickable items.

```html codePreview
<rtgl-view d="h" g="lg">
  <rtgl-button id="dropdown-basic-btn">Show Menu</rtgl-button>
  <rtgl-text id="dropdown-basic-result">Result: -</rtgl-text>
</rtgl-view>

<rtgl-dropdown-menu id="dropdown-basic"></rtgl-dropdown-menu>

<script>
  const dropdown = document.getElementById('dropdown-basic');
  const btn = document.getElementById('dropdown-basic-btn');
  const result = document.getElementById('dropdown-basic-result');

  btn.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    dropdown.items = [
      { type: 'item', label: 'Copy' },
      { type: 'item', label: 'Paste' },
      { type: 'item', label: 'Delete' }
    ];
    dropdown.setAttribute('open', '');
    dropdown.setAttribute('x', rect.left + rect.width / 2);
    dropdown.setAttribute('y', rect.bottom + 5);
    dropdown.setAttribute('placement', 'bottom-start');
    dropdown.render();
  });

  dropdown.addEventListener('click-item', (e) => {
    result.textContent = `Result: ${e.detail.item.label}`;
    dropdown.removeAttribute('open');
    dropdown.render();
  });

  dropdown.addEventListener('close', () => {
    dropdown.removeAttribute('open');
    dropdown.render();
  });
</script>
```

## With Separators

Use separators to group related menu items.

```html codePreview
<rtgl-view d="h" g="lg">
  <rtgl-button id="dropdown-separator-btn">Show Menu</rtgl-button>
  <rtgl-text id="dropdown-separator-result">Result: -</rtgl-text>
</rtgl-view>

<rtgl-dropdown-menu id="dropdown-separator"></rtgl-dropdown-menu>

<script>
  const dropdown = document.getElementById('dropdown-separator');
  const btn = document.getElementById('dropdown-separator-btn');
  const result = document.getElementById('dropdown-separator-result');

  btn.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    dropdown.items = [
      { type: 'item', label: 'Copy' },
      { type: 'item', label: 'Paste' },
      { type: 'separator' },
      { type: 'item', label: 'Delete' },
      { type: 'item', label: 'Rename' }
    ];
    dropdown.setAttribute('open', '');
    dropdown.setAttribute('x', rect.left + rect.width / 2);
    dropdown.setAttribute('y', rect.bottom + 5);
    dropdown.setAttribute('placement', 'bottom-start');
    dropdown.render();
  });

  dropdown.addEventListener('click-item', (e) => {
    result.textContent = `Result: ${e.detail.item.label}`;
    dropdown.removeAttribute('open');
    dropdown.render();
  });

  dropdown.addEventListener('close', () => {
    dropdown.removeAttribute('open');
    dropdown.render();
  });
</script>
```

## With Labels

Add non-clickable labels to organize menu sections.

```html codePreview
<rtgl-view d="h" g="lg">
  <rtgl-button id="dropdown-label-btn">Show Menu</rtgl-button>
  <rtgl-text id="dropdown-label-result">Result: -</rtgl-text>
</rtgl-view>

<rtgl-dropdown-menu id="dropdown-label"></rtgl-dropdown-menu>

<script>
  const dropdown = document.getElementById('dropdown-label');
  const btn = document.getElementById('dropdown-label-btn');
  const result = document.getElementById('dropdown-label-result');

  btn.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    dropdown.items = [
      { type: 'label', label: 'Actions' },
      { type: 'item', label: 'Save' },
      { type: 'item', label: 'Save As...' },
      { type: 'separator' },
      { type: 'label', label: 'Export' },
      { type: 'item', label: 'Export PDF' },
      { type: 'item', label: 'Export CSV' }
    ];
    dropdown.setAttribute('open', '');
    dropdown.setAttribute('x', rect.left + rect.width / 2);
    dropdown.setAttribute('y', rect.bottom + 5);
    dropdown.setAttribute('placement', 'bottom');
    dropdown.render();
  });

  dropdown.addEventListener('click-item', (e) => {
    result.textContent = `Result: ${e.detail.item.label}`;
    dropdown.removeAttribute('open');
    dropdown.render();
  });

  dropdown.addEventListener('close', () => {
    dropdown.removeAttribute('open');
    dropdown.render();
  });
</script>
```

## Custom Position

Control the exact position and placement of the dropdown menu.

```html codePreview
<rtgl-view d="h" g="lg">
  <rtgl-button id="dropdown-position-btn">Show Menu (Custom Position)</rtgl-button>
  <rtgl-text id="dropdown-position-result">Result: -</rtgl-text>
</rtgl-view>

<rtgl-dropdown-menu id="dropdown-position"></rtgl-dropdown-menu>

<script>
  const dropdown = document.getElementById('dropdown-position');
  const btn = document.getElementById('dropdown-position-btn');
  const result = document.getElementById('dropdown-position-result');

  btn.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    dropdown.items = [
      { type: 'item', label: 'Option 1' },
      { type: 'item', label: 'Option 2' },
      { type: 'item', label: 'Option 3' }
    ];
    dropdown.setAttribute('open', '');
    dropdown.setAttribute('x', rect.right - 200);
    dropdown.setAttribute('y', rect.bottom + 10);
    dropdown.setAttribute('placement', 'bottom-end');
    dropdown.render();
  });

  dropdown.addEventListener('click-item', (e) => {
    result.textContent = `Result: ${e.detail.item.label}`;
    dropdown.removeAttribute('open');
    dropdown.render();
  });

  dropdown.addEventListener('close', () => {
    dropdown.removeAttribute('open');
    dropdown.render();
  });
</script>
```

## Many Items

Handle longer menus with scrolling support.

```html codePreview
<rtgl-view d="h" g="lg">
  <rtgl-button id="dropdown-many-btn">Show Large Menu</rtgl-button>
  <rtgl-text id="dropdown-many-result">Result: -</rtgl-text>
</rtgl-view>

<rtgl-dropdown-menu id="dropdown-many"></rtgl-dropdown-menu>

<script>
  const dropdown = document.getElementById('dropdown-many');
  const btn = document.getElementById('dropdown-many-btn');
  const result = document.getElementById('dropdown-many-result');

  btn.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const items = [
      { type: 'label', label: 'Menu Items' }
    ];

    for (let i = 1; i <= 20; i++) {
      items.push({ type: 'item', label: `Item ${i}` });
      if (i % 5 === 0) {
        items.push({ type: 'separator' });
      }
    }

    dropdown.items = items;
    dropdown.setAttribute('open', '');
    dropdown.setAttribute('x', rect.left + rect.width / 2);
    dropdown.setAttribute('y', rect.bottom + 5);
    dropdown.setAttribute('placement', 'bottom');
    dropdown.render();
  });

  dropdown.addEventListener('click-item', (e) => {
    result.textContent = `Result: ${e.detail.item.label}`;
    dropdown.removeAttribute('open');
    dropdown.render();
  });

  dropdown.addEventListener('close', () => {
    dropdown.removeAttribute('open');
    dropdown.render();
  });
</script>
```
