---
layout: core/admin
title: All Customers
---

# All Customers

```yaml components
- component: core/table1
  data:
    columns:
      - key: id
        label: ID
        width: 100
      - key: name
        label: Name
        width: 100
      - key: website
        label: Website
        width: 120
      - key: email
        label: Email
        width: 120
      - key: note
        label: Note
        width: 200
    rows: {{ records['customers'].records | json }}
```