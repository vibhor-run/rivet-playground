# Find an experiment

Run commands from the playground root with `bun run dev` in another terminal.
Each client imports only the registry's types; the runner executes actor code.

| Lesson | Client file | Command |
| --- | --- | --- |
| Counter | `01-counter/client.ts` | `bun run counter -- KEY` |
| Identity | `02-identity/client.ts` | `bun run identity -- KEY` |
| Persistence read | `03-persistence/read.ts` | `bun run read -- KEY` |
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

Queue crash: `06-errors-and-concurrency/queue-crash.ts`, commands
`bun run queue-crash -- send KEY` and `bun run queue-crash -- check KEY`.
Follow the crash procedure in `experiments/06-errors/queue-crash.md`.

Workflow basics: `07-workflows/client.ts`, command `bun run workflow -- KEY`.
Actor definition: `packages/actors/src/07-workflows/actor.ts`. Two steps produce
21 and double it to 42. Recovery is not tested by this script.

Workflow recovery: `07-workflows/recovery.ts`, command
`bun run workflow-recovery -- start|read KEY`. Follow the worker-kill procedure
in `experiments/07-workflows/recovery.md`.

Repeated workflow effect: `07-workflows/repeated-effect.ts`, command
`bun run workflow-effect -- start|read KEY`. Follow the controlled crash procedure
in `experiments/07-workflows/repeated-effect.md`.

Idempotent workflow effect: `07-workflows/idempotent-effect.ts`, command
`bun run workflow-idempotent -- start|read KEY`. The actor inserts an effect row
with a unique job ID before waiting. See the controlled crash procedure in
`experiments/07-workflows/idempotent-effect.md`.
