# Engine restart

## Question

Does an existing counter survive restarting both the worker and local engine
when their database directory is kept?

## Documented behavior

Rivet automatically persists `c.state` and restores it across restarts. Saves
are batched, and state is flushed on sleep or shutdown. This experiment waits
for idle sleep and stops processes gracefully, so it does not test loss of an
unsaved update during an abrupt crash.

Source: [Rivet 2.3.17 state documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/state.mdx).

The database lives at `.local/.rivetkit/var/engine/db/`. Keep that directory.

## Prediction

A saved count of `2` should remain `2`. Predict the result before running.

## Procedure

From the repository root, start the worker in terminal 1:

```sh
bun run dev
```

In terminal 2, choose an unused key:

```sh
bun run counter -- my-engine-restart-counter
bun run read -- my-engine-restart-counter
lsof -nP -iTCP:6430 -sTCP:LISTEN
```

Expect the new counter to reach `2`. Wait for `[counter] sleep` in terminal 1.
Press Ctrl-C in terminal 1 to stop the worker. In terminal 2, use `lsof` to find
the playground engine's current PID. Confirm the command and that its open
database files belong to this playground before sending SIGTERM:

```sh
ps -p <engine-pid> -o pid,command
lsof -p <engine-pid>
kill -TERM <engine-pid>
```

Replace `<engine-pid>` with the actual numeric PID; do not copy an old PID.
Check that the listener is gone, then restart in terminal 1:

```sh
lsof -nP -iTCP:6430 -sTCP:LISTEN
bun run dev
```

In terminal 2:

```sh
lsof -nP -iTCP:6430 -sTCP:LISTEN
bun run read -- my-engine-restart-counter
```

The engine PID should change, and the same actor should return `2`. The read
script uses `get`, not `getOrCreate`, so a missing actor is not silently recreated.

## Observed result

Passed locally on 2026-10-10 (Asia/Kolkata), using key
`engine-restart-check-20261010`.

| Evidence | Before | After |
| --- | --- | --- |
| Counter value | `2` | `2` |
| Worker PID | `81589` | `82458` |
| Engine PID | `53453` | `82462` |

Both old processes exited and the `6430` listener disappeared before restart.
The database directory was retained. The final read printed:

```text
Actor key: engine-restart-check-20261010
getCount(): 2
```

Conclusion: the saved actor state survived a graceful restart of both processes.
This does not establish crash durability for an update that has not yet been
saved. Actor destruction and forced worker crashes remain untested.

## v3 connection

v3 uses Rivet state for `sessionId` and `ownerUserId` in
`packages/rivet/src/actor.ts`. Conversation history lives separately in Postgres.
This counter test verifies Rivet state only; it does not test v3 recovery or
its Postgres, Sail, or model connections.
