# Rivet learning playground

A separate Bun monorepo for learning Rivet one experiment at a time, then
building a small prototype inspired by Runable v3.

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
- No exercises or running services yet. We will add dependencies and commands
  when we implement the counter.
- Keep playground data and credentials separate from v3. Never copy v3's secrets.

## Learning order

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
