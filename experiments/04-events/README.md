# Events: two connected clients

Version: RivetKit 2.3.17. Prediction: both connected clients receive the first
update; B does not receive an update after disconnecting.

An action is a request from a client to an actor. An event is a message the actor
sends to subscribed connections. Our increment action updates state, broadcasts
`countChanged`, and returns the new count to its caller. Those are separate
messages: the action response goes to A; the event goes to A and B.

## Run

From the playground root, terminal 1:

```sh
bun run dev
```

Terminal 2:

```sh
bun run events -- my-events-counter
```

Use a fresh key for counts starting at zero. Existing keys retain their count.

## Implementation

- `packages/actors/src/01-counter/actor.ts` declares `event<number>()` and calls
  `c.broadcast("countChanged", c.state.count)` inside `increment`.
- `apps/runner/src/experiments/04-events/client.ts` creates two clients with connections to the same
  actor. `.on()` registers a listener; `.once()` listens for one event.
- A reads before B connects so creation happens sequentially. B reads after
  registering listeners, before A increments. The script waits for both event
  callbacks, disposes B's connection, then increments again and waits for A.
- `Promise.withResolvers()` gives us a promise and its resolve function. Calling
  resolve from a listener lets the script wait for a real event rather than a
  guessed delay. `client.dispose()` closes connections at the end.
- In this installed version, the listener payload is inferred as `unknown`
  despite `event<number>()`. A `typeof` check narrows it to a number; we avoid
  casts or suppressing the type checker.

## Observed

Verified with a fresh key `events-final-20261010`:

```text
A initial count: 0
B initial count: 0
A received countChanged: 1
A increment returned: 1
B received countChanged: 1
B disconnected
A received countChanged: 2
A increment returned: 2
A received: [ 1, 2 ]
B received: [ 1 ]
```

The relative order of log lines for the action response and different clients'
events is not an assertion. Both event values and B's disconnect behavior are
asserted by the script. Events are live notifications; this test does not test
reconnect replay, crashes during broadcasts, or durable message delivery.

The initial concurrent creation attempt emitted a
`destroyed_during_creation` warning and reconnected successfully. The final
sequential-creation run above completed without that warning. Its deeper cause
was not investigated in this exercise.

## Official references and v3 equivalent

APIs checked against [2.3.17 events documentation](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/events.mdx)
and [2.3.17 schema types](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/actor/schema.ts).

In v3, `packages/rivet/src/actor.ts:282` broadcasts a `view` frame from `onView`;
`packages/rivet/src/experiments/01-counter/client.ts:311` subscribes with `opened.on("view", receive)`.
The counter broadcasts a number; v3 broadcasts browser view data using the same
actor-to-client pattern.
