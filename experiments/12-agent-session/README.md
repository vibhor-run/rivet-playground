# A minimal v3-style agent session

This combines identity, actions, events, and actor persistence in one small app.
It uses Rivet 2.3.17 and `@earendil-works/pi-ai` 1.0.0, matching v3.

```text
Browser → Rivet engine → Session actor → Model provider
                            │
                            └→ add_numbers tool → Model provider again
```

## Run

From the playground root:

```sh
bun install
cp .env.example .env
```

Edit `.env` to set your own model API key. Do not use v3 credentials. The default
is `AGENT_MODEL=openai/gpt-4o-mini` with `OPENAI_API_KEY`. Anthropic also works
with a catalog model such as `anthropic/claude-sonnet-4-5` and
`ANTHROPIC_API_KEY`. Provider keys belong to the runner, never the frontend.

Terminal 1:

```sh
bun --env-file=.env run dev
```

Terminal 2:

```sh
bun run web
```

Open http://127.0.0.1:5173. Ask “Use your tool to add 23 and 19.” The loop calls
the model, executes its tool requests, appends the results, then calls the model
again. It stops when there are no tool requests, or after five model turns.
Each model request has a two-minute timeout.

`AGENT_MODEL` is `provider/model-id` from pi-ai's catalog. An optional
`AGENT_BASE_URL` overrides that model's endpoint. The endpoint must implement
the model's API: the default OpenAI model uses Responses, not Chat Completions.

## Code to read

1. [Actor](../../packages/actors/src/12-agent-session/actor.ts): `snapshot`,
   `sendMessage`, the model/tool loop, and broadcasts. The synchronous busy
   check prevents overlapping submissions. `keepAwake` keeps the actor awake
   for the reply. Tool arguments are validated before execution.
2. [Frontend](../../apps/web/src/main.ts): create a client, connect to the
   session key, subscribe, and render snapshots. Notifications are throttled
   during text streaming; connected clients receive the same history.
3. [Registry](../../apps/runner/src/registry.ts): registers the session actor
   alongside our earlier experiments.

Completed messages use `c.state`; unfinished live text uses `c.vars`.
An interrupted turn is reported on wake and removed back to its user input.
It is not automatically replayed. This is an ordinary agent loop, not a durable
workflow or v3's pi-durable recovery engine.

The sidebar lives in browser local storage. Actor history persists in our
existing local engine storage. No Postgres, S3, Sail, or login is included.
This is a local learning app: knowing a session key grants access to it.

## Verification

No model API key was available during implementation. A temporary external,
test-only Responses fixture verified the integration; it deliberately emits
an addition tool call and a streamed answer, not a real model generation.

Observed checks:

- Two browser windows see the same actor's live updates and message history.
- Tool request → tool result `42` → streamed final response.
- A second submission during generation is rejected with `busy`.
- Provider failure releases the busy state; a subsequent submission succeeds.
- Disconnect/reconnect retains the message history.
- TypeScript check and frontend production build pass.

Real-provider generation and interrupted-turn recovery have not been verified.
The fixture stays outside the repository and is not part of normal startup.

## Comparison with v3

v3's session actor also accepts a message and broadcasts view updates. Its
pi-durable Harness owns model/tool execution and uses shared Postgres storage.
Here the small explicit loop and Rivet state make that sequence visible.
This first prototype has no sandbox tools, automatic run recovery, or login.

API references: [pi-ai 1.0.0 README](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/README.md),
checked against the installed package's README and TypeScript declarations;
[Rivet 2.3.17 lifecycle](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/lifecycle.mdx).
