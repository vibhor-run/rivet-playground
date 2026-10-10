# Actor-to-actor calls

Rivet 2.3.17. A client calls a session actor; that actor calls a notification
actor. Only the notification actor stores the message. Each actor has its own
state, even when they use the same key string: actor type also identifies it.

Prediction: which actor stores the message? User predicted both. Observed:
only the notification actor stores it; the session action returns the count.

## Observed result

Fresh key `actor-call-check-1791635845`, command exited successfully:

```text
Session action returned: 1
Notification actor messages: [ "session finished" ]
```

Worker logs showed the call path:

```text
[demoSession] calling notificationInbox
[notificationInbox] received: session finished
[demoSession] notification actor returned: 1
```

The session's state is `{}` and its action never writes to it. The notification
actor's `record` action pushes the message into its own `c.state.messages`.
Type checking and the client assertions passed.

## Run

Terminal 1, from the playground root:

```sh
bun run dev
```

Terminal 2:

```sh
bun run actor-call -- my-session-notification
```

## Read the code

[Actor definitions](../../packages/actors/src/11-actor-communication/actor.ts):
`demoSession.finish` gets a typed server-side client through `c.client()`.
`notificationInbox.getOrCreate([inboxKey])` finds or creates the other actor.
`await inbox.record(...)` calls its action and waits for the returned count.
This is a Rivet actor call, rather than a direct call to a JavaScript function.

[Client script](../../apps/runner/src/experiments/11-actor-communication/client.ts):
calls `session.finish`, then reads the notification actor to verify one new
message. Reusing the key adds another message; the script does not reset state.

This example records a notification in actor state. It does not send an email,
push notification, or broadcast event. It does not test crashes, retries, or
an atomic transaction across actors.

## Sources and v3

[Official communication docs at v2.3.17](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/communicating-between-actors.mdx)
and its server-side-client example verify `c.client`, `getOrCreate`, and action
calls. Explicit return types keep actor-client type inference understandable.

v3's `packages/rivet/src/actor.ts` calls
`sendNotification(c.client<AgentRegistry>(), ...)`. In
`packages/rivet/src/notifications.ts`, that helper starts or finds the
`deliverNotification` workflow actor and awaits `.resolve()`. Our ordinary
notification actor illustrates the communication part; v3 additionally uses
a workflow for notification delivery.
