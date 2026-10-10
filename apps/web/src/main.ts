import { createClient, type ActorConn } from "rivetkit/client";
import type { agentSession } from "../../../packages/actors/src/12-agent-session/actor";
import type { registry } from "../../runner/src/registry";
import "./style.css";

const client = createClient<typeof registry>("http://127.0.0.1:6430");
const messages = document.querySelector<HTMLElement>("#messages")!;
const prompt = document.querySelector<HTMLTextAreaElement>("#prompt")!;
const send = document.querySelector<HTMLButtonElement>("#send")!;
const status = document.querySelector<HTMLElement>("#status")!;
const error = document.querySelector<HTMLElement>("#error")!;
const sessionTitle = document.querySelector<HTMLElement>("#session-title")!;
const nav = document.querySelector<HTMLElement>("#sessions")!;
const stored: unknown = JSON.parse(localStorage.getItem("rivet-sessions") ?? "[]");
const sessions: { id: string; title: string }[] = Array.isArray(stored) ? stored.filter((item) => typeof item?.id === "string" && typeof item?.title === "string") : [];
let connection: ActorConn<typeof agentSession>;
let busy = false;
let generation = 0;
let refreshNumber = 0;

function saveSessions() {
  localStorage.setItem("rivet-sessions", JSON.stringify(sessions));
  nav.replaceChildren();
  for (const session of sessions) {
    const button = document.createElement("button");
    button.textContent = session.title;
    button.classList.toggle("active", session.id === location.hash.slice(1));
    button.addEventListener("click", () => { location.hash = session.id; });
    nav.append(button);
  }
}

function showMessage(role: string, text: string) {
  if (!text) return;
  const item = document.createElement("div");
  item.className = `message ${role}`;
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = role === "user" ? "You" : role === "toolResult" ? "Tool result" : "Assistant";
  const body = document.createElement("div");
  body.textContent = text;
  item.append(label, body);
  messages.append(item);
}

function welcome() {
  messages.innerHTML = `<div class="welcome"><div class="mark">✳</div><h2>A little room to think.</h2><p>Your own simple agent, one conversation at a time.<br>Ask a question, follow an idea, or watch it use a tool.</p><div class="suggestions"><button type="button">What can you help me with?</button><button type="button">Use your tool to add 23 and 19.</button></div></div>`;
  messages.querySelectorAll(".suggestions button").forEach((button) => button.addEventListener("click", () => {
    prompt.value = button.textContent ?? "";
    prompt.focus();
  }));
}

async function refresh(current: number) {
  const request = ++refreshNumber;
  try {
    const snapshot = await connection.snapshot();
    if (current !== generation || request !== refreshNumber) return;
    const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 100;
    messages.replaceChildren();
    if (!snapshot.messages.length) welcome();
    for (const message of snapshot.messages) showMessage(message.role, message.text);
    showMessage("assistant", snapshot.live);
    busy = snapshot.busy;
    send.disabled = busy;
    status.textContent = busy ? "Thinking…" : "Connected";
    error.textContent = snapshot.error;
    document.querySelector<HTMLElement>("#model")!.textContent = snapshot.model;
    if (nearBottom || busy) messages.scrollTop = messages.scrollHeight;
  } catch {
    if (current === generation) {
      status.textContent = "Disconnected";
      error.textContent = "Cannot reach the actor. Start bun run dev, then reload this page.";
      send.disabled = true;
    }
  }
}

async function openSession() {
  const current = ++generation;
  if (connection) await connection.dispose();
  if (current !== generation) return;
  let id = location.hash.slice(1);
  if (!id) { location.hash = crypto.randomUUID(); return; }
  let session = sessions.find((item) => item.id === id);
  if (!session) { session = { id, title: "New conversation" }; sessions.unshift(session); }
  saveSessions();
  sessionTitle.textContent = session.title;
  status.textContent = "Connecting…";
  send.disabled = true;
  connection = client.agentSession.getOrCreate([id]).connect();
  try {
    await connection.on("changed", () => { void refresh(current); });
    await refresh(current);
  } catch {
    if (current === generation) {
      status.textContent = "Disconnected";
      error.textContent = "Cannot reach the actor. Start bun run dev, then reload this page.";
    }
  }
}

document.querySelector("#new-session")!.addEventListener("click", () => { location.hash = crypto.randomUUID(); });
document.querySelector("#composer")!.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = prompt.value.trim();
  if (!text || busy || send.disabled) return;
  const current = generation;
  const active = connection;
  busy = true;
  send.disabled = true;
  prompt.value = "";
  const session = sessions.find((item) => item.id === location.hash.slice(1))!;
  if (session.title === "New conversation") {
    session.title = text.slice(0, 35);
    sessionTitle.textContent = session.title;
    saveSessions();
  }
  try { await active.sendMessage(text); }
  catch (reason) { if (current === generation) error.textContent = reason instanceof Error ? reason.message : "Message failed"; }
  finally { if (current === generation) await refresh(current); }
});
prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    document.querySelector<HTMLFormElement>("#composer")!.requestSubmit();
  }
});
window.addEventListener("hashchange", () => { void openSession(); });
window.addEventListener("pagehide", () => { void client.dispose(); });
void openSession();
