# Two simultaneous increments

RivetKit 2.3.17. User prediction: the operations happen sequentially. Our precise
test expectation: returns 1 and 2 in either order, final count 2 on a fresh actor.

## Run

From the root, start `bun run dev` in one terminal. In another:

```sh
bun run simultaneous -- my-simultaneous-counter
```

The client connects A first and reads the count, then connects B and reads it.
This prepares two connections to the same actor before sending either increment.
It calls both increments before awaiting either result. `Promise.all` waits for
both responses; its result positions follow the input promises, not completion
order. Assertions check both returned values and the final count. Existing keys
start from their saved count; the script checks that count plus two.

## Observed

`bun run simultaneous -- simultaneous-check-20261010` exited 0:

```text
Count before: 0
A increment returned: 2
B increment returned: 1
Final count: 2
PASS: both increments were counted
```

B was processed first in this run even though the client invoked A's call first.
Both increments were counted. This is two outstanding requests, not a guarantee
that network arrivals occur at exactly the same instant.

The [official 2.3.17 actions documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/actions.mdx)
says actions run in parallel by default. Our increment has no `await`; the
JavaScript read/change/return code runs without yielding. This result does not
establish serialization of whole asynchronous actions, durable exactly-once
execution across retries, or operational transformation. An action that reads
state, awaits something, then writes can behave differently; that is the next
separate experiment.

In v3, `packages/rivet/src/actor.ts` contains asynchronous actions, including
message submission. This simple test does not establish their concurrency
behavior; their awaits and coordination require separate inspection.
