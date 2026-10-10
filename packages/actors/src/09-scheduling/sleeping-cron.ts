import { actor, type ScheduledFireInfo } from "rivetkit";

export const sleepingCron = actor({
  state: { count: 0 },
  options: { sleepTimeout: 5_000 },
  onCreate: async (c) => {
    console.log("[sleeping cron] CREATE", c.key, new Date().toISOString());
    await c.cron.set({
      name: "minute-increment",
      expression: "* * * * *",
      timezone: "Asia/Kolkata",
      action: "increment",
    });
  },
  onWake: (c) => console.log("[sleeping cron] WAKE", c.key, c.state.count, new Date().toISOString()),
  onSleep: (c) => console.log("[sleeping cron] SLEEP", c.key, c.state.count, new Date().toISOString()),
  actions: {
    increment: (c, fire?: ScheduledFireInfo) => {
      c.state.count += 1;
      console.log("[sleeping cron] TICK", c.key, c.state.count, fire, new Date().toISOString());
      return c.state.count;
    },
    snapshot: async (c) => ({ count: c.state.count, job: await c.cron.get("minute-increment") }),
    stopCron: (c) => c.cron.delete("minute-increment"),
  },
});
