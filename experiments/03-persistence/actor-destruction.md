# Actor destruction

## Question and prediction

What happens to a counter's state after explicit destruction? Prediction: `get`
fails, while `getOrCreate` with the same key creates a different actor at `0`.

## Documented behavior

`c.destroy()` requests actor destruction. `onDestroy` runs during graceful
destruction. `get` addresses an existing actor without creating one, whereas
`getOrCreate` creates one when needed. A key can therefore address a new actor
after the old one is destroyed.

Sources checked for 2.3.17:

- [Lifecycle documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/lifecycle.mdx).
- [Context API](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/actor/config.ts).
- [Client API](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/client/client.ts).

## Run it

Terminal 1, from the playground root:

```sh
bun run dev
```

Terminal 2, from the playground root:

```sh
bun run destruction
```

The script creates a dedicated timestamp-keyed test counter, increments it to
`2`, records its actor ID, calls its `destroy` action, checks that a `get` action
fails with `not_found`, and recreates it under the same key. It checks that the
new count is `0` and the actor ID differs. It does not destroy existing learning
counters. It leaves the recreated counter available for dashboard inspection.

The actor's added `destroy` action calls `c.destroy()`. Its added `onDestroy`
hook prints the state for observation. This action is permanent deletion of the
target actor, not a disconnect or sleep request.

## Observed evidence

Passed locally on 2026-10-10 (Asia/Kolkata):

```text
Test actor key: destruction-test-1791582662401
First increment: 1
Second increment: 2
Original actor ID: 5va8ga5k84jhtlqru19c87mjsial00
Actor destroyed
get() after destruction: not_found
Recreated actor count: 0
Replacement actor ID: 1g8h3ow0od3fwp6mq1pyo3xmfqbl00
Different actor ID: true
```

The runner logged `[counter] destroy` with count `2` and subsequently a new
`[counter] wake` with count `0`. The client logged repeated `not_found` warnings
while its built-in retries completed; the script exited successfully.

## Conclusion and limits

Sleep retains state. Explicit destruction removes the old actor; reusing the
key creates a new actor with its initial state. This verifies logical deletion,
not when the storage engine physically reclaims disk space.

In v3, conversation history is stored in Postgres separately from Rivet actor
state. Destroying an actor alone must not be assumed to delete those external
rows or its Sail computer. We have not tested v3's deletion flow.
