# Workflow recovery between completed and unfinished steps

RivetKit 2.3.17. Expected: reuse completed step 1's recorded result, rerun the
unfinished step 2, produce 42. Only the worker is killed; the engine and database
remain running/intact.

## Code and commands

Actor: `packages/actors/src/07-workflows/recovery.ts`.
Client: `apps/runner/src/experiments/07-workflows/recovery.ts`.
This is a separate actor type so the first workflow example stays unchanged.

Terminal 1 at the root:

```sh
bun run dev
```

Terminal 2, fresh key:

```sh
bun run workflow-recovery -- start my-workflow-recovery
```

The initial result may be `null`, meaning unfinished. Wait for worker logs
`STEP 1 executed`, `Step 1 returned: 21`, then `STEP 2 started, waiting`.
Kill the exact logged worker PID in another terminal before the 20-second wait
finishes:

```sh
kill -KILL NNN
```

Restart `bun run dev`, then read the existing actor:

```sh
bun run workflow-recovery -- read my-workflow-recovery
```

Read mode uses `get`, not `getOrCreate`, to avoid silently replacing a missing
actor. The previously observed first-request routing error can happen after a
forced worker crash. Record it, then issue a new read; don't hide it with retries.
Read again after the worker logs `STEP 2 finished` to observe 42.

## What to look for

Step 1's callback logs `STEP 1 executed` and returns 21. The workflow also logs
`Step 1 returned: 21` outside that callback. On recovery, the latter log can run
again even though the callback is skipped: the workflow orchestration replays,
and the completed step's recorded return value is reused. Step 2's unfinished
callback starts from its beginning; an ordinary timer does not resume its old
remaining duration. A new 20-second wait occurs.

This is the distinction from rerunning a whole queue handler. Named step history
lets completed callbacks be skipped. It is not exactly-once execution of effects
inside an unfinished step. Keep effects safe to repeat.

API references are the [2.3.17 workflow wrapper](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/mod.ts)
and [step context](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/context.ts).

## Observed

Fresh key `workflow-recovery-1791627128`. Old worker PID 65355:

```text
STEP 1 executed
Step 1 returned: 21
STEP 2 started, waiting
```

SIGKILL before step 2 finished. Engine PID stayed 82462. New worker PID 65641:

```text
Step 1 returned: 21
STEP 2 started, waiting
STEP 2 finished: 42
```

No new `STEP 1 executed` log. Step 1's result was reused; unfinished step 2 ran
again. First read failed with `core/internal_error`, ray
`1clk12ulapkgnn98xw1q3us5uqbl00`. A new read after step 2 finished returned 42,
exit 0. This matches the earlier post-crash routing issue; it was not hidden.

Passed: completed-step result reuse and unfinished-step rerun with final 42.
No history inspector, external effect, or engine restart was tested.
