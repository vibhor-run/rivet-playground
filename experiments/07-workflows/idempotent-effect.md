# Make a repeated effect safe

RivetKit 2.3.17, Bun 1.3.14. Expected: workflow callback runs again after crash,
but only one effect row is stored for its stable job ID.

## Code

Actor: `packages/actors/src/07-workflows/idempotent-effect.ts`.
Client: `apps/runner/src/experiments/07-workflows/idempotent-effect.ts`.

The external SQLite database is in the OS temp directory under
`rivet-learning-effects/idempotent.sqlite`. It is separate from Rivet's state and
workflow history. It represents an effect receiver that accepts idempotency keys.
Both client and worker run on this laptop; this local path is not hosted storage.

The job ID is actor ID plus `:record-effect`, stable across worker restarts for
this actor and step. It is the table's PRIMARY KEY. A single statement:

```sql
INSERT OR IGNORE INTO effects (job_id, worker_pid) VALUES (?, ?)
```

performs the insert or ignores a duplicate. We do not separately check for a row
then insert, and we do not store the deduplication marker somewhere else. The row
itself is the entire effect in this example, so uniqueness and the effect are
atomic. The database closes before the wait and crash marker.

`changes` reports whether the attempt inserted a row. Both attempts then wait
20 seconds before finishing the workflow step. `getStatus` is a read action;
the read client also opens the external DB read-only and asserts one row.

This only guarantees this keyed database effect, not arbitrary uploads, payments,
or notifications. A real external provider must support the same idempotency key
or another appropriate transaction design. Actor destruction/recreation changes
the actor ID; repeated business jobs across different actors need a business job
ID rather than this actor-scoped teaching key.

## Reproduce

Terminal 1 at the root: `bun run dev`. Terminal 2, fresh key:

```sh
bun run workflow-idempotent -- start my-safe-effect
```

Wait for `INSERTED ... waiting (worker PID NNN)`, then in terminal 3:

```sh
kill -KILL NNN
```

Kill only that exact worker before its 20-second wait finishes. Keep the engine
and local storage intact. Restart `bun run dev` and read the existing actor:

```sh
bun run workflow-idempotent -- read my-safe-effect
```

The restarted worker should print `DUPLICATE SKIPPED`, then `STEP completed`.
After completion, read should show true and one stored row. Record any known
first-request post-crash routing error and issue a new read; do not hide it.

## Observed

Key `idempotent-crash-1791627769`, job ID
`t5re7gr0w5dl8103eg6sbhdp9qbl00:record-effect`.
Old worker 77563 logged INSERTED and was killed before step completion.
Engine PID stayed 82462. New worker 77925 logged DUPLICATE SKIPPED for the same
job ID. Thus recovery executed the callback again without inserting a second row.

References: [Bun SQLite API](https://bun.sh/docs/runtime/sqlite),
[Rivet 2.3.17 step context](https://github.com/rivet-dev/rivet/blob/v2.3.17/rivetkit-typescript/packages/rivetkit/src/workflow/context.ts).

First recovery read failed with `core/internal_error`, ray
`xk9mm3givuaxhmvutj1zuv2xykbl00`. After completion, a new read exited 0:
`Completed: true`, `Stored effects: 1`, original row worker_pid 77563. This verifies
one committed row despite two callback attempts. Type checking passed.
