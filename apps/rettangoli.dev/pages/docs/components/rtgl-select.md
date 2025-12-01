---
template: documentation
title: Select
tags: documentation
sidebarId: rtgl-select
---

A dropdown selection component that allows users to choose from a list of options.

## Properties

| Name | Property | Type | Default |
|-----------|------|---------|---------|
| Options | `options` | Array<{value: string, label: string}> | `[]` |
| Selected Value | `selectedValue` | string | - |
| Placeholder | `placeholder` | string | - |
| Add Option | `addOption` | {label?: string} | - |

## Attributes

| Name | Attribute | Type | Default |
|-----------|------|---------|---------|
| No Clear | `no-clear` | boolean | `false` |

## Events

| Name | Event | Detail |
|-----------|------|---------|
| Option Selected | `option-selected` | `{ value: string, label: string }` |
| Add Option Selected | `add-option-selected` | - |
| Select Change | `select-change` | `{ value: string, label: string }` |

## Basic Usage

Display a select dropdown with a placeholder and list of options.

```html codePreview
<rtgl-view g="lg" p="lg" wh="f" fw="w">
  <rtgl-select id="select-basic" />
</rtgl-view>

<script>
  const select = document.getElementById('select-basic')
  select.placeholder = 'Select an option'
  select.options = [
    { value: "1", label: 'Option 1' },
    { value: "2", label: 'Option 2' },
    { value: "3", label: 'Option 3' },
  ]
  select.render();
</script>
```

## With Selected Value

Set a default selected value and optionally disable the clear button.

```html codePreview
<rtgl-view g="lg" p="lg" wh="f" fw="w" d="v">
  <rtgl-text>With clear button:</rtgl-text>
  <rtgl-select id="select-value"></rtgl-select>
  <rtgl-text>Without clear button:</rtgl-text>
  <rtgl-select id="select-no-clear" no-clear></rtgl-select>
</rtgl-view>

<script>
  const select = document.getElementById('select-value')
  select.selectedValue = "2"
  select.options = [
    { value: "1", label: 'Option 1' },
    { value: "2", label: 'Option 2' },
    { value: "3", label: 'Option 3' },
  ]
  select.render();

  const selectNoClear = document.getElementById('select-no-clear')
  selectNoClear.selectedValue = "2"
  selectNoClear.options = [
    { value: "1", label: 'Option 1' },
    { value: "2", label: 'Option 2' },
    { value: "3", label: 'Option 3' },
  ]
  selectNoClear.render();
</script>
```

## With Add Option

Enable users to add new options to the select list.

```html codePreview
<rtgl-view g="lg" p="lg" wh="f" fw="w" d="v">
  <rtgl-text>Select with default "Add..." option:</rtgl-text>
  <rtgl-select id="select-with-add" />
  <rtgl-text>Select with custom add label:</rtgl-text>
  <rtgl-select id="select-custom-label" />
</rtgl-view>

<script>
  const selectWithAdd = document.getElementById('select-with-add');
  selectWithAdd.setAttribute('placeholder', 'Select or add an option');
  selectWithAdd.options = [
    { value: "1", label: 'Option 1' },
    { value: "2", label: 'Option 2' },
    { value: "3", label: 'Option 3' },
  ];
  selectWithAdd.addOption = {};
  selectWithAdd.render();

  const selectCustomLabel = document.getElementById('select-custom-label');
  selectCustomLabel.setAttribute('placeholder', 'Choose a fruit');
  selectCustomLabel.options = [
    { value: "apple", label: 'Apple' },
    { value: "banana", label: 'Banana' },
    { value: "orange", label: 'Orange' },
  ];
  selectCustomLabel.addOption = { label: 'Add new fruit' };
  selectCustomLabel.render();

  selectWithAdd.addEventListener('add-option-selected', (e) => {
    console.log('add-option-selected triggered');
  });

  selectCustomLabel.addEventListener('add-option-selected', (e) => {
    console.log('custom select add-option-selected triggered');
  });
</script>
```
