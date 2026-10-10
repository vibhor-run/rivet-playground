# Queue: finish one operation before taking the next

RivetKit 2.3.17. Prediction prompt: with one processing loop, do two read/wait/write
operations finish at 1 or 2? Expected: 2. No user prediction was received before
execution.

## Run

From the root, terminal 1:

```sh
bun run dev
```

Terminal 2:

```sh
bun run queues -- my-queued-counter
```

Fresh keys start at zero; existing keys retain state.

## Where the code lives

- `packages/actors/src/06-queues/actor.ts`: a separate actor with its own state,
  queue declaration, processing loop, and read-only `getCount` action.
- `apps/runner/src/registry.ts`: registers `queuedCounter` alongside `counter`.
- `apps/runner/src/experiments/06-errors-and-concurrency/queues.ts`: two clients publish messages before awaiting either
  completion and verify both responses and the final count.

## How it works

`queue<{ label: string }, { count: number }>()` declares the message body and
completion response types. It does not itself start processing.

`run` is the actor's long-running handler. `for await` asks `c.queue.iter` for
messages. Our loop takes one message, reads state, waits one second, writes state,
and awaits `message.complete({ count })`. Only then does the loop take another
message. The label identifies the sender in the worker logs.

The client calls `handle.send("increment", { label }, { wait: true, timeout: 10_000 })`.
Unlike calling an action, this submits a queue message. `wait: true` makes the
client wait for completion; `message.complete` provides its response. The script
checks the `completed` status and response; other outcomes fail the test.

`getCount` remains an ordinary read action. We expose no mutation action on this
actor, so these test mutations all go through the one processing loop. Ordinary
actions or additional consumers are not automatically serialized by this loop.

## Observed

`bun run queues -- queues-check-20261010`, exit code 0:

```text
Count before: 0
A completion: { count: 1 }
B completion: { count: 2 }
Final count: 2
PASS: both read/wait/write operations were counted
```

Worker logs:

```text
[queued counter] A read 0, waiting
[queued counter] A wrote 1
[queued counter] B read 1, waiting
[queued counter] B wrote 2
```

Compared with the earlier lost update, B now reads after A writes. Sender A/B
order is not promised by this test. The one consumer's processing is sequential.
Type checking passed.

## Limits and official references

Pending messages are durable, but ordinary queue messages are removed when
received, not on completion. This test does not cover crashes, restart recovery,
timeouts during work, automatic retries, or exactly-once side effects.

APIs checked against [official 2.3.17 queue documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/queues.mdx)
and its [request/reply actor](https://github.com/rivet-dev/rivet/blob/v2.3.17/examples/docs/actors-queues/request-reply/index.ts)
and [client example](https://github.com/rivet-dev/rivet/blob/v2.3.17/examples/docs/actors-queues/request-reply/client.ts).

No direct `c.queue` usage was found in v3's `packages/rivet/src/actor.ts` during
this exercise. This is a separate learning example, not a claim about how v3
sequences its agent work. Workflows and the v3 mapping remain later exercises.

## Correction after inspecting the runtime

Our consumer uses `completable: true`. Such messages stay stored until
`message.complete()`, and can be received again after a crash before completion.
Non-completable messages are removed on receipt. The earlier general no-replay
statement, based on stale documentation, does not apply to our consumer. See the
[source-backed crash investigation](queue-crash.md).
