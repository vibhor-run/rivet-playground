import { actor, event, type ScheduledFireInfo } from "rivetkit";

export const cronCounter = actor({
  state: { count: 0 },
  events: { tick: event<number>() },
  actions: {
    startCron: async (c) => {
      await c.cron.set({
        name: "minute-increment",
        expression: "* * * * *",
        timezone: "Asia/Kolkata",
        action: "increment",
      });
      return c.cron.get("minute-increment");
    },
    increment: (c, fire?: ScheduledFireInfo) => {
      c.state.count += 1;
      console.log("[cron counter] tick", c.state.count, fire);
      c.broadcast("tick", c.state.count);
      return c.state.count;
    },
    getCount: (c) => c.state.count,
    stopCron: (c) => c.cron.delete("minute-increment"),
    getJob: (c) => c.cron.get("minute-increment"),
  },
});
