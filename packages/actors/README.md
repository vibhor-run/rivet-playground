# Actors

`src/index.ts` defines the counter actor with `state: { count: 0 }` and two actions.

- `increment(c)` changes `c.state.count` and returns its new value.
- `getCount(c)` reads `c.state.count` without changing it.

`c` is Rivet's context for the actor executing the action. `state` supplies the
initial value for a new actor; it does not reset the count on every action.

For the sleep experiment, `options.sleepTimeout` is `5_000` milliseconds.
`onWake` and `onSleep` print the count as the actor starts and begins sleeping.
These lifecycle hooks are callbacks Rivet invokes, not client-callable actions.
Idle sleep releases the actor's active runtime; the worker process keeps running.
The logs observe lifecycle transitions, not a measurement of process RAM usage.
