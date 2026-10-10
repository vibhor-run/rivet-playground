# First workflow: normal execution

RivetKit and workflow engine 2.3.17. A durable workflow records progress through
named steps. This exercise verifies normal execution only; crash recovery,
replay behavior, and inspecting saved history are separate later experiments.

Prediction prompt: first step returns 21, second doubles it. Expected result 42.
No user prediction was received before this normal run.

## Run

At the playground root, terminal 1:

```sh
bun run dev
```

Terminal 2:

```sh
bun run workflow -- my-first-workflow
```

Use a fresh key to see a new workflow's step callbacks execute. Reusing a key
uses the same actor rather than creating a new job.

## Code

- `packages/actors/src/07-workflows/actor.ts`: the separate `workflowDemo` actor.
- `apps/runner/src/experiments/07-workflows/client.ts`: creates/gets the actor
  and reads its result.
- `apps/runner/src/registry.ts`: registers this actor alongside earlier examples.

`run: workflow(...)` wraps the actor's run handler in Rivet's workflow engine.
`ctx.step("produce-value", ...)` names a step whose callback returns 21.
Its returned value becomes the input to `ctx.step("double-value", ...)`.
The second callback uses its `step` context to update actor state and returns 42.
Actor state access belongs inside a step callback, not directly in workflow
orchestration code. The initial `null` means the result is not available yet;
`number | null` tells TypeScript the result can later become a number.

`getResult()` is an ordinary read action. The client polls it at 100ms intervals
for up to five seconds because actor creation starts the workflow asynchronously.
This bounded polling only waits for the result; it is not checkpoint or recovery
logic. The client checks for 42 and disposes itself on completion or error.

## Observed

Fresh key `workflow-first-1791625839`, client exit 0:

```text
Workflow result: 42
```

Worker:

```text
[workflow] produce-value executed: 21
[workflow] double-value executed: 42
```

Type checking passed. This run does not establish crash recovery, exactly-once
external effects, or which operations would repeat after interruption.

## Official versioned references

API verified against the [2.3.17 workflow wrapper](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/mod.ts),
[step context](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/context.ts),
[storage driver](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/driver.ts),
and [official step example](https://github.com/rivet-dev/rivet/blob/v2.3.17/examples/docs/actors-workflows/request-response/index.ts).

Next: observe a completed first step, interrupt before the second completes,
restart, and compare callback logs and results. The v3 workflow/session mapping
remains a later exercise.

After validation, stopping our worker with Ctrl-C logged a SQLite
`transaction_closed` error while querying scheduled work. The successful client
run and step logs occurred before shutdown. The shutdown log's cause was not
investigated in this exercise.
