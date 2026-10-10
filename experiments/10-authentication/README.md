# Connection identity and authentication

Rivet 2.3.17. Authentication verifies who is connecting. Authorization decides
what that verified user may do. Both clients reach the same actor; their
connection state differs.

## Run

From the playground root, terminal 1:

```sh
bun run dev
```

Terminal 2:

```sh
bun run auth -- my-auth-counter
```

The script issues short-lived signed JWTs for Alice and Bob. It acts as our
trusted local backend, not as a browser. A generated signing key stays in
git-ignored `.local/auth-signing-key`; no v3 credentials are used.

## Code and behavior

- [Actor](../../packages/actors/src/10-authentication/actor.ts):
  `createConnState` verifies the token signature, issuer, audience, and expiry,
  then returns a trusted user ID and role. Actions read these through
  `c.conn.state`. `increment` checks the owner role before changing actor state.
- [Token issuer](../../packages/actors/src/10-authentication/tokens.ts): creates
  five-minute credentials. In a real app, a trusted backend issues credentials
  after login; the browser never receives the signing key.
- [Client](../../apps/runner/src/experiments/10-authentication/client.ts): connects
  Alice and Bob, checks permissions, and deliberately changes a token signature.

Alice is the fixed owner in this teaching example. Any other correctly signed
user is allowed to read as a viewer. Private session access would require a
stricter membership check.

## Observed result

Test key: `auth-check-1791633078`. The command exited successfully:

```text
Owner identity: { userId: "alice", role: "owner" }
Viewer identity: { userId: "bob", role: "viewer" }
Owner increment: 1
Viewer reads: 1
Viewer increment rejected: owner_required
Viewer still reads: 1
Tampered credential rejected: forbidden
```

The client asserts that the rejected write does not change the count. Reusing
the same key increments its existing count rather than resetting it.
Rivet also logs the expected errors, including its previously observed
"unhandled action promise rejection" warning despite the client catching it.
Token expiry and reconnect refresh were not tested.

## Sources and v3

[Official authentication docs at v2.3.17](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/authentication.mdx)
describe `createConnState`, throwing to reject credentials, and using params for
both HTTP and WebSocket calls.

In v3, compare `packages/rivet/src/actor.ts` authentication and connection-state
handling with the connection params in `packages/rivet/src/client.ts`.
The playground keeps the same distinction between actor state and each
connection's trusted identity, with a much smaller permission policy.
