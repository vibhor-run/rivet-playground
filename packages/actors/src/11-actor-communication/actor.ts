import { actor, type setup } from "rivetkit";

export const notificationInbox = actor({
  state: { messages: [] as string[] },
  actions: {
    record: (c, text: string): number => {
      c.state.messages.push(text);
      console.log("[notificationInbox] received:", text);
      return c.state.messages.length;
    },
    list: (c): string[] => c.state.messages,
  },
});

type CommunicationRegistry = ReturnType<typeof setup<{
  notificationInbox: typeof notificationInbox;
}>>;

export const demoSession = actor({
  state: {},
  actions: {
    finish: async (c, inboxKey: string): Promise<number> => {
      console.log("[demoSession] calling notificationInbox");
      const inbox = c.client<CommunicationRegistry>().notificationInbox.getOrCreate([inboxKey]);
      const total = await inbox.record("session finished");
      console.log("[demoSession] notification actor returned:", total);
      return total;
    },
  },
});
