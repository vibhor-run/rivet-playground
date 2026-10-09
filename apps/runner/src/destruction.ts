import { createClient, RivetError } from "rivetkit/client";
import type { registry } from "./registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = `destruction-test-${Date.now()}`;
const counter = client.counter.getOrCreate([key]);

try {
  console.log("Test actor key:", key);
  console.log("First increment:", await counter.increment());
  console.log("Second increment:", await counter.increment());
  const originalId = await counter.resolve();
  console.log("Original actor ID:", originalId);

  await counter.destroy();
  console.log("Actor destroyed");

  try {
    await client.counter.get([key]).getCount();
    throw new Error("Expected the destroyed actor to be missing");
  } catch (error) {
    if (!RivetError.isRivetError(error) || error.code !== "not_found") {
      throw error;
    }
    console.log("get() after destruction:", error.code);
  }

  const replacement = client.counter.getOrCreate([key]);
  const count = await replacement.getCount();
  const replacementId = await replacement.resolve();
  console.log("Recreated actor count:", count);
  console.log("Replacement actor ID:", replacementId);
  console.log("Different actor ID:", originalId !== replacementId);

  if (count !== 0 || originalId === replacementId) {
    throw new Error("Expected a new actor with count 0");
  }
} finally {
  await client.dispose();
}
