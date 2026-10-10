import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-1";
const counter = client.counter.get([key]);

try {
  console.log("Actor key:", key);
  console.log("getCount():", await counter.getCount());
} finally {
  await client.dispose();
}
