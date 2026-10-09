import { actor } from "rivetkit";

export const counter = actor({
  state: { count: 0 },
  options: { sleepTimeout: 5_000 },
  onWake: (c) => {
    console.log("[counter] wake", c.state);
  },
  onSleep: (c) => {
    console.log("[counter] sleep", c.state);
  },
  onDestroy: (c) => {
    console.log("[counter] destroy", c.state);
  },
  actions: {
    increment: (c) => {
      c.state.count += 1;
      return c.state.count;
    },
    getCount: (c) => c.state.count,
    destroy: (c) => {
      c.destroy();
    },
  },
});
