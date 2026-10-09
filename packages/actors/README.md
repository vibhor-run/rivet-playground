# Actors

`src/index.ts` defines the counter actor with `state: { count: 0 }`.

- `increment(c)` changes `c.state.count` and returns its new value.
- `getCount(c)` reads `c.state.count` without changing it.
- `destroy(c)` calls `c.destroy()` to permanently destroy that actor.

`c` is Rivet's context for the actor executing the action. `state` supplies the
initial value for a new actor; it does not reset the count on every action.

For the sleep experiment, `options.sleepTimeout` is `5_000` milliseconds.
`onWake` and `onSleep` print the count as the actor starts and begins sleeping.
These lifecycle hooks are callbacks Rivet invokes, not client-callable actions.
Idle sleep releases the actor's active runtime; the worker process keeps running.
The logs observe lifecycle transitions, not a measurement of process RAM usage.
`onDestroy` logs the state during graceful destruction. Run `bun run destruction`
from the root to exercise deletion on a dedicated test actor; see the
[experiment record](../../experiments/03-persistence/actor-destruction.md).
