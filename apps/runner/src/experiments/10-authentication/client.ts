import { initializeDemoKey, issueDemoToken } from "@playground/actors/auth-tokens";
import { createClient, RivetError } from "rivetkit/client";
import type { registry } from "../../registry";

await initializeDemoKey();
const aliceToken = await issueDemoToken("alice");
const bobToken = await issueDemoToken("bob");
const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-10-auth";

try {
  const owner = client.protectedCounter.getOrCreate([key], { params: { token: aliceToken } }).connect();
  const before = await owner.getCount();
  console.log("Owner identity:", await owner.whoAmI());
  const viewer = client.protectedCounter.get([key], { params: { token: bobToken } }).connect();
  console.log("Viewer identity:", await viewer.whoAmI());
  console.log("Owner increment:", await owner.increment());
  console.log("Viewer reads:", await viewer.getCount());

  let viewerRejected = false;
  try {
    await viewer.increment();
  } catch (error) {
    if (!(error instanceof RivetError) || error.code !== "owner_required") throw error;
    viewerRejected = true;
    console.log("Viewer increment rejected:", error.code);
  }
  if (!viewerRejected) throw new Error("Expected viewer write rejection");
  const after = await viewer.getCount();
  console.log("Viewer still reads:", after);
  if (after !== before + 1) throw new Error("Rejected write changed count");

  const parts = aliceToken.split(".");
  parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].slice(1);
  let invalidRejected = false;
  try {
    await client.protectedCounter.get([key], { params: { token: parts.join(".") } }).getCount();
  } catch (error) {
    if (!(error instanceof RivetError) || error.code !== "forbidden") throw error;
    invalidRejected = true;
    console.log("Tampered credential rejected:", error.code);
  }
  if (!invalidRejected) throw new Error("Expected invalid token rejection");
} finally {
  await client.dispose();
}
