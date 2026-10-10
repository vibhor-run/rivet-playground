# Unfinished steps can repeat effects

RivetKit 2.3.17. User prediction: the unfinished step's earlier work happens again.

## Code

Actor: `packages/actors/src/07-workflows/repeated-effect.ts`.
Client: `apps/runner/src/experiments/07-workflows/repeated-effect.ts`.

One workflow step appends a line to an actor-specific local file, waits 20 seconds,
then marks actor state completed and returns. The file is outside the repository,
in the OS temporary directory under `rivet-learning-effects`. It stands in for
an effect outside workflow storage, such as an upload or external API operation.
Both client and worker must run on this laptop to inspect it. This is not hosted
shared storage, an atomic transaction, or a durability guarantee for temp files.

## Reproduce

From the root, terminal 1: `bun run dev`. Terminal 2, choose a fresh key:

```sh
bun run workflow-effect -- start my-effect-test
```

Wait for `APPENDED ... waiting (worker PID NNN)`. Kill that exact worker in a
third terminal before the 20-second wait finishes:

```sh
kill -KILL NNN
```

The file should contain one line. Keep the engine and its database running.
Restart `bun run dev`, then:

```sh
bun run workflow-effect -- read my-effect-test
```

`start` creates/gets the actor; `read` uses `get` and never creates a replacement.
Read mode prints workflow state and counts the file lines. The known first-read
routing failure can occur after SIGKILL; record it and issue a new read rather
than treating that error as evidence about workflow completion.

## Observed

Key `effect-crash-1791627412`. Old worker 70985 appended once, then was SIGKILLed
before step completion. Engine PID remained 82462. New worker 71288 appended
again. Before the restarted step finished, the file contained:

```text
effect from worker 70985
effect from worker 71288
```

No new job was submitted. Recovery reran the unfinished step from its beginning.
The external file append was not undone by the crash and was not deduplicated.
This confirms the user prediction. Completed-step reuse from our earlier test
does not imply exactly-once external effects inside unfinished steps.

API verified against the [2.3.17 step context](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/context.ts)
and [workflow wrapper](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/mod.ts).
Next, separately: make a repeated effect safe using a stable job identifier and
an atomic deduplication operation. Merely checking a flag before writing is not
enough when the effect and flag can be separated by a crash.

The first post-restart read failed with `core/internal_error`, ray
`x4t2go7v2oh93rv9rd1x3uhtq0dl00`. After the restarted step logged completion, a
new read exited 0 with `Completed: true` and `Effect count: 2`. Type checking
passed. The temp file remains available for inspection; it is not committed.
