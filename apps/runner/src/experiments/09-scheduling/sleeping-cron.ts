import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const mode = process.argv[2];
const key = process.argv[3];
if (!key || (mode !== "create" && mode !== "check")) {
  throw new Error("Usage: bun run cron-sleep -- create|check KEY");
}
try {
  const counter = mode === "create"
    ? client.sleepingCron.getOrCreate([key])
    : client.sleepingCron.get([key]);
  if (mode === "create") {
    const snapshot = await counter.snapshot();
    console.log("Actor key:", key);
    console.log("Count:", snapshot.count);
    if (!snapshot.job) throw new Error("Expected onCreate to register cron; use a fresh key");
    console.log("Next run:", new Date(snapshot.job.nextRunAt).toISOString());
    console.log("Client exiting. Wait for worker SLEEP, WAKE, TICK logs before check.");
  } else {
    try {
      const snapshot = await counter.snapshot();
      console.log("Count after scheduled wake:", snapshot.count);
      if (snapshot.count !== 1) throw new Error("Expected one cron tick; check shortly after the first scheduled run");
    } finally {
      console.log("Cron deleted:", await counter.stopCron());
    }
    if ((await counter.snapshot()).job) throw new Error("Job remained after deletion");
  }
} finally {
  await client.dispose();
}
