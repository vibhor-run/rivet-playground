# First cron job

RivetKit 2.3.17. Expected: a registered cron job invokes increment at its next
minute boundary; count rises by one without the client calling increment.

## Run

Root, terminal 1:

```sh
bun run dev
```

Terminal 2:

```sh
bun run cron -- my-cron-counter
```

A fresh key starts at zero. The client connects, reads the count, registers its
event listener, and calls startCron. It waits up to 90 seconds for a tick, checks
the count, deletes the cron job, checks that it is gone, and disposes the client.
The first tick can take nearly one minute. The recurring job otherwise continues
until deleted; stopping the client alone is not cancellation.

## Code

Actor: `packages/actors/src/09-scheduling/actor.ts`.
Client: `apps/runner/src/experiments/09-scheduling/client.ts`.

`c.cron.set` registers a job named minute-increment. Reusing a name updates the
job on that actor. `* * * * *` has five fields (minute, hour, day of month, month,
day of week): it runs every minute at minute boundaries, not 60 seconds after
registration. Timezone is explicitly Asia/Kolkata.

The target is the same actor's increment action. Rivet invokes it and supplies
ScheduledFireInfo with scheduled/fired timestamps. The action increments state,
logs that information, and broadcasts tick to the client. `c.cron.delete`
removes the recurring job; `c.cron.get` checks that it no longer exists.

The listener stays connected during this test. This does not test sleep/wake,
worker/engine restarts, missed-run handling, overlaps, or failures. Scheduling
an action does not turn that action into a durable workflow or guarantee
exactly-once effects. The client sends start/stop actions, not an increment.

API checked against [official 2.3.17 scheduling docs](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/schedule.mdx)
and [cron types](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/actor/config.ts).

## Observed

Key `cron-first-1791628605`, exit 0:

```text
Count before: 0
Cron expression: * * * * *
Next scheduled run: 2026-10-10T10:37:00.000Z
Cron tick received: 1
Cron deleted: true
Final count: 1
```

Worker logged kind cron, name minute-increment,
`scheduledAt: 1791628620000`, `firedAt: 1791628620002`. The recorded scheduled
and fired timestamps were two milliseconds apart in this run; this is not a
latency guarantee. The getJob check after deletion passed. Type checking passed.
Only the first firing and deletion were tested; repeated firing and recovery
remain separate experiments.
