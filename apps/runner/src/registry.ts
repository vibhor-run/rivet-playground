import { counter } from "@playground/actors";
import { setup } from "rivetkit";

export const registry = setup({
  use: { counter },
  startEngine: true,
  startServices: false,
  engineHost: "127.0.0.1",
  enginePort: 6430,
});
