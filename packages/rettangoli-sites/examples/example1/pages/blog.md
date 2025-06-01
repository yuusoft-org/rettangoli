---
layout: core/base
layoutConfiguration:
  size: small
title: Sitic Blog
---

```yaml components
- component: core/spacer
  data:
    height: 24
- component: core/articlelist
  data:
    title: Blog List Title
    subtitle: Latest news and updates from this blog
    back:
      href: /
      label: Back
    items: {{ collections['blog-post'] | json }}
- component: core/spacer
  data:
    height: 100
``` 