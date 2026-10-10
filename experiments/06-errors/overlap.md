# An await allows actions to overlap

RivetKit 2.3.17. Question posed before running: if both actions read 0 before
either writes, will the final count be 1 or 2? The illustrative expectation was
1; no additional user prediction was received during this experiment.

## Run

From the root, terminal 1: `bun run dev`. Terminal 2:

```sh
bun run overlap -- my-overlap-counter
```

A fresh key starts at 0; an existing key starts at its saved count.

## Code and concept

The deliberately flawed `incrementAfterWait(c, label)` reads the count into a
local variable, awaits a one-second timer, and writes `oldCount + 1`. The timer
stands in for waiting for a network or other asynchronous operation. `await`
yields execution; it does not lock the actor against other actions.

`apps/runner/src/experiments/06-errors-and-concurrency/overlap.ts` connects two clients to the same actor, prepares both
connections with reads, then issues both actions before awaiting either. Each
action returns the value it read and wrote. The client checks the read values to
establish that the requests overlapped, rather than assuming the timer guarantees
overlap. If request arrival is delayed enough, the overlap assertion fails and
asks for a retry. This is a teaching action, not a recommended increment.

## Observed

`bun run overlap -- overlap-check-20261010` exited 0. Client:

```text
Count before: 0
A read/wrote: { read: 0, written: 1 }
B read/wrote: { read: 0, written: 1 }
Final count: 1
Observed lost update: two increments increased the count by only one
```

Worker:

```text
[counter] A read 0, waiting
[counter] B read 0, waiting
[counter] A wrote 1
[counter] B wrote 1
```

B ran while A awaited the timer. Both wrote from the same stale local value.
This is called a lost update. It is not two JavaScript statements running at the
same instant; the actions interleave around their await points. Our original
`increment` keeps its state update synchronous and previously counted both calls.

The [official 2.3.17 actions documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/actions.mdx)
says actions run in parallel by default and points to queues for concurrency
control. We have not implemented queues, locking, or a fix in this experiment.
The test does not address retries, crashes, or transactions with external systems.

v3's asynchronous actions in `packages/rivet/src/actor.ts` need their specific
await points and coordination inspected; this experiment does not claim that
v3 has this particular bug.

## Important clarification: local variables, shared state, and OT

The “paper” analogy refers to `oldCount`, a local variable inside each actor
action invocation. It is not a client-side read. Clients request the action;
the worker executes it. A and B have separate local `oldCount` values, but both
access the same actor's `c.state.count`.

```ts
const oldCount = c.state.count;
await somethingSlow();
c.state.count = oldCount + 1;
```

Both invocations can remember 0 before either writes. Each then assigns 1.
The second assignment does not increment the first assignment's result.

Using `await` in an action is allowed. The dangerous pattern here is using a
shared-state value saved before an await to overwrite state after the await.
For a simple increment, waiting first and then updating synchronously avoids
this particular stale-read problem:

```ts
await somethingSlow();
c.state.count += 1;
return c.state.count;
```

This alternative has not yet been tested in the playground. It is not a general
solution for multi-step operations, external side effects, retries, or crashes.
Operations that must stay coordinated across awaits may need explicit sequencing,
such as a queue; its version-specific behavior must be verified before use.

Rivet does not automatically apply operational transformation (OT) to arbitrary
state assignments. OT is a technique for transforming concurrent edits so they
can be combined, often in collaborative editors. Rivet does not infer that two
assignments of `count = 1` meant two increments. Shared actor identity alone does
not serialize whole asynchronous actions.
