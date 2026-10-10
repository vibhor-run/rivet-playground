import { Type, validateToolCall, type Message, type Tool } from "@earendil-works/pi-ai";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import { actor, event, UserError } from "rivetkit";

const models = builtinModels();
const tools: Tool[] = [{
  name: "add_numbers",
  description: "Add two numbers. Use this tool for addition instead of mental arithmetic.",
  parameters: Type.Object({ a: Type.Number(), b: Type.Number() }),
}];

export const agentSession = actor({
  state: { messages: [] as Message[], busy: false, error: "" },
  createVars: () => ({ live: "", lastUpdate: 0 }),
  events: { changed: event<void>() },
  onWake: (c) => {
    if (c.state.busy) {
      c.state.busy = false;
      c.state.error = "The previous reply was interrupted. Send another message to continue.";
      const lastInput = c.state.messages.findLastIndex((message) => message.role === "user");
      c.state.messages = c.state.messages.slice(0, lastInput + 1);
    }
  },
  actions: {
    snapshot: (c) => ({
      messages: c.state.messages.map((message) => ({
        role: message.role,
        text: typeof message.content === "string" ? message.content : message.content.map((part) => {
          if (part.type === "text") return part.text;
          if (part.type === "toolCall") return `${part.name}(${JSON.stringify(part.arguments)})`;
          return "";
        }).filter(Boolean).join("\n"),
      })),
      live: c.vars.live,
      busy: c.state.busy,
      error: c.state.error,
      model: process.env.AGENT_MODEL ?? "openai/gpt-4o-mini",
    }),
    sendMessage: async (c, text: string) => {
      text = text.trim();
      if (!text || text.length > 4000) throw new UserError("Enter a message of 1–4000 characters", { code: "invalid_message" });
      if (c.state.busy) throw new UserError("Wait for the current reply to finish", { code: "busy" });
      const modelName = process.env.AGENT_MODEL ?? "openai/gpt-4o-mini";
      const separator = modelName.indexOf("/");
      const model = models.getModel(modelName.slice(0, separator), modelName.slice(separator + 1));
      if (!model) throw new UserError("AGENT_MODEL is not in the pi-ai model catalog", { code: "invalid_model" });
      c.state.busy = true;
      c.state.error = "";
      c.state.messages.push({ role: "user", content: text, timestamp: Date.now() });
      c.broadcast("changed");
      await c.keepAwake((async () => {
        try {
          for (let turn = 0; turn < 5; turn++) {
            c.vars.live = "";
            const stream = models.streamSimple(
              process.env.AGENT_BASE_URL ? { ...model, baseUrl: process.env.AGENT_BASE_URL } : model,
              { systemPrompt: "You are a friendly assistant in a Rivet learning playground. Keep answers concise. Use add_numbers for addition. You have no file or shell access.", messages: c.state.messages, tools },
              { signal: AbortSignal.any([c.abortSignal, AbortSignal.timeout(120_000)]), maxTokens: 1500, maxRetries: 0 },
            );
            for await (const frame of stream) {
              if (frame.type === "text_delta") {
                c.vars.live += frame.delta;
                if (Date.now() - c.vars.lastUpdate >= 80) {
                  c.vars.lastUpdate = Date.now();
                  c.broadcast("changed");
                }
              }
            }
            const reply = await stream.result();
            if (reply.stopReason === "error" || reply.stopReason === "aborted") throw new Error(reply.errorMessage ?? "Model request failed");
            c.state.messages.push(reply);
            c.vars.live = "";
            const calls = reply.content.filter((part) => part.type === "toolCall");
            for (const call of calls) {
              let result: string;
              let isError = false;
              try {
                const args = validateToolCall(tools, call);
                if (call.name !== "add_numbers" || typeof args.a !== "number" || typeof args.b !== "number") throw new Error("Invalid addition arguments");
                result = String(args.a + args.b);
              } catch (error) {
                isError = true;
                result = error instanceof Error ? error.message : "Tool failed";
              }
              c.state.messages.push({ role: "toolResult", toolCallId: call.id, toolName: call.name, content: [{ type: "text", text: result }], isError, timestamp: Date.now() });
            }
            c.broadcast("changed");
            if (!calls.length) return;
          }
          throw new Error("Stopped after five model turns. Send another message to continue.");
        } catch (error) {
          console.error("[agentSession]", error instanceof Error ? error.message : "Reply failed");
          c.state.error = "Reply failed. Check the runner’s model configuration and logs, then try again.";
        } finally {
          c.vars.live = "";
          c.state.busy = false;
          c.broadcast("changed");
        }
      })());
    },
  },
});
