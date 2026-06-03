# Stress Harness

Date: 2026-06-03

## Stress Cases

| Case | Bound | Result |
|---|---|---|
| queue concurrency peak | 3 concurrent, 20 tasks | peak=3, all complete |
| queue burst load | 2 concurrency, 50 tasks | all 50 complete |
| queue rejection resilience | 2 concurrency, 10 tasks (4 reject) | 6 complete, 4 errors, queue still functional |
| knowledge store loadKB cycle | 10 iterations (5 success, 5 fail) | kbLoading=false at end |
| knowledge store delete cascade | 20 sequential deletes | 0 remaining, kbLoading=false |
| knowledge store failed deletes | 5 deletes all reject | 5 errors caught, store usable |
| batch store loadRuns cycle | 5 iterations (3 success, 2 fail) | runsLoading=false at end |
| batch store reset | populated state | all fields cleared |
| batch store cancelAll | 4 items (pending, analyzing, done, error) | pending+analyzing cancelled, done+error untouched |
| unhandled rejection guard | 20 concurrent failing requests | all resolved, kbLoading=false |
| rapid create-delete cycle | 15 create+delete pairs | 0 remaining, no leaked state |

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `npm run test:stress` | 11 passed | 814ms total |
| `npm run test:unit` | 224 passed | 3.65s total |

## Gaps

- No real WebSocket/SSE streaming stress (would require live server)
- No memory leak detection (would require --expose-gc or heap snapshots)
- No disk I/O stress for SQLite concurrent writes
- Concurrency tests use setTimeout-based delays, not real network latency
