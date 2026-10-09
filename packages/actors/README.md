# Actors

`src/index.ts` defines the counter actor with `state: { count: 0 }` and two actions.

- `increment(c)` changes `c.state.count` and returns its new value.
- `getCount(c)` reads `c.state.count` without changing it.

`c` is Rivet's context for the actor executing the action. `state` supplies the
initial value for a new actor; it does not reset the count on every action.
