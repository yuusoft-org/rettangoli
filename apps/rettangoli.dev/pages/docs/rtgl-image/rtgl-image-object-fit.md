---
layout: documentation.html
title: Object Fit
tags: [documentation]
---

The `<rtgl-image>` component provides control over how the image content fits within its container using the `of` attribute, which corresponds to the CSS `object-fit` property.

## Object Fit Attribute

| Attribute | Values | Description |
|-----------|--------|-------------|
| `of` | `con` | Contains the image within the container while maintaining aspect ratio (equivalent to `object-fit: contain`) |
| | `cov` | Covers the entire container while maintaining aspect ratio, potentially cropping the image (equivalent to `object-fit: cover`) |
| | `none` | Does not resize the image to fit the container (equivalent to `object-fit: none`) |

## Usage Examples

### Default Behavior

Without specifying an `of` attribute, images will fill their container:

```html
<rtgl-image wh="100" src="/path/to/image.jpg"></rtgl-image>
```

### Contain Mode

The image will be scaled to maintain its aspect ratio while fitting entirely within the container:

```html
<rtgl-image of="con" wh="100" src="/path/to/image.jpg"></rtgl-image>
```

This is useful when you want to show the entire image without any cropping, even if it means leaving empty space within the container.

### Cover Mode

The image will be scaled to maintain its aspect ratio while filling the entire container, potentially cropping parts of the image:

```html
<rtgl-image of="cov" wh="100" src="/path/to/image.jpg"></rtgl-image>
```

This is useful for creating uniform-sized image thumbnails or hero images where filling the entire space is more important than showing the complete image.

### None Mode

The image will not be resized to fit the container:

```html
<rtgl-image of="none" wh="100" src="/path/to/image.jpg"></rtgl-image>
```

This displays the image at its original size, potentially causing overflow if the image is larger than its container.

## Combining with Background Color

When using `contain` mode, you might want to add a background color to fill the empty space:

```html
<rtgl-image of="con" wh="100" bgc="suc" src="/path/to/image.jpg"></rtgl-image>
```

## Practical Example

Here's a comparison of different object-fit modes with the same container size:

```html
<rtgl-view d="h" g="l">
  <!-- Default -->
  <rtgl-image bgc="suc" wh="100" src="/path/to/image.jpg"></rtgl-image>
  
  <!-- Contain -->
  <rtgl-image bgc="suc" of="con" wh="100" src="/path/to/image.jpg"></rtgl-image>
  
  <!-- Cover -->
  <rtgl-image bgc="suc" of="cov" wh="100" src="/path/to/image.jpg"></rtgl-image>
  
  <!-- None -->
  <rtgl-image bgc="suc" of="none" wh="100" src="/path/to/image.jpg"></rtgl-image>
</rtgl-view>
```

## Use Cases

- **Cover (`of="cov"`)**: Best for hero images, thumbnails, and profile pictures where a consistent size and filled space is important.
- **Contain (`of="con"`)**: Best for product images, diagrams, or any image where seeing the entire content is critical.
- **None (`of="none"`)**: Best for icons or images that should maintain their exact size regardless of container. 