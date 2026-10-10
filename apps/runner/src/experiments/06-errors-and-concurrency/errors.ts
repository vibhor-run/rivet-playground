import { createClient, RivetError } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-6-errors";

try {
  const counter = client.counter.getOrCreate([key]).connect();
  const before = await counter.getCount();
  console.log("Actor key:", key);
  console.log("Count before error:", before);

  let receivedExpectedError = false;
  try {
    await counter.fail();
  } catch (error) {
    if (!(error instanceof RivetError) || error.code !== "lesson_failure") {
      throw error;
    }
    receivedExpectedError = true;
    console.log("Caught error code:", error.code);
    console.log("Caught error message:", error.message);
  }
  if (!receivedExpectedError) throw new Error("Expected fail() to reject");

  const after = await counter.getCount();
  console.log("Count after error:", after);
  if (after !== before) throw new Error("Count changed unexpectedly");

  const incremented = await counter.increment();
  console.log("Increment after error:", incremented);
  if (incremented !== before + 1) throw new Error("Actor did not continue correctly");
} finally {
  await client.dispose();
}
