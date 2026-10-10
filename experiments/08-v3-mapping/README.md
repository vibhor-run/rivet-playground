# Map the playground to v3

Read-only inspection of `/Users/vivbhor/Desktop/v3`. Read module READMEs for
`packages/rivet`, `apps/runner`, and `packages/agent` before implementation.
No v3 files, services, credentials, or production data were changed or copied.
This is a source map, not a runtime verification of v3.

## Two recovery systems

The session actor is not simply `run: workflow(...)` around an entire chat.
It opens a pi-durable Harness using Postgres-backed storage. Rivet hosts the actor;
pi-durable manages conversation/model/tool progress. Background job actors use
`workflow` from `rivetkit/workflow`, as in our workflow experiments.

| Playground concept | v3 implementation |
| --- | --- |
| Registry of actor types | `packages/rivet/src/registry.ts:14` registers agentSession, scheduler, workflow actors |
| One actor per key | `packages/rivet/src/sessions.ts:65` gets/creates agentSession by sessionId |
| Connecting a viewer | `packages/rivet/src/client.ts:301` gets by sessionId, then connects at 309 |
| Persistent actor identity | `packages/rivet/src/actor.ts:145` createState stores sessionId and ownerUserId |
| Temporary runtime objects | `packages/rivet/src/actor.ts:150` createVars opens session resources |
| Live events | `packages/rivet/src/actor.ts:282` broadcasts view; client.ts:311 subscribes |
| Direct action | `packages/rivet/src/actor.ts:450` sendMessage validates input and delegates to session |
| Explicit sequencing across awaits | `packages/rivet/src/session.ts:166` pLimit(1), used at 599 for sendMessage |
| Stable IDs and duplicate detection | session.ts:498 onward reads SentDoc by messageId, compares digest, saves original mode/sender; submitMessage passes messageId as requestId at 480 |
| Conversation recovery | session.ts:238 Harness.open, session.ts:387 harness.resume |
| Conversation persistence | `apps/runner/src/runtime.ts:200` supplies createPostgresStorage |
| Rivet workflow steps | `packages/rivet/src/workflows/system-smoke.ts` input/start/finish steps, durable pause |
| One workflow actor per job | `packages/rivet/src/workflows/client.ts:16` getOrCreate by runId with input, then resolve |

## Follow one message

1. The browser uses a token to connect to a session actor by session ID.
2. It calls sendMessage with a stable messageId and text.
3. The actor checks access and validates input, then delegates to its session.
4. A pLimit(1) gate sequences message admission. This is not Rivet's queue API.
5. The session checks prior message data and submits with requestId = messageId.
6. The Harness commits conversation work through storage provided by the runner.
7. View updates are broadcast through the actor to connected viewers.
8. After a worker interruption, waking reconstructs runtime resources and opens
   the Harness, then resume continues its durable work.

The gate sequences admission operations; it does not mean the entire model run
blocks all later messages. Busy user input uses `whenBusy: "steer"`. The Harness
has its own inbox and control behavior. We have not tested their detailed
concurrency or external-effect guarantees here.

## Storage is not all actor state

- Rivet state: persistent session identity.
- Actor vars: live session/Harness handles and viewer tracking, rebuilt on wake.
- Postgres through pi-durable Storage: conversation progress and records.
- Sail computer: tools' file and shell environment. The actor is not the computer.

## Smallest next prototype

Start with a session actor keyed by session ID, a sendMessage action with a stable
message ID, a snapshot action, and an update event. Use a deterministic fake reply
before adding an LLM, tool execution, Sail, or another database. Build and test
one addition at a time. Its storage/recovery limitations must be explicit; it
will not yet reproduce pi-durable's full chat recovery or deployment behavior.
