# Wait first, then update the current count

RivetKit 2.3.17. Expected result before execution: both increments are counted,
with a final count of 2 on a fresh actor.

## Run

From the playground root, terminal 1: `bun run dev`. Terminal 2:

```sh
bun run wait-first -- my-fixed-counter
```

The script prepares two connections, sends both `waitThenIncrement` calls without
waiting for either, then checks the results and final count relative to the
starting value. A fresh key starts at 0; an existing key retains its state.

The new teaching action waits one second before reading and updating state:

```ts
await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
c.state.count += 1;
return c.state.count;
```

There is no await between reading the current count and writing its increment.
The previous flawed action remains available for comparison.

## Observed

`bun run wait-first -- wait-first-check-20261010` exited 0:

```text
Count before: 0
A increment returned: 2
B increment returned: 1
Final count: 2
PASS: both increments were counted
```

Moving the read/change after the wait avoids the stale local value in this
example. This does not serialize the complete actions, coordinate external
side effects, or establish crash/retry guarantees. Type checking also passed.

## What queues would add

Rivet queues hold durable messages for a particular actor. A run loop can take
one message, finish its work (including awaits), then take the next. Sequential
processing comes from that consumer loop; merely declaring a queue does not
prevent ordinary actions or other consumers from changing state concurrently.

Example idea, not implemented here: enqueue A and B; process A completely, then
process B. B would read the state after A's update, even if A waits mid-operation.
This is explicit sequencing, not automatic operational transformation (OT).

The [official 2.3.17 queue documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/queues.mdx)
says pending messages survive sleep/restart, but ordinary queue messages are
removed when received, not when completed. A crash during processing therefore
does not automatically redeliver that received message. Durable workflows are a
separate recovery concept we will test later. No queue was implemented or tested
in this exercise.

## Correction after inspecting the runtime

Our consumer uses `completable: true`. Such messages stay stored until
`message.complete()`, and can be received again after a crash before completion.
Non-completable messages are removed on receipt. The earlier general no-replay
statement, based on stale documentation, does not apply to our consumer. See the
[source-backed crash investigation](queue-crash.md).
