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

We pause after each experiment before moving on. Events, lifecycle details,
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
