import { actor } from "rivetkit";

export const counter = actor({
  state: { count: 0 },
  actions: {
    increment: (c) => {
      c.state.count += 1;
      return c.state.count;
    },
    getCount: (c) => c.state.count,
  },
});
