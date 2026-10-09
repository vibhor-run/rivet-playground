# Runner

The Bun process that hosts our counter actor.

- `src/registry.ts`: `setup()` registers the counter and configures the local engine.
- `src/index.ts`: `registry.start()` starts the runner.
- `src/client.ts`: a separate client sends four sequential actions to one counter.
  Its `import type` reads the registry's types without running the registry module.

The engine and Bun runner are separate processes on your laptop. The engine
listens on `6430`; the runner keeps a WebSocket connection to it and executes
actor actions without its own listening port. Port `6431` belongs to the engine's
internal peer API, not the runner. `startEngine: true` starts or reuses the local
engine when the runner starts.

Run from the repository root so the root script sets the isolated storage path:

```sh
bun run dev
```

In another terminal at the repository root:

```sh
bun run counter
bun run counter -- another-counter
```

`getOrCreate([key])` returns a handle: a client-side object used to call the
remote actor. `client.dispose()` releases this client's connections when done.
We will explore connections and actor identity in exercise 2.

## Actor destruction

With the runner active, run `bun run destruction` from the root. This creates
and destroys a dedicated test counter, then verifies recreation at zero with a
new actor ID. See the [experiment record](../../experiments/03-persistence/actor-destruction.md).
