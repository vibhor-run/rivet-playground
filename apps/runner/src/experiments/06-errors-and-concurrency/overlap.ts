import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const clientA = createClient<typeof registry>("http://127.0.0.1:6430");
const clientB = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-6-overlap";

try {
  const counterA = clientA.counter.getOrCreate([key]).connect();
  const before = await counterA.getCount();
  const counterB = clientB.counter.getOrCreate([key]).connect();
  await counterB.getCount();
  console.log("Shared actor key:", key);
  console.log("Count before:", before);

  const pendingA = counterA.incrementAfterWait("A");
  const pendingB = counterB.incrementAfterWait("B");
  const [resultA, resultB] = await Promise.all([pendingA, pendingB]);
  console.log("A read/wrote:", resultA);
  console.log("B read/wrote:", resultB);
  const after = await counterA.getCount();
  console.log("Final count:", after);

  if (resultA.read !== before || resultB.read !== before) {
    throw new Error("Requests did not overlap during the wait; retry with a fresh key");
  }
  if (resultA.written !== before + 1 || resultB.written !== before + 1 || after !== before + 1) {
    throw new Error("Expected both actions to write the same stale count plus one");
  }
  console.log("Observed lost update: two increments increased the count by only one");
} finally {
  await clientA.dispose();
  await clientB.dispose();
}
