---
template: documentation
title: Dialog
tags: documentation
sidebarId: rtgl-dialog
---

A modal dialog component that overlays content and provides a focused interaction area for users.

## Attributes

| Name | Attribute | Type | Default |
|------|-----------|------|---------|
| Open | `open` | boolean | - |
| Size | `s` | `sm`, `md`, `lg` | `md` |

## Events

| Name | Description |
|------|-------------|
| `close` | Fired when the dialog is closed (via overlay click or ESC key) |

## Basic Usage

Create a dialog with content using the `slot="content"` attribute. The dialog can be controlled programmatically using the `open` attribute.

```html codePreview
<rtgl-dialog id="dialog-basic">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Dialog Content</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit.</rtgl-text>
    <rtgl-button variant="se">Close Dialog</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  const dialogBasic = document.getElementById('dialog-basic');

  // Open dialog
  dialogBasic.setAttribute('open', '');

  // Close dialog
  dialogBasic.removeAttribute('open');
</script>
```

## Open State

Control the dialog's visibility using the `open` attribute. The dialog starts closed by default.

```html codePreview
<rtgl-button id="open-btn-state">Open Dialog</rtgl-button>
<rtgl-dialog id="dialog-state">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Dialog Content</rtgl-text>
    <rtgl-text c="mu">This dialog starts closed and opens when clicked.</rtgl-text>
    <rtgl-button variant="se" id="close-btn-state">Close Dialog</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  const openBtnState = document.getElementById('open-btn-state');
  const closeBtnState = document.getElementById('close-btn-state');
  const dialogState = document.getElementById('dialog-state');

  openBtnState.addEventListener('click', () => {
    dialogState.setAttribute('open', '');
  });

  closeBtnState.addEventListener('click', () => {
    dialogState.removeAttribute('open');
  });

  // Listen for dialog close events (overlay click or ESC key)
  dialogState.addEventListener('close', () => {
    dialogState.removeAttribute('open');
  });
</script>
```

## Size

Control the dialog size using predefined values for different content needs.

```html codePreview
<rtgl-view g="md">
  <rtgl-button id="open-sm-size">Small Dialog</rtgl-button>
  <rtgl-button id="open-md-size">Medium Dialog</rtgl-button>
  <rtgl-button id="open-lg-size">Large Dialog</rtgl-button>
</rtgl-view>

<rtgl-dialog id="dialog-sm-size" s="sm">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Small Dialog</rtgl-text>
    <rtgl-text c="mu">Compact dialog for minimal content</rtgl-text>
    <rtgl-button variant="se" id="close-sm-size">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<rtgl-dialog id="dialog-md-size" s="md">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Medium Dialog</rtgl-text>
    <rtgl-text c="mu">Standard dialog size for most use cases</rtgl-text>
    <rtgl-button variant="se" id="close-md-size">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<rtgl-dialog id="dialog-lg-size" s="lg">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Large Dialog</rtgl-text>
    <rtgl-text c="mu">Spacious dialog for complex content</rtgl-text>
    <rtgl-button variant="se" id="close-lg-size">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  // Small dialog
  document.getElementById('open-sm-size').addEventListener('click', () => {
    document.getElementById('dialog-sm-size').setAttribute('open', '');
  });
  document.getElementById('close-sm-size').addEventListener('click', () => {
    document.getElementById('dialog-sm-size').removeAttribute('open');
  });

  // Medium dialog
  document.getElementById('open-md-size').addEventListener('click', () => {
    document.getElementById('dialog-md-size').setAttribute('open', '');
  });
  document.getElementById('close-md-size').addEventListener('click', () => {
    document.getElementById('dialog-md-size').removeAttribute('open');
  });

  // Large dialog
  document.getElementById('open-lg-size').addEventListener('click', () => {
    document.getElementById('dialog-lg-size').setAttribute('open', '');
  });
  document.getElementById('close-lg-size').addEventListener('click', () => {
    document.getElementById('dialog-lg-size').removeAttribute('open');
  });
</script>
```

## Adaptive Centering

The dialog automatically adjusts its vertical positioning based on content length. Short content is centered, while long content starts near the top with proper margin.

