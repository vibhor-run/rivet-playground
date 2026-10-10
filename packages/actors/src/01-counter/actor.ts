import { actor, event, UserError } from "rivetkit";

export const counter = actor({
  state: { count: 0 },
  events: { countChanged: event<number>() },
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
      c.broadcast("countChanged", c.state.count);
      return c.state.count;
    },
    incrementAfterWait: async (c, label: string) => {
      const oldCount = c.state.count;
      console.log(`[counter] ${label} read ${oldCount}, waiting`);
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      c.state.count = oldCount + 1;
      console.log(`[counter] ${label} wrote ${c.state.count}`);
      c.broadcast("countChanged", c.state.count);
      return { read: oldCount, written: c.state.count };
    },
    waitThenIncrement: async (c, label: string) => {
      console.log(`[counter] ${label} waiting before reading`);
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      c.state.count += 1;
      console.log(`[counter] ${label} incremented to ${c.state.count}`);
      c.broadcast("countChanged", c.state.count);
      return c.state.count;
    },
    getCount: (c) => c.state.count,
    fail: () => {
      throw new UserError("Deliberate learning error", { code: "lesson_failure" });
    },
    destroy: (c) => {
      c.destroy();
    },
  },
});
