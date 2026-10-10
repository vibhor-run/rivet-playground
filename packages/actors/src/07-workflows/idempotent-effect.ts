import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { actor } from "rivetkit";
import { workflow } from "rivetkit/workflow";

const directory = join(tmpdir(), "rivet-learning-effects");
const databaseFile = join(directory, "idempotent.sqlite");

export const workflowIdempotent = actor({
  state: { completed: false },
  run: workflow(async (ctx) => {
    await ctx.step("record-effect", async (step) => {
      await mkdir(directory, { recursive: true });
      const jobId = `${step.actorId}:record-effect`;
      const db = new Database(databaseFile, { create: true });
      let inserted: number;
      try {
        db.run("CREATE TABLE IF NOT EXISTS effects (job_id TEXT PRIMARY KEY, worker_pid INTEGER NOT NULL)");
        inserted = db.query("INSERT OR IGNORE INTO effects (job_id, worker_pid) VALUES (?, ?)")
          .run(jobId, process.pid).changes;
      } finally {
        db.close();
      }
      console.log(`[idempotent workflow] ${inserted === 1 ? "INSERTED" : "DUPLICATE SKIPPED"} ${jobId}; waiting (worker PID ${process.pid})`);
      await new Promise<void>((resolve) => setTimeout(resolve, 20_000));
      step.state.completed = true;
      console.log("[idempotent workflow] STEP completed");
      return jobId;
    });
  }),
  actions: {
    getStatus: (c) => ({
      completed: c.state.completed,
      jobId: `${c.actorId}:record-effect`,
      databaseFile,
    }),
  },
});
