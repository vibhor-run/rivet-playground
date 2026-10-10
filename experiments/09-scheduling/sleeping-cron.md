# Cron wakes a sleeping actor without a connected client

RivetKit 2.3.17. Expected: onCreate registers the recurring job, the actor sleeps,
and the next deadline wakes it and increments state without a client request.

Actor: `packages/actors/src/09-scheduling/sleeping-cron.ts`.
Client: `apps/runner/src/experiments/09-scheduling/sleeping-cron.ts`.
This is separate from the manually registered cron actor. Its idle timeout is
five seconds; lifecycle logs include timestamps and keys.

## Reproduce

At the root, terminal 1:

```sh
bun run dev
```

Terminal 2, use a fresh key:

```sh
bun run cron-sleep -- create my-sleeping-cron
```

The create client prints count and next deadline, disposes, and exits. It does
not keep a connection open. Observe terminal 1 without sending more requests:
SLEEP at count 0, WAKE at the cron deadline, TICK at count 1. Creation near a
minute boundary may leave insufficient time to sleep before the first tick;
choose a fresh key with enough time for this demonstration.

Once the first TICK appears, before the next minute:

```sh
bun run cron-sleep -- check my-sleeping-cron
```

Check uses get, reads count 1, deletes the cron job even if the count assertion
fails, and verifies that the job is gone. The new read may itself wake an actor
that slept again; the earlier scheduled wake/tick logs establish what happened
before that read. Do not poll reads while trying to observe idle sleep.

onCreate runs once for a new actor, not every wake. The worker remains running
while this actor sleeps. These logs establish lifecycle behavior, not process
RAM measurements. No worker/engine crash or missed-tick behavior is tested.

References: [2.3.17 scheduling](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/schedule.mdx)
and [lifecycle](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/lifecycle.mdx).

## Observed

Fresh key `sleeping-cron-1791628948`. Create client exited 0 with count 0 and
next run `2026-10-10T10:43:00.000Z`. No client requests were made until after tick.

```text
10:42:28.498Z CREATE
10:42:28.514Z WAKE count 0
10:42:33.602Z SLEEP count 0
10:43:00.015Z WAKE count 0
10:43:00.025Z TICK count 1
```

Check exited 0, read count 1, printed `Cron deleted: true`, and verified no job
remained. CREATE appeared only once; the cron wake did not rerun creation.
Passed: automatic registration, sleep, scheduled wake with no connected client,
and increment. Type checking passed.
