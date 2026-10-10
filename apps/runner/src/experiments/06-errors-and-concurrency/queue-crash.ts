import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const mode = process.argv[2];
const key = process.argv[3];
if (!key || (mode !== "send" && mode !== "check" && mode !== "inspect")) {
  throw new Error("Usage: bun run queue-crash -- send|check|inspect KEY");
}

try {
  const counter = client.queuedCounter.getOrCreate([key]);
  const before = await counter.getCount();
  console.log("Actor key:", key);
  console.log("Count:", before);
  if (mode === "send") {
    if (before !== 0) throw new Error("Use a fresh actor key for this test");
    console.log("Sending CRASH-TEST: kill the worker only after its read/wait log");
    const result = await counter.send(
      "increment",
      { label: "CRASH-TEST", delayMs: 30_000 },
      { wait: true, timeout: 10_000 },
    );
    console.log("Queue result:", result.status);
    if (result.status !== "timedOut") throw new Error("Expected timeout after the worker crash");
  } else if (mode === "check") {
    if (before !== 0) throw new Error("Expected no increment from the interrupted message");
    const result = await counter.send(
      "increment",
      { label: "AFTER-RESTART" },
      { wait: true, timeout: 10_000 },
    );
    console.log("New message result:", result);
    if (result.status !== "completed" || result.response?.count !== 1) {
      throw new Error("Expected the new message to complete with count 1");
    }
    const after = await counter.getCount();
    console.log("New message completed; final count:", after);
    if (after !== 1) throw new Error("Unexpected final count");
  }
} finally {
  await client.dispose();
}
