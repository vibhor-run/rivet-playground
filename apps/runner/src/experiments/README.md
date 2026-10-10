# Find an experiment

Run commands from the playground root with `bun run dev` in another terminal.
Each client imports only the registry's types; the runner executes actor code.

| Lesson | Client file | Command |
| --- | --- | --- |
| Counter | `01-counter/client.ts` | `bun run counter -- KEY` |
| Identity (local only) | `02-identity/client.ts` | `bun run identity -- KEY` |
| Persistence read (local only) | `03-persistence/read.ts` | `bun run read -- KEY` |
| Destruction | `03-persistence/destruction.ts` | `bun run destruction` |
| Events | `04-events/client.ts` | `bun run events -- KEY` |
| Errors | `06-errors-and-concurrency/errors.ts` | `bun run errors -- KEY` |
| Simultaneous synchronous updates | `06-errors-and-concurrency/simultaneous.ts` | `bun run simultaneous -- KEY` |
| Lost update across await | `06-errors-and-concurrency/overlap.ts` | `bun run overlap -- KEY` |
| Wait before updating | `06-errors-and-concurrency/wait-first.ts` | `bun run wait-first -- KEY` |
| Sequential queue processing | `06-errors-and-concurrency/queues.ts` | `bun run queues -- KEY` |

Actor definitions are in `packages/actors/src/01-counter/actor.ts` and
`packages/actors/src/06-queues/actor.ts`. `packages/actors/src/index.ts` exports
them; `apps/runner/src/registry.ts` registers them and `src/index.ts` starts the
runner. The ordinary counter accumulates the actions used by earlier lessons;
only the queue lesson uses the separate queued counter.

Detailed procedures, results, limits, and official references are in the root
`experiments/` notebook. Lesson 5's basic lifecycle behavior was exercised during
the persistence lessons; no separate lesson 5 client has been added.