```html codePreview
<rtgl-view g="md">
  <rtgl-button id="open-short-center">Short Content</rtgl-button>
  <rtgl-button id="open-long-center">Long Content</rtgl-button>
</rtgl-view>

<!-- Short content dialog -->
<rtgl-dialog id="dialog-short-center">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Short Content Dialog</rtgl-text>
    <rtgl-text c="mu">This dialog has short content and should be vertically centered.</rtgl-text>
    <rtgl-button variant="se" id="close-short-center">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<!-- Long content dialog -->
<rtgl-dialog id="dialog-long-center">
  <rtgl-view slot="content" g="md" style="max-width: 600px;">
    <rtgl-text s="lg">Long Content Dialog</rtgl-text>
    <rtgl-text c="mu">This dialog has long content and should start near the top with a 40px margin.</rtgl-text>
    <rtgl-text>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</rtgl-text>
    <rtgl-text>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</rtgl-text>
    <rtgl-text>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</rtgl-text>
    <rtgl-text>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</rtgl-text>
    <rtgl-text>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</rtgl-text>
    <rtgl-button variant="se" id="close-long-center">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  // Short content dialog
  document.getElementById('open-short-center').addEventListener('click', () => {
    document.getElementById('dialog-short-center').setAttribute('open', '');
  });
  document.getElementById('close-short-center').addEventListener('click', () => {
    document.getElementById('dialog-short-center').removeAttribute('open');
  });

  // Long content dialog
  document.getElementById('open-long-center').addEventListener('click', () => {
    document.getElementById('dialog-long-center').setAttribute('open', '');
  });
  document.getElementById('close-long-center').addEventListener('click', () => {
    document.getElementById('dialog-long-center').removeAttribute('open');
  });
</script>
```

## Scroll

When content exceeds the dialog height, scrolling is automatically enabled for the content area while keeping the header and actions accessible.

```html codePreview
<rtgl-button id="open-scroll-example">Open Scrollable Dialog</rtgl-button>
<rtgl-dialog id="dialog-scroll-example" s="md">
  <rtgl-view slot="content" g="md">
    <rtgl-text s="lg">Scrollable Dialog</rtgl-text>
    <rtgl-text c="mu">This dialog contains a lot of content that will overflow and become scrollable.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-text c="mu">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</rtgl-text>
    <rtgl-button variant="se" id="close-scroll-example">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  document.getElementById('open-scroll-example').addEventListener('click', () => {
    document.getElementById('dialog-scroll-example').setAttribute('open', '');
  });
  document.getElementById('close-scroll-example').addEventListener('click', () => {
    document.getElementById('dialog-scroll-example').removeAttribute('open');
  });
</script>
```

## Dialog with Form

Dialogs work seamlessly with forms for collecting user input. Forms can be dynamically created and inserted into the dialog content slot.

```html codePreview
<rtgl-button id="open-form-example">Open Form Dialog</rtgl-button>
<rtgl-dialog id="dialog-form-example"></rtgl-dialog>

<script>
  const dialogFormExample = document.getElementById('dialog-form-example');
  const formExample = document.createElement('rtgl-form');

  formExample.setAttribute('id', 'form-example');
  formExample.setAttribute('slot', 'content');

  formExample.defaultValues = {
    name: '',
    email: '',
    favoriteColor: '#3498db'
  };

  formExample.form = {
    title: 'User Registration',
    description: 'Please fill out your information',
    fields: [{
      id: 'name',
      fieldName: 'name',
      inputType: 'inputText',
      label: 'Full Name',
      description: 'Enter your full name',
      placeholder: 'John Doe'
    }, {
      id: 'email',
      fieldName: 'email',
      inputType: 'inputText',
      label: 'Email Address',
      description: 'Enter your email address',
      placeholder: 'john@example.com'
    }, {
      id: 'favoriteColor',
      fieldName: 'favoriteColor',
      inputType: 'colorPicker',
      label: 'Favorite Color',
      description: 'Pick your favorite color',
      value: '#3498db'
    }],
    actions: {
      buttons: [{
        id: 'cancel',
        content: 'Cancel',
      }, {
        id: 'submit',
        variant: 'pr',
        content: 'Register',
      }],
    }
  };

  formExample.addEventListener('action-click', (e) => {
    if (e.detail.actionId === 'cancel') {
      dialogFormExample.removeAttribute('open');
    } else if (e.detail.actionId === 'submit') {
      console.log('Form submitted with values:', e.detail.formValues);
      dialogFormExample.removeAttribute('open');
    }
  });

  document.getElementById('open-form-example').addEventListener('click', () => {
    // First open the dialog to create the slot
    dialogFormExample.setAttribute('open', '');

    // Then append and render the form
    if (!formExample.parentNode) {
      dialogFormExample.appendChild(formExample);
      formExample.render();
    }
  });

  // Listen for dialog close events (overlay click or ESC key)
  dialogFormExample.addEventListener('close', () => {
    dialogFormExample.removeAttribute('open');
  });
</script>
```