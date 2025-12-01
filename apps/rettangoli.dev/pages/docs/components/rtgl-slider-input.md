---
template: documentation
title: Slider Input
tags: documentation
sidebarId: rtgl-slider-input
---

A combined slider and input component that allows users to select a numeric value either by dragging a slider or entering a value directly.

## Attributes

| Name | Attribute | Type | Default |
|-----------|------|---------|---------|
| Value | `value` | string | `0` |
| Min | `min` | string | `0` |
| Max | `max` | string | `100` |
| Step | `step` | string | `1` |
| Width | `w` | string | - |

## Events

| Name | Event | Detail |
|-----------|------|---------|
| Value Change | `slider-input-value-change` | `{ value: number }` |

## Basic Usage

Display a slider input with default range (0-100).

```html codePreview
<rtgl-view g="lg" fw="w" p="lg">
  <rtgl-slider-input id="slider-input-basic"></rtgl-slider-input>
  <rtgl-text id="slider-input-basic-value">Value: 0</rtgl-text>
</rtgl-view>

<script>
  const sliderInput = document.getElementById('slider-input-basic');
  const valueText = document.getElementById('slider-input-basic-value');

  sliderInput.addEventListener('slider-input-value-change', (e) => {
    valueText.textContent = `Value: ${e.detail.value}`;
  });
</script>
```

## With Default Value

Set an initial value for the slider input.

```html codePreview
<rtgl-view g="lg" fw="w" p="lg">
  <rtgl-slider-input id="slider-input-default" value="20"></rtgl-slider-input>
  <rtgl-text id="slider-input-default-value">Value: 20</rtgl-text>
</rtgl-view>

<script>
  const sliderInput = document.getElementById('slider-input-default');
  const valueText = document.getElementById('slider-input-default-value');

  sliderInput.addEventListener('slider-input-value-change', (e) => {
    valueText.textContent = `Value: ${e.detail.value}`;
  });
</script>
```

## Custom Range and Step

Configure custom minimum, maximum, and step values.

```html codePreview
<rtgl-view g="lg" fw="w" p="lg">
  <rtgl-slider-input id="slider-input-custom" min="-1" max="1" step="0.1"></rtgl-slider-input>
  <rtgl-text id="slider-input-custom-value">Value: 0</rtgl-text>
</rtgl-view>

<script>
  const sliderInput = document.getElementById('slider-input-custom');
  const valueText = document.getElementById('slider-input-custom-value');

  sliderInput.addEventListener('slider-input-value-change', (e) => {
    valueText.textContent = `Value: ${e.detail.value}`;
  });
</script>
```

## Custom Width

Set a custom width for the slider input component.

```html codePreview
<rtgl-view g="lg" fw="w" p="lg">
  <rtgl-slider-input id="slider-input-width" w="600"></rtgl-slider-input>
  <rtgl-text id="slider-input-width-value">Value: 0</rtgl-text>
</rtgl-view>

<script>
  const sliderInput = document.getElementById('slider-input-width');
  const valueText = document.getElementById('slider-input-width-value');

  sliderInput.addEventListener('slider-input-value-change', (e) => {
    valueText.textContent = `Value: ${e.detail.value}`;
  });
</script>
```
