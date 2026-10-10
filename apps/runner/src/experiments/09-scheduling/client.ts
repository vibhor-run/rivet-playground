import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-9-cron";
const counter = client.cronCounter.getOrCreate([key]).connect();
const tick = Promise.withResolvers<number>();
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;

try {
  console.log("Cron actor key:", key);
  const before = await counter.getCount();
  console.log("Count before:", before);
  counter.once("tick", (count) => {
    if (typeof count === "number") tick.resolve(count);
    else tick.reject(new Error("Expected a numeric tick"));
  });
  const job = await counter.startCron();
  started = true;
  if (!job) throw new Error("Expected the cron job to be registered");
  console.log("Cron expression:", job.kind === "cron" ? job.expression : job.kind);
  console.log("Next scheduled run:", new Date(job.nextRunAt).toISOString());
  timer = setTimeout(() => tick.reject(new Error("No cron tick within 90 seconds")), 90_000);
  const count = await tick.promise;
  console.log("Cron tick received:", count);
  if (count !== before + 1) throw new Error("Expected one scheduled increment");
  console.log("Cron deleted:", await counter.stopCron());
  started = false;
  if (await counter.getJob()) throw new Error("Cron job still exists after deletion");
  console.log("Final count:", await counter.getCount());
} finally {
  if (timer) clearTimeout(timer);
  try {
    if (started) await counter.stopCron();
  } finally {
    await client.dispose();
  }
}
