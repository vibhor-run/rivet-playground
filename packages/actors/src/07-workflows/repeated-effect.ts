import { appendFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { actor } from "rivetkit";
import { workflow } from "rivetkit/workflow";

const effectsDirectory = join(tmpdir(), "rivet-learning-effects");

export const workflowEffect = actor({
  state: { completed: false },
  run: workflow(async (ctx) => {
    await ctx.step("append-effect", async (step) => {
      await mkdir(effectsDirectory, { recursive: true });
      const file = join(effectsDirectory, `${step.actorId}.log`);
      await appendFile(file, `effect from worker ${process.pid}\n`);
      console.log(`[workflow effect] APPENDED ${file}; waiting (worker PID ${process.pid})`);
      await new Promise<void>((resolve) => setTimeout(resolve, 20_000));
      step.state.completed = true;
      console.log("[workflow effect] STEP completed");
      return "done";
    });
  }),
  actions: {
    getStatus: (c) => ({
      completed: c.state.completed,
      file: join(effectsDirectory, `${c.actorId}.log`),
    }),
  },
});
