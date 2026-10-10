import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-7-workflow";

try {
  const demo = client.workflowDemo.getOrCreate([key]);
  console.log("Workflow actor key:", key);
  let result = await demo.getResult();
  const deadline = Date.now() + 5_000;
  while (result === null && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    result = await demo.getResult();
  }
  console.log("Workflow result:", result);
  if (result !== 42) throw new Error("Expected the two-step workflow to produce 42");
} finally {
  await client.dispose();
}
