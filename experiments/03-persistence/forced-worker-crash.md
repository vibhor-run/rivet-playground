# Forced worker crash

## Question and prediction

Does saved counter state survive abruptly killing its worker while the engine
keeps running? Prediction: the saved count of `2` should be restored. Recovery
may take time while the engine detects the lost worker.

## Documented behavior

Rivet persists `c.state`; saves are batched (default interval: one second) and
flushed during graceful sleep or shutdown. A process killed with SIGKILL cannot
run its cleanup hooks. This test saves state before crashing, not immediately
after an unsaved mutation.

Source: [Rivet 2.3.17 state documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/state.mdx).

## Run it

Start a single worker in terminal 1 from the playground root:

```sh
bun run dev
```

In terminal 2, use a fresh key:

```sh
bun run counter -- my-crash-counter
```

Wait for `[counter] sleep` with count `2` and let sleep finish. Find the Bun
worker PID and confirm that its working directory is this playground's runner:

```sh
ps -axo pid,ppid,command | rg 'bun src/index.ts'
lsof -a -p <worker-pid> -d cwd
lsof -nP -iTCP:6430 -sTCP:LISTEN
```

Replace `<worker-pid>` with the current numeric worker PID. Wake the actor and
kill that worker immediately after the successful read:

```sh
bun run read -- my-crash-counter && kill -KILL <worker-pid>
```

The worker terminal reports forced termination. The engine should still listen
on `6430` with the same PID. Start `bun run dev` again in terminal 1, then read
the same actor in terminal 2:

```sh
bun run read -- my-crash-counter
```

Observe the actual response. If recovery returns an error, record it and try a
new read once rather than assuming a successful or instant recovery.

## Observed evidence

Run locally on 2026-10-10 (Asia/Kolkata), with key
`forced-crash-check-20261010`:

| Evidence | Before | After |
| --- | --- | --- |
| Worker PID | `92569` | `92864` |
| Engine PID | `82462` | `82462` |
| Saved count | `2` | Eventually read as `2` |

The actor first slept at `2`, then was woken by a read. SIGKILL terminated the
worker with exit status `137`. There was no shutdown `onSleep` or `onDestroy`
log after that wake in the killed worker.

The restarted worker logged wake at `2`. The first post-restart client read
failed with `RivetError`, group `core`, code `internal_error`, HTTP `500`, after
waiting during recovery. A subsequent new client read succeeded:

```text
Actor key: forced-crash-check-20261010
getCount(): 2
```

## Conclusion and limits

Repeat run on the same date, with fresh key
`forced-crash-check-20261010-repeat`: worker `95629` was killed with SIGKILL,
replacement worker was `95923`, and engine `82462` stayed running. The first
post-restart read again failed with `core/internal_error` (HTTP `500`, exit `1`).
A second read succeeded with `2`. Thus the first-request failure reproduced in
both runs.

Saved state survived the worker crash and was readable afterward in both runs.
The first post-restart request failed in both, so this was not seamless recovery.
The investigation below identifies the stale delivery destination. The deeper
placement-refresh cause and any fixed release remain unverified.

## Investigation: why the first read failed

Checked the local engine logs, official 2.3.17 source, and GitHub issues.

In both runs, the first request kept targeting the killed worker's connection
after a replacement worker had connected. An envoy is the runner's connection
to the engine; its key identifies that connection, not the actor.

Repeat-run timeline from
`.local/.rivetkit/var/logs/rivet-engine/engine-1791582567-stdout.log`:

| UTC time | Observed event |
| --- | --- |
| `22:01:27.307` | Old envoy `7659ac9b-c0e4-47b7-b0f8-e937f79a06b7` closed |
| `22:01:29.858` | Replacement envoy `d826e609-93c2-46b8-8437-dd660d6662fe` connected |
| `22:01:32.935` | First read targeted the old envoy; delivery attempt 1 had no responder |
| `22:01:52.054` | Attempt 9 still targeted the old envoy, about 19.12 seconds later |
| `22:01:52.055` | Gateway exhausted its delivery retry budget |
| `22:01:52.059` | Same request logged `request not in flight`, exposed as `internal_error` |

The failed request's ray ID was `d9bwoxhtiv0zclcympkfbwvuwfbl00`, matching the
client error. A ray ID correlates the client response with engine log entries.
The old envoy key also matches the connection that closed when we sent SIGKILL.

The [2.3.17 gateway source](https://github.com/rivet-dev/rivet/blob/v2.3.17/engine/packages/pegboard-gateway3/src/shared_state.rs#L920)
clones the request's receiver destination before its retry loop. Those retries
reuse that destination; they do not resolve a new worker on each attempt. The
code caps this loop at roughly 19 seconds, matching the observed timing.

Confirmed failure chain: stale worker destination, repeated delivery failures,
retry exhaustion, then an internal error. The successful second request is
consistent with a newly resolved route, but we have not traced every step of
route refresh or established precisely why the first route was stale.

[Issue #5738](https://github.com/rivet-dev/rivet/issues/5738) reports a similar
gateway-delivery failure after worker connections are evicted. It concerns
version-upgrade draining with RivetKit 2.3.2 and an Enterprise engine bundle,
not our SIGKILL experiment on 2.3.17. It is related evidence, not confirmation
of the same underlying bug or a fix. No verified matching fix was found in this
investigation. We did not upgrade dependencies, change retry behavior, file an
issue, or modify v3.

This test does not prove that the last unsaved mutation survives SIGKILL. Rivet
provides `await c.saveState({ immediate: true })` when an explicit completed
state save is required; we have not added it or tested the unsaved-write window.
We also did not crash the engine or test disk/power failure.

## v3 connection

v3's actor identity is Rivet state, while the conversation is persisted by its
Harness in Postgres. A worker crash also interrupts model and tool work. This
counter test does not verify v3's Harness recovery or external tool side effects;
those belong to the later workflows and agent/session experiments.
