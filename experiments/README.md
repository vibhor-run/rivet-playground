# Rivet experiments

Our learning notebook for Rivet 2.3.17, matching Runable v3. This is a custom
learning sequence, not an official Rivet course. Each record separates documented
behavior, a prediction, the procedure, observed evidence, and its limits.

## Completed experiments

| Experiment | Evidence |
| --- | --- |
| Counter | `getCount`, two increments, `getCount`: `0, 1, 2, 2` |
| Identity | Two clients share a count; a different key has separate state |
| Disconnect | B continues after A disconnects |
| Graceful worker restart | Count `2` survives; engine process unchanged |
| Sleep/wake | Logs show wake at `0`, sleep at `2`, wake at `2` |

Commands and explanations for these earlier experiments are in the
[runner README](../apps/runner/README.md).

## Persistence experiments

1. [Engine restart](03-persistence/engine-restart.md): passed, saved count `2`
   survived restarting both processes with the database retained.
2. [Actor destruction](03-persistence/actor-destruction.md): passed, `get` failed
   and `getOrCreate` created a new actor with count `0` and a different ID.
3. [Forced worker crash](03-persistence/forced-worker-crash.md): saved count `2`
   recovered in two runs; the first post-restart read returned `internal_error`
   in both, and a new read succeeded. Unsaved updates were not tested.

[Events](04-events/README.md): passed, A receives `[1, 2]`; B receives `[1]`
after disconnecting before the second increment.

We pause after each experiment before moving on. Lifecycle details,
errors and simultaneous actions, workflows, and the v3 mapping follow afterward.

## Record format

Each experiment records:

- Question and documented behavior, linked to official versioned sources.
- Prediction before execution.
- Exact commands and what each changes.
- Observed output and process evidence.
- Conclusion, limitations, and the equivalent concept in v3.

Only record observed results as passed. Process-local data and logs stay in the
git-ignored `.local/` folder; never include credentials. The local `read` and
`identity` scripts remain uncommitted as requested.

[Action errors](06-errors/README.md): passed, the client catches `lesson_failure`,
reads the unchanged count, and increments successfully on the same connection.

[Simultaneous increments](06-errors/simultaneous.md): passed, B returned `1`,
A returned `2`, final count `2`. These synchronous increments do not establish
serialization of actions that yield at `await`.

[Overlap across await](06-errors/overlap.md): observed a lost update. Two actions
read `0`, paused, then each wrote `1`; final count `1`.

[Wait before updating](06-errors/wait-first.md): passed, both updates counted;
final count `2`. Includes an introduction to queues; queues remain untested.

[Queued increments](06-errors/queues.md): passed. One processing loop finishes
A's read/wait/write before B reads; final count `2`.

## Code organization

The [client map](../apps/runner/src/experiments/README.md) lists each experiment's
file and command. Actor definitions are separate from the scripts that call them:
`packages/actors/src/01-counter/actor.ts` is the shared counter used by earlier
lessons; `packages/actors/src/06-queues/actor.ts` is the queue example. The actor
package's `src/index.ts` only exports definitions. The runner's `registry.ts`
registers them and its `index.ts` starts the worker.
