import { readFile } from "node:fs/promises";
import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const mode = process.argv[2];
const key = process.argv[3];
if (!key || (mode !== "start" && mode !== "read")) {
  throw new Error("Usage: bun run workflow-effect -- start|read KEY");
}
try {
  const demo = mode === "start"
    ? client.workflowEffect.getOrCreate([key])
    : client.workflowEffect.get([key]);
  const status = await demo.getStatus();
  console.log("Actor key:", key);
  console.log("Completed:", status.completed);
  console.log("Effect file:", status.file);
  if (mode === "read") {
    const contents = await readFile(status.file, "utf8");
    const lines = contents.trim().split("\n");
    console.log("Effect count:", lines.length);
    console.log(contents.trim());
  }
} finally {
  await client.dispose();
}
