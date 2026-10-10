import { counter, queuedCounter, workflowDemo, workflowRecovery, workflowEffect, workflowIdempotent, cronCounter, sleepingCron, protectedCounter, demoSession, notificationInbox, agentSession } from "@playground/actors";
import { setup } from "rivetkit";

export const registry = setup({
  use: { counter, queuedCounter, workflowDemo, workflowRecovery, workflowEffect, workflowIdempotent, cronCounter, sleepingCron, protectedCounter, demoSession, notificationInbox, agentSession },
  startEngine: true,
  startServices: false,
  engineHost: "127.0.0.1",
  enginePort: 6430,
});
