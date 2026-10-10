import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const clientA = createClient<typeof registry>("http://127.0.0.1:6430");
const clientB = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-2";
const connectionA = clientA.counter.getOrCreate([key]).connect();
const connectionB = clientB.counter.getOrCreate([key]).connect();

try {
  console.log("Shared actor key:", key);
  console.log("A reads:", await connectionA.getCount());
  console.log("B reads:", await connectionB.getCount());
  console.log("A increments:", await connectionA.increment());
  console.log("B reads A's update:", await connectionB.getCount());

  await connectionA.dispose();
  console.log("A disconnected");

  console.log("B increments after A disconnects:", await connectionB.increment());
  console.log("B reads:", await connectionB.getCount());

  const other = clientB.counter.getOrCreate([key, "other"]);
  console.log("Different actor key:", JSON.stringify([key, "other"]));
  console.log("Different actor reads:", await other.getCount());
} finally {
  await clientA.dispose();
  await clientB.dispose();
}
