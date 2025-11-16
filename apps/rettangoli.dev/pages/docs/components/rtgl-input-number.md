---
template: documentation
title: Input Number
tags: documentation
sidebarId: rtgl-input-number
---

A specialized input component for collecting numeric values with built-in validation and constraints.

## Attributes

| Name | Attribute | Type | Default |
|------|-----------|------|---------|
| Size | `s` | `sm`, `md` | `md` |
| Value | `value` | number | - |
| Placeholder | `placeholder` | string | - |
| Disabled | `disabled` | boolean | - |
| Min | `min` | number | - |
| Max | `max` | number | - |
| Step | `step` | number | 1 |

## Events

| Name | Description |
|------|-------------|
| `input-change` | Fired when the input value changes, includes the new value in the detail |

## Basic Usage

Create a basic number input for collecting numeric data.

```html codePreview
<rtgl-input-number id="basic-number-example"></rtgl-input-number>

<script>
  const basicNumberExample = document.getElementById('basic-number-example');
  if (basicNumberExample) {
    basicNumberExample.addEventListener('input-change', (e) => {
      console.log('Number value changed:', { value: e.detail.value });
    });
  }
</script>
```

## Size

Control the input-number size using predefined values for different layout needs.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Regular (default):</rtgl-text>
  <rtgl-input-number id="regular-size-example" placeholder="Enter number"></rtgl-input-number>

  <rtgl-text c="mu-fg">Small:</rtgl-text>
  <rtgl-input-number id="small-size-example" s="sm" placeholder="Small number input"></rtgl-input-number>
</rtgl-view>

<script>
  // Regular size
  const regularSizeExample = document.getElementById('regular-size-example');
  if (regularSizeExample) {
    regularSizeExample.addEventListener('input-change', (e) => {
      console.log('Regular input value changed:', { value: e.detail.value });
    });
  }

  // Small size
  const smallSizeExample = document.getElementById('small-size-example');
  if (smallSizeExample) {
    smallSizeExample.addEventListener('input-change', (e) => {
      console.log('Small input value changed:', { value: e.detail.value });
    });
  }
</script>
```

## Constraints

Set minimum, maximum, and step values to enforce valid numeric input ranges.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Min value (0):</rtgl-text>
  <rtgl-input-number id="min-zero-example" min="0" placeholder="Positive numbers only"></rtgl-input-number>

  <rtgl-text c="mu-fg">Min value (-10):</rtgl-text>
  <rtgl-input-number id="min-neg10-example" min="-10" placeholder="Min -10"></rtgl-input-number>

  <rtgl-text c="mu-fg">Max value (100):</rtgl-text>
  <rtgl-input-number id="max-100-example" max="100" placeholder="Max 100"></rtgl-input-number>

  <rtgl-text c="mu-fg">Step (0.1):</rtgl-text>
  <rtgl-input-number id="step-01-example" step="0.1" placeholder="Step 0.1"></rtgl-input-number>
</rtgl-view>

<script>
  // Min zero
  const minZeroExample = document.getElementById('min-zero-example');
  if (minZeroExample) {
    minZeroExample.addEventListener('input-change', (e) => {
      console.log('Min=0 input value changed:', { value: e.detail.value });
    });
  }

  // Min negative 10
  const minNeg10Example = document.getElementById('min-neg10-example');
  if (minNeg10Example) {
    minNeg10Example.addEventListener('input-change', (e) => {
      console.log('Min=-10 input value changed:', { value: e.detail.value });
    });
  }

  // Max 100
  const max100Example = document.getElementById('max-100-example');
  if (max100Example) {
    max100Example.addEventListener('input-change', (e) => {
      console.log('Max=100 input value changed:', { value: e.detail.value });
    });
  }

  // Step 0.1
  const step01Example = document.getElementById('step-01-example');
  if (step01Example) {
    step01Example.addEventListener('input-change', (e) => {
      console.log('Step=0.1 input value changed:', { value: e.detail.value });
    });
  }
</script>
```

## Default Values

Set initial values for number inputs to pre-populate forms with existing data or suggested values.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Default value (42):</rtgl-text>
  <rtgl-input-number id="default-42-example" value="42"></rtgl-input-number>

  <rtgl-text c="mu-fg">Default value (-5):</rtgl-text>
  <rtgl-input-number id="default-neg5-example" value="-5" min="-10"></rtgl-input-number>

  <rtgl-text c="mu-fg">Default value (3.14):</rtgl-text>
  <rtgl-input-number id="default-pi-example" value="3.14" step="0.01"></rtgl-input-number>
</rtgl-view>

<script>
  // Default 42
  const default42Example = document.getElementById('default-42-example');
  if (default42Example) {
    default42Example.addEventListener('input-change', (e) => {
      console.log('Default 42 input value changed:', { value: e.detail.value });
    });
  }

  // Default -5
  const defaultNeg5Example = document.getElementById('default-neg5-example');
  if (defaultNeg5Example) {
    defaultNeg5Example.addEventListener('input-change', (e) => {
      console.log('Default -5 input value changed:', { value: e.detail.value });
    });
  }

  // Default 3.14
  const defaultPiExample = document.getElementById('default-pi-example');
  if (defaultPiExample) {
    defaultPiExample.addEventListener('input-change', (e) => {
      console.log('Default 3.14 input value changed:', { value: e.detail.value });
    });
  }
</script>
```

## Disabled

Disable number inputs to prevent user interaction when data entry is not available or appropriate.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Disabled number input:</rtgl-text>
  <rtgl-input-number id="disabled-number-example" disabled placeholder="Disabled number"></rtgl-input-number>

  <rtgl-text c="mu-fg">Regular number input:</rtgl-text>
  <rtgl-input-number id="regular-number-example" placeholder="Regular number"></rtgl-input-number>
</rtgl-view>

<script>
  // Disabled input (should not fire events)
  const disabledNumberExample = document.getElementById('disabled-number-example');
  if (disabledNumberExample) {
    disabledNumberExample.addEventListener('input-change', (e) => {
      console.log('Disabled input value changed (should not fire):', { value: e.detail.value });
    });
  }

  // Regular input
  const regularNumberExample = document.getElementById('regular-number-example');
  if (regularNumberExample) {
    regularNumberExample.addEventListener('input-change', (e) => {
      console.log('Regular input value changed:', { value: e.detail.value });
    });
  }
</script>
```