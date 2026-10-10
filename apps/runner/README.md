# Runner

The Bun process that hosts our counter actor.

- `src/registry.ts`: `setup()` registers the counter and configures the local engine.
- `src/index.ts`: `registry.start()` starts the runner.
- `src/experiments/01-counter/client.ts`: a separate client sends four sequential actions to one counter.
  Its `import type` reads the registry's types without running the registry module.

The engine and Bun runner are separate processes on your laptop. The engine
listens on `6430`; the runner keeps a WebSocket connection to it and executes
actor actions without its own listening port. Port `6431` belongs to the engine's
internal peer API, not the runner. `startEngine: true` starts or reuses the local
engine when the runner starts.

Run from the repository root so the root script sets the isolated storage path:

```sh
bun run dev
```

In another terminal at the repository root:

```sh
bun run counter
bun run counter -- another-counter
```

`getOrCreate([key])` returns a handle: a client-side object used to call the
remote actor. `client.dispose()` releases this client's connections when done.

## Exercise 2: identity

Keep `bun run dev` running in one terminal. In another terminal at the repository
root, run:

```sh
bun run identity -- my-shared-counter
```

`src/experiments/02-identity/client.ts` creates two independent clients in one script. Each calls
`getOrCreate([key]).connect()` to open its own WebSocket connection to the same
actor. Predict what B reads after A increments, and whether B can continue after
A disconnects.

For a fresh key, both read `0`; A increments to `1`; B reads `1`. Then A's
connection is disposed, B increments to `2`, and B reads `2`. A different actor
key, `[key, "other"]`, reads `0`. Reusing keys uses existing state; use a new key
for a fresh demonstration.

This verifies actor identity and independent client connections. It does not
verify sleep, process restart, or actor destruction; those are exercise 3.

The connection API was checked against the
[official 2.3.17 source](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/client/actor-handle.ts).
In v3, `packages/rivet/src/experiments/01-counter/client.ts` also opens a connection with
`handle.connect()`, using the session ID as the actor key.

## Exercise 3a: graceful worker restart

`src/experiments/03-persistence/read.ts` uses `get([key])` and `getCount()` to read an existing actor without
creating a replacement or incrementing the count.

Keep `bun run dev` running in terminal 1. In terminal 2, choose an unused key:

```sh
bun run counter -- my-restart-counter
bun run read -- my-restart-counter
```

The first command increments a fresh counter to `2`; the second reads `2`.
Predict the result after restarting the worker. In terminal 1, press Ctrl-C,
then run `bun run dev` again. In terminal 2:

```sh
bun run read -- my-restart-counter
```

It should still read `2`. Keep the engine running and retain `.local/` so this
tests a worker restart only. Check the engine's process ID before and after with:

```sh
lsof -nP -iTCP:6430 -sTCP:LISTEN
```

Verified locally: the worker process changed, the engine process stayed the same,
and the count remained `2`. This is a graceful shutdown test, not a forced crash.
Rivet batches state saves (default interval: one second) and flushes state on
sleep or shutdown; an action response alone does not establish that a save has
completed. See the
[official 2.3.17 state documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/state.mdx).

In v3, Rivet state holds `sessionId` and `ownerUserId`; the conversation is saved
separately in Postgres. The counter demonstrates Rivet state restoration only.
Sleep/wake, engine restart, forced crashes, and destruction remain separate tests.

## Exercise 3b: sleep and wake

Start `bun run dev` in terminal 1. In terminal 2, use a fresh key:

```sh
bun run counter -- my-sleep-counter
```

Terminal 1 prints `[counter] wake` with count `0`. The counter reaches `2`.
Leave it idle until terminal 1 prints `[counter] sleep` with count `2`, about
five seconds after activity ends. Then run in terminal 2:

```sh
bun run read -- my-sleep-counter
```

Terminal 1 prints `[counter] wake` with count `2`; terminal 2 reads `2`.
This sequence was verified with the worker running continuously. `onSleep`
marks the start of sleep, not an exact measurement of when RAM is reclaimed.

The timeout and hooks were checked against Rivet's
[2.3.17 lifecycle documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/lifecycle.mdx).
The default idle timeout is 30 seconds; our five-second setting makes the
experiment quicker. Open connections and active work can prevent idle sleep.
In v3, `packages/rivet/src/actor.ts` rebuilds its temporary session resources
through `createVars` when the actor wakes, while persistent identity stays in
Rivet state. Engine restart and actor destruction have not been tested yet.

## Exercise 4: events

Keep `bun run dev` running. In another terminal:

```sh
bun run events -- my-events-counter
```

`src/experiments/04-events/client.ts` subscribes two clients to `countChanged`. A increments; both
receive the new count. B disconnects; A increments again and only A receives
that event. Fresh-key results: A receives `[1, 2]`; B receives `[1]`.
See the [record and explanation](../../experiments/04-events/README.md).

## Exercise 6a: action errors

With `bun run dev` running, run `bun run errors -- my-error-counter`.
The script catches the deliberate `lesson_failure`, verifies that the count
stayed unchanged, and increments successfully on the same connection.
See the [error experiment](../../experiments/06-errors/README.md).

## Exercise 6b: simultaneous increments

With `bun run dev` running, run `bun run simultaneous -- my-simultaneous-counter`.
Two connected clients issue increments before awaiting either response. A fresh
actor returns `1` and `2` in either order, then reads `2`. See the
[record and concurrency limits](../../experiments/06-errors/simultaneous.md).

## Exercise 6c: overlap across await

With `bun run dev` running, run `bun run overlap -- my-overlap-counter`.
Both actions read, wait one second, then write from the saved value. Observed on
a fresh key: both read `0`, both wrote `1`, final count `1`. Worker logs show
both reads before either write. See the [record](../../experiments/06-errors/overlap.md).

## Exercise 6d: wait before updating

With `bun run dev` running: `bun run wait-first -- my-fixed-counter`.
Both actions wait, then increment the current count synchronously. Fresh-key
result: returns `1` and `2` in either order, final count `2`.
See the [record](../../experiments/06-errors/wait-first.md).

## Exercise 6e: queued increments

With `bun run dev` running, use `bun run queues -- my-queued-counter`.
`src/experiments/06-errors-and-concurrency/queues.ts` sends two messages to the separate queued counter, waits for their
completion responses, and checks a net increase of two. Fresh-key result: count
`2`, with worker logs showing each entire read/wait/write before the next.
See the [queue record](../../experiments/06-errors/queues.md).

## Queue crash experiment

`bun run queue-crash -- send KEY` sends a long operation. Follow the exact
worker-kill procedure in the [record](../../experiments/06-errors/queue-crash.md).
`bun run queue-crash -- inspect KEY` only reads state. Observed recovery differed
from the documentation: the original message replayed. Source inspection
confirmed that `completable: true` retains messages until completion.

## Exercise 7a: first workflow

With `bun run dev` running, run `bun run workflow -- my-first-workflow`.
A fresh actor executes two named steps and returns 42 through a read action.
See the [workflow explanation](../../experiments/07-workflows/README.md).

## Exercise 7b: workflow recovery

Follow the [recovery procedure](../../experiments/07-workflows/recovery.md).
`bun run workflow-recovery -- start KEY` starts a separate workflow actor;
`bun run workflow-recovery -- read KEY` reads the existing actor. After a crash
in step 2, step 1's recorded result was reused and step 2 reran to produce 42.

## Exercise 7c: repeated effects

The [controlled crash procedure](../../experiments/07-workflows/repeated-effect.md)
uses `bun run workflow-effect -- start|read KEY`. An unfinished step appends to
an external local file before waiting. After restart it appends again, showing
why recovery is not exactly-once external execution.

## Exercise 7d: idempotency

Follow the [idempotency experiment](../../experiments/07-workflows/idempotent-effect.md).
`bun run workflow-idempotent -- start|read KEY` uses a unique job ID in a separate
local SQLite effect store, so a replayed workflow callback cannot add another
row for the same job.

## Exercise 9: cron

With `bun run dev` running: `bun run cron -- my-cron-counter`.
The job runs every minute. The script observes the first tick and deletes the
job. Expect up to a minute of waiting. See the
[cron record](../../experiments/09-scheduling/README.md).

## Automatic cron and sleep

Follow the [procedure](../../experiments/09-scheduling/sleeping-cron.md).
`bun run cron-sleep -- create KEY` creates the actor and exits. Watch its SLEEP,
WAKE, TICK logs, then `bun run cron-sleep -- check KEY` verifies count 1 and
removes the recurring job. Use a fresh key and check before the second tick.
