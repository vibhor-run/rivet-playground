import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const clientA = createClient<typeof registry>("http://127.0.0.1:6430");
const clientB = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-6-queues";

try {
  const counterA = clientA.queuedCounter.getOrCreate([key]);
  const before = await counterA.getCount();
  const counterB = clientB.queuedCounter.getOrCreate([key]);
  await counterB.getCount();
  console.log("Shared queued actor key:", key);
  console.log("Count before:", before);

  const pendingA = counterA.send("increment", { label: "A" }, { wait: true, timeout: 10_000 });
  const pendingB = counterB.send("increment", { label: "B" }, { wait: true, timeout: 10_000 });
  const [resultA, resultB] = await Promise.all([pendingA, pendingB]);
  if (resultA.status !== "completed" || resultB.status !== "completed") {
    throw new Error("Expected both queue messages to complete before timeout");
  }
  if (!resultA.response || !resultB.response) {
    throw new Error("Expected a count in each completion response");
  }
  console.log("A completion:", resultA.response);
  console.log("B completion:", resultB.response);
  const after = await counterA.getCount();
  console.log("Final count:", after);
  const counts = [resultA.response.count, resultB.response.count].sort((a, b) => a - b);
  if (counts[0] !== before + 1 || counts[1] !== before + 2 || after !== before + 2) {
    throw new Error("Expected sequential queue processing to count both increments");
  }
  console.log("PASS: both read/wait/write operations were counted");
} finally {
  await clientA.dispose();
  await clientB.dispose();
}
