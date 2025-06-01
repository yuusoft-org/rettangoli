---
layout: core/base
layoutConfiguration:
  size: small
title: Sitic Index
---

```yaml components=true
- component: core/spacer
  data:
    height: 100
- component: core/hero1
  data:
    hero:
      title: Hero Title
      message: Hero subtile message description
- component: core/spacer
  data:
    height: 100
- component: core/sectionlist1
  data:
    sectionTitle: Section Title One
    items:
      - label: Section Item One
        description: Section Description
        href: /product-one/about
- component: core/sectionlist1
  data:
    sectionTitle: Section Title Two
    items:
      - label: Section Item Two
        description: Lorem ipsum 
        href: /product-one/about
      - label: Section Item Three
        description: Lorem ipsum
        href: /product-two/about
```
