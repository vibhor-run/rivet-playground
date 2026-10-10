# Action errors

RivetKit 2.3.17. Question: does a rejected action prevent the same actor from
handling another action? Prediction prompt: does the next increment succeed,
or is the actor destroyed? No user prediction was received before execution;
the test expectation was that it would succeed.

## Run

At the playground root, terminal 1:

```sh
bun run dev
```

Terminal 2:

```sh
bun run errors -- my-error-counter
```

Use a fresh key to start at zero. Existing keys retain their count.

## Code

The counter's `fail` action throws:

```ts
throw new UserError("Deliberate learning error", { code: "lesson_failure" });
```

A `UserError` is an expected failure whose message can be returned to clients.
The client awaits `fail()` inside `try/catch`, checks the received `RivetError`
code, then calls `getCount()` and `increment()` on the same connection. Assertions
make unexpected errors, missing errors, changed state, or failed increments fail
the script. `finally` disposes the client even if a check fails.

## Observed

Command: `bun run errors -- errors-check-20261010`, exit code 0.

```text
Count before error: 0
Caught error code: lesson_failure
Caught error message: Deliberate learning error
Count after error: 0
Increment after error: 1
```

The client also logged `action error` and `unhandled action promise rejection`
warnings. The expected rejection was caught and subsequent calls succeeded;
this experiment does not establish why the SDK emits the latter warning.

An action error did not destroy this actor or prevent its next action. The
failing action never mutated state, so this does not test rollback. Ordinary
`Error` redaction, mutation-before-throw, and simultaneous actions remain untested.

APIs verified against [official 2.3.17 error documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/errors.mdx)
and [UserError implementation](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/actor/errors.ts).

v3 uses the same `UserError` API in `packages/rivet/src/actor.ts`, including
message validation around line 459 and attachment validation around line 473.
A code lets a client identify the failure without matching human-readable text.
