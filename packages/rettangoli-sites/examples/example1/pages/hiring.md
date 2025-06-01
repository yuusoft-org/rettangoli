---
layout: core/base
layoutConfiguration:
  size: small
title: Sitic - Hiring
---

```yaml components
- component: core/spacer
  data:
    height: 24
- component: core/articlelist
  data:
    title: Hiring
    subtitle: For for an amazing team
    back:
      href: /
      text: Back
    items: {{ collections['hiring'] | json }}
- component: core/spacer
  data:
    height: 100
``` 