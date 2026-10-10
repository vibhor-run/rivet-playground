import { counter, queuedCounter } from "@playground/actors";
import { setup } from "rivetkit";

export const registry = setup({
  use: { counter, queuedCounter },
  startEngine: true,
  startServices: false,
  engineHost: "127.0.0.1",
  enginePort: 6430,
});
