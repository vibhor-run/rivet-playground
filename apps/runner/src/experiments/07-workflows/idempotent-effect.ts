import { Database } from "bun:sqlite";
import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const mode = process.argv[2];
const key = process.argv[3];
if (!key || (mode !== "start" && mode !== "read")) {
  throw new Error("Usage: bun run workflow-idempotent -- start|read KEY");
}
try {
  const demo = mode === "start"
    ? client.workflowIdempotent.getOrCreate([key])
    : client.workflowIdempotent.get([key]);
  const status = await demo.getStatus();
  console.log("Actor key:", key);
  console.log("Completed:", status.completed);
  console.log("Job ID:", status.jobId);
  console.log("External database:", status.databaseFile);
  if (mode === "read") {
    const db = new Database(status.databaseFile, { readonly: true });
    try {
      const rows = db.query<{ job_id: string; worker_pid: number }, [string]>(
        "SELECT job_id, worker_pid FROM effects WHERE job_id = ?",
      ).all(status.jobId);
      console.log("Stored effects:", rows.length);
      console.log("Rows:", rows);
      if (rows.length !== 1) throw new Error("Expected exactly one stored effect for this job ID");
    } finally {
      db.close();
    }
  }
} finally {
  await client.dispose();
}
