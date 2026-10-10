# Crash after receiving a queue message

## Resolved by source inspection

The experiment is valid. The no-replay expectation was wrong for our
`completable: true` consumer. In Rivet 2.3.17, `try_receive_batch` returns
completable messages without removing them. `complete_message_by_id_unlocked`
removes them when `message.complete()` executes. Non-completable receipt removes
messages immediately. Both paths still exist in current main at commit
`861406353676645755feda79f6758a112518dce8`.

Thus our crash occurred before removal, and the restarted consumer received the
stored message again. This is supported by source, not a timing hypothesis.
The docs incorrectly state that completing does not affect message durability.
The observations below are retained as the investigation history; the earlier
no-replay prediction and unresolved-cause statements are superseded here.

Sources: [2.3.17 receive path](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-rust/packages/rivetkit-core/src/actor/queue.rs#L642),
[2.3.17 completion path](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-rust/packages/rivetkit-core/src/actor/queue.rs#L747),
and [current receive path](https://github.com/rivet-dev/rivet/blob/861406353676645755feda79f6758a112518dce8/rivetkit-rust/packages/rivetkit-core/src/actor/queue.rs#L657).

Audit: the send client exited after timeout before the worker restart. In the
repeat we sent no new messages, only read actions. The engine PID stayed fixed;
only the exact logged worker PID was killed. A new worker logged original work
before writing. Those facts rule out a second manual send or an old worker
continuing as explanations of these runs. We did not test external side effects,
atomic state+completion, or a non-completable crash control.

Completable replay is not an exactly-once guarantee. Processing can repeat,
including side effects performed before a crash. A sender timeout still does not
cancel work or guarantee a completion response after process loss.

RivetKit 2.3.17. Prediction stated before running: the waiting client times out;
the received message does not automatically replay. One experiment only: no
pending-message recovery or workflow recovery is tested here.

## Code

`packages/actors/src/06-queues/actor.ts` accepts an optional `delayMs` in increment
messages (default stays one second). Its receipt log includes the worker PID.
`apps/runner/src/experiments/06-errors-and-concurrency/queue-crash.ts` sends a
30-second operation, waits up to 10 seconds for completion, or checks recovery.

## Reproduce

From the root, terminal 1:

```sh
bun run dev
```

Terminal 2, choose a fresh key:

```sh
bun run queue-crash -- send my-queue-crash
```

Wait for terminal 1 to print `CRASH-TEST read 0, waiting (worker PID NNN)`.
In terminal 3, replace NNN with that exact PID and kill it before 30 seconds:

```sh
kill -KILL NNN
```

This forcibly stops the worker, not the engine. The engine and `.local` database
must remain intact. Do not use broad process-name matching. The sender should
print `Queue result: timedOut`. A timeout alone does not cancel work: the explicit
worker kill is essential to this test.

Restart with `bun run dev`, then in terminal 2:

```sh
bun run queue-crash -- check my-queue-crash
```

Check mode reads the same key, requires count 0, sends a new normal increment,
and requires completion with count 1. If the first read encounters the previously
observed post-crash routing error, record it and rerun check; do not automatically
retry the send operation.

## Official behavior

The [official 2.3.17 queue documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/queues.mdx)
says ordinary messages are removed when received, not when completed. Pending
messages are durable, but received work is not automatically redelivered if its
processing fails. Sequential processing and recoverable execution are separate
properties. Durable workflow recovery remains a later experiment.

## Observed: prediction failed

Test key: `queue-crash-20261010-1791621514`. Engine PID stayed 82462.
Old worker PID 64437 printed `CRASH-TEST read 0, waiting`, then was SIGKILLed
before its write. The send command exited 0 with `Queue result: timedOut`.

After restart (worker PID 64748), the first check failed with HTTP 500
`core/internal_error`, ray `pm5ie3o8ov2z5aoo0p2lom3klbbl00`. We reran the check.
The second check read 0, but its newly sent AFTER-RESTART message did not produce
the expected completion within 10 seconds; the check exited 1.

Restarted worker logs show:

```text
[queued counter] CRASH-TEST read 0, waiting (worker PID 64748)
[queued counter] CRASH-TEST wrote 1
[queued counter] AFTER-RESTART read 1, waiting (worker PID 64748)
[queued counter] AFTER-RESTART wrote 2
```

A subsequent read-only command:

```sh
bun run queue-crash -- inspect queue-crash-20261010-1791621514
```

returned count 2, exit 0. The original message was received again after restart.
This contradicts our expected no-replay result based on the versioned docs.
The cause is not established: we have not verified native runtime receive/delete
persistence timing or whether this is a runtime defect. Do not infer a general
redelivery or exactly-once guarantee from this one observation.

`inspect` reads without sending new work. If check fails, inspect and read worker
logs before sending anything else. A client timeout does not imply the actor
will never execute or finish the work, as AFTER-RESTART demonstrated here.

Initial outcome: crash and timeout reproduced; our no-replay expectation failed.
The source inspection at the top of this record subsequently resolved why.

## Repeat: same replay, without sending a second message

Fresh key `queue-crash-repeat-1791621896`. Worker PID 71360 received CRASH-TEST
at 08:44:56 UTC and logged read 0. We SIGKILLed that exact worker during its
30-second wait. Engine PID remained 82462. Sender exited 0 with `timedOut`.

After restart, worker PID 71647 logged `CRASH-TEST read 0, waiting` again. No
new queue messages were sent in this repeat; we used only `inspect` after restart.
The first inspect failed with `core/internal_error`, ray
`xcfxx703jgptl7s66d5qnrp01vcl00`; a second inspect read 0 during the restarted wait.
At 08:45:47 UTC the restarted worker logged `CRASH-TEST wrote 1`. A final inspect
read 1, exit 0.

This reproduces replay twice and removes the extra AFTER-RESTART message from
the observation. The old JavaScript function did not continue: its process was
killed. A new worker received the original queued message and executed the
operation again from its beginning. In this test the first attempt never wrote,
so only the restarted attempt incremented the count. We have not tested whether
an operation that writes or makes external side effects before crashing can
repeat those effects. The source inspection above resolves the replay behavior.

Documentation correction submitted as [Rivet PR #5855](https://github.com/rivet-dev/rivet/pull/5855).
Related existing correction with a regression test: [PR #5763](https://github.com/rivet-dev/rivet/pull/5763).
