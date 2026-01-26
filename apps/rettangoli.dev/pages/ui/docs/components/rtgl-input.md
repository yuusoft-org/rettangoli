---
template: documentation
title: Input
tags: documentation
sidebarId: rtgl-input
---

A versatile input component for collecting user text input with various types and validation options.

## Attributes

| Name | Attribute | Type | Default |
|------|-----------|------|---------|
| Type | `type` | `text`, `email`, `password`, `number`, `tel`, `url` | `text` |
| Size | `s` | `sm`, `md` | `md` |
| Placeholder | `placeholder` | string | - |
| Disabled | `disabled` | boolean | - |
| Value | `value` | string | - |

## Basic Usage

Create a basic text input field for user input collection.

```html codePreview
<rtgl-input></rtgl-input>
```

## Input Types

Choose from various input types to match the data you're collecting and provide appropriate keyboard layouts on mobile devices.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Text Input:</rtgl-text>
  <rtgl-input type="text" placeholder="Enter text"></rtgl-input>

  <rtgl-text c="mu-fg">Email Input:</rtgl-text>
  <rtgl-input type="email" placeholder="email@example.com"></rtgl-input>

  <rtgl-text c="mu-fg">Password Input:</rtgl-text>
  <rtgl-input type="password" placeholder="Enter password"></rtgl-input>

  <rtgl-text c="mu-fg">Number Input:</rtgl-text>
  <rtgl-input type="number" placeholder="Enter number"></rtgl-input>

  <rtgl-text c="mu-fg">Phone Input:</rtgl-text>
  <rtgl-input type="tel" placeholder="Enter phone number"></rtgl-input>

  <rtgl-text c="mu-fg">URL Input:</rtgl-text>
  <rtgl-input type="url" placeholder="https://example.com"></rtgl-input>
</rtgl-view>
```

## Size

Control the input size using predefined values for different layout needs.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Regular (default):</rtgl-text>
  <rtgl-input placeholder="Regular input"></rtgl-input>

  <rtgl-text c="mu-fg">Small:</rtgl-text>
  <rtgl-input s="sm" placeholder="Small input"></rtgl-input>
</rtgl-view>
```

## Placeholder

Provide helpful placeholder text to guide users on what information to enter.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-input placeholder="Please input something..."></rtgl-input>
  <rtgl-input type="email" placeholder="Enter your email address"></rtgl-input>
  <rtgl-input type="password" placeholder="Create a secure password"></rtgl-input>
</rtgl-view>
```

## Disabled

Disable inputs to prevent user interaction when data entry is not available or appropriate.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Disabled Input:</rtgl-text>
  <rtgl-input disabled placeholder="This input is disabled"></rtgl-input>
</rtgl-view>
```

## Value

Set default values for inputs to pre-populate forms with existing data or suggested values.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-text c="mu-fg">Text with value:</rtgl-text>
  <rtgl-input value="Default text" placeholder="Enter text"></rtgl-input>

  <rtgl-text c="mu-fg">Email with value:</rtgl-text>
  <rtgl-input type="email" value="user@example.com" placeholder="Enter email"></rtgl-input>
</rtgl-view>
```
