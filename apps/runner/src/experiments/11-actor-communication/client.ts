import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-11-communication";

try {
  const inbox = client.notificationInbox.getOrCreate([key]);
  const before = await inbox.list();
  const session = client.demoSession.getOrCreate([key]);
  const total = await session.finish(key);
  const messages = await inbox.list();
  console.log("Session action returned:", total);
  console.log("Notification actor messages:", messages);
  if (total !== before.length + 1 || messages.length !== total || messages.at(-1) !== "session finished") {
    throw new Error("Expected notification actor to record one new message");
  }
} finally {
  await client.dispose();
}
