---
layout: core/admin
---

# Posts

```yaml components
- component: core/table1
  data:
    columns:
      - key: id
        label: ID
        width: 100
      - key: content
        label: Content
        width: 500
      - key: notes
        label: Notes
        width: 120
      - key: date
        label: Date
        width: 120
      - key: status
        label: Status
        width: 120
    rows: {{ records['posts'].records | json }}

```
