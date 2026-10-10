# Simple session frontend

A small Vite page using the typed Rivet browser client. No React framework or
API server is needed for this first prototype.

From the repository root, follow the [prototype setup](../../experiments/12-agent-session/README.md).
`bun run web` serves the frontend at http://127.0.0.1:5173. The browser connects
directly to the local Rivet engine at http://127.0.0.1:6430.

The URL fragment is the actor key. Open the same URL in two browser windows to
watch the same conversation. New conversation creates a new key. Local storage
holds only the sidebar's keys and titles; message history belongs to the actor.

`src/main.ts` connects, subscribes to `changed`, reads `snapshot`, and calls
`sendMessage`. The event tells clients to refresh their snapshot. `src/style.css`
and `index.html` provide the presentation. User/model text uses `textContent`.
