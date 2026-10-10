# Actors

`src/01-counter/actor.ts` defines the counter actor with `state: { count: 0 }`.

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

The events exercise declares `countChanged` with `event<number>()`.
After changing the count, `increment` broadcasts the new value to subscribed
connections, then returns it to the action caller. See the
[events record](../../experiments/04-events/README.md).

`fail()` throws a `UserError` with code `lesson_failure` without changing state.
This lets the error exercise check client error handling and subsequent actions.

`incrementAfterWait(c, label)` deliberately reads before a one-second `await`
and writes from that saved value afterward. It demonstrates a lost update when
two actions overlap; use the original synchronous `increment` for normal counting.

`waitThenIncrement(c, label)` waits first, then reads and increments the current
state without yielding during the update. Compare it with `incrementAfterWait`.

`src/06-queues/actor.ts` defines a separate `queuedCounter`. Its single `run` loop
processes increment messages one at a time, including the read/wait/write sequence.
The queue is declared in `queues`; `getCount` is a read-only action. See the
[queue experiment](../../experiments/06-errors/queues.md).
