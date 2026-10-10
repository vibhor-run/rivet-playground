# Rivet learning playground

A separate Bun monorepo for learning Rivet one experiment at a time, then
building a small prototype inspired by Runable v3.

## Simple agent frontend

The first prototype is ready: a chat page, one Rivet actor per session,
streaming replies, and an addition tool. Start with the
[setup and code walkthrough](experiments/12-agent-session/README.md).
Use your own model API key; no storage or sandbox services are required.

## Setup

```sh
cd /Users/vivbhor/Desktop/rivet-playgroud
bun install
```

- `apps/runner`: the process that will host our actors.
- `packages/actors`: the actor definitions we will write together.
- The root dependency catalog pins Rivet packages to v3's version, `2.3.17`.
  A catalog is a shared list of dependency versions; it does not install packages
  until a workspace declares that it needs them.
- Exercise 1 is ready: a counter actor with `increment()` and `getCount()`.
- Exercise 2 is ready: `bun run identity -- my-shared-counter` opens two clients
  to the same counter, closes A, and continues through B. See
  [the runner README](apps/runner/README.md#exercise-2-identity).
- Exercise 3a is ready: `bun run read -- my-restart-counter` reads an existing
  counter without changing it, for the graceful worker restart experiment in
  [the runner README](apps/runner/README.md#exercise-3a-graceful-worker-restart).
- Keep playground data and credentials separate from v3. Never copy v3's secrets.

## Exercise 1: counter

An actor owns its state and exposes actions that clients call. Predict the four
results before running: `getCount()`, `increment()`, `increment()`, `getCount()`.

Terminal 1, from the repository root:

```sh
bun install
bun run dev
```

Terminal 2, from the repository root:

```sh
bun run counter
```

For a fresh actor, the results are `0`, `1`, `2`, `2`. The client awaits each
action before calling the next. The count belongs to the actor, not the client.

The actor key defaults to `lesson-1`. `getOrCreate([key])` finds or creates that
actor. Repeating the command uses the same key, so do not assume it starts at
zero. To run this exercise with a new actor, use a new key:

```sh
bun run counter -- my-fresh-counter
```

The engine and dashboard use <http://127.0.0.1:6430>. The root `dev` command sets
`RIVETKIT_STORAGE_PATH` to this repository's `.local/`; Rivet stores its files
under `.local/.rivetkit/`, separate from v3's default storage. The registry
disables the unrelated Services worker. Ctrl-C stops the runner command; it is
not an instruction to destroy an actor or delete stored data.

```sh
bun run check-types
```

API references checked against Rivet's official `v2.3.17` source:

- [Backend quickstart](https://github.com/rivet-dev/rivet/blob/v2.3.17/docs/content/docs/quickstart/backend.mdx)
- [Counter example](https://github.com/rivet-dev/rivet/blob/v2.3.17/examples/hello-world/src/index.ts)
- [Client example](https://github.com/rivet-dev/rivet/blob/v2.3.17/examples/docs/actors-quickstart-backend/client.ts)
- [Engine port configuration](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/registry/config/index.ts)
- [Engine storage path](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-rust/packages/engine-process/src/lib.rs)

In v3, `packages/rivet/src/actor.ts` defines `agentSession` with `actor()`, and
`packages/rivet/src/registry.ts` registers it with `setup()`. Our counter follows
the same basic structure without the agent's model, tools, or separate Postgres
conversation storage.

## Learning order

Test records live in [experiments/](experiments/README.md), with predictions,
commands, versioned documentation, observed results, and limitations.

1. Counter: `increment()` and `getCount()`.
2. Identity: two clients, one actor.
3. Persistence: disconnect, sleep, process restart, destruction.
4. Events: broadcast updates to two clients.
5. Lifecycle: startup, sleep/wake, shutdown.
6. Errors and simultaneous actions.
7. Durable workflows and recovery.
8. Map the concepts to v3's agent/session implementation.

For each exercise, predict the result before running it, observe what happens,
and pause for questions before moving on.
