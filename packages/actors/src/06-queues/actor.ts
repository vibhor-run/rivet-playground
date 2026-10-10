import { actor, queue } from "rivetkit";

export const queuedCounter = actor({
  state: { count: 0 },
  queues: {
    increment: queue<{ label: string; delayMs?: number }, { count: number }>(),
  },
  run: async (c) => {
    for await (const message of c.queue.iter({ completable: true })) {
      const oldCount = c.state.count;
      console.log(`[queued counter] ${message.body.label} read ${oldCount}, waiting (worker PID ${process.pid})`);
      await new Promise<void>((resolve) => setTimeout(resolve, message.body.delayMs ?? 1_000));
      c.state.count = oldCount + 1;
      console.log(`[queued counter] ${message.body.label} wrote ${c.state.count}`);
      await message.complete({ count: c.state.count });
    }
  },
  actions: {
    getCount: (c) => c.state.count,
  },
});
