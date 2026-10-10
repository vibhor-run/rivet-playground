import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const mode = process.argv[2];
const key = process.argv[3];
if (!key || (mode !== "start" && mode !== "read")) {
  throw new Error("Usage: bun run workflow-recovery -- start|read KEY");
}
try {
  const demo = mode === "start"
    ? client.workflowRecovery.getOrCreate([key])
    : client.workflowRecovery.get([key]);
  console.log("Workflow actor key:", key);
  console.log("Result:", await demo.getResult());
} finally {
  await client.dispose();
}
