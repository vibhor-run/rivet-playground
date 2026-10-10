import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const clientA = createClient<typeof registry>("http://127.0.0.1:6430");
const clientB = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-6-wait-first";

try {
  const counterA = clientA.counter.getOrCreate([key]).connect();
  const before = await counterA.getCount();
  const counterB = clientB.counter.getOrCreate([key]).connect();
  const beforeB = await counterB.getCount();
  if (beforeB !== before) throw new Error("Clients did not read the same count");
  console.log("Shared actor key:", key);
  console.log("Count before:", before);

  const pendingA = counterA.waitThenIncrement("A");
  const pendingB = counterB.waitThenIncrement("B");
  const [resultA, resultB] = await Promise.all([pendingA, pendingB]);
  console.log("A increment returned:", resultA);
  console.log("B increment returned:", resultB);

  const after = await counterA.getCount();
  console.log("Final count:", after);
  const results = [resultA, resultB].sort((a, b) => a - b);
  if (results[0] !== before + 1 || results[1] !== before + 2 || after !== before + 2) {
    throw new Error("Expected both increments to be counted exactly once");
  }
  console.log("PASS: both increments were counted");
} finally {
  await clientA.dispose();
  await clientB.dispose();
}
