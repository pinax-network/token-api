---
"token-api": patch
---

- Filter by minute as the very first filter
- Filter by minute,timestamp afterwards
- Remove ORDER BY *, log_ordinal DESC since it's not in the ORDER BY table (when it's not optimized, causes issues to have no-ORDER BY fields in the ORDER BY)
