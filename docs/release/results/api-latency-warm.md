
| request (warm server, 10,000 rows, 60 categories) | n | errors | p50 ms | p95 ms | max ms | p95 < 500? |
|---|---|---|---|---|---|---|
| search: first page, default sort | 60 | 0 | 8 | 217 | 222 | yes |
| search: deep page (offset 9950) | 60 | 0 | 16 | 18 | 18 | yes |
| search: sort amount DESC | 60 | 0 | 12 | 13 | 13 | yes |
| search: sort category name ASC | 60 | 0 | 14 | 16 | 17 | yes |
| search: category + amount range | 60 | 0 | 5 | 6 | 6 | yes |
| search: text CONTAINS 'Title 12' | 60 | 0 | 21 | 22 | 23 | yes |
| search: OR of 20 categories | 60 | 0 | 7 | 8 | 12 | yes |
| analyze: MONTH, whole window | 60 | 0 | 25 | 31 | 35 | yes |
| analyze: YEAR, whole window | 60 | 0 | 25 | 28 | 31 | yes |
| analyze: MONTH + filter | 60 | 0 | 24 | 26 | 28 | yes |

30 overlapping searches (rapid filter changes) completed in 189ms
