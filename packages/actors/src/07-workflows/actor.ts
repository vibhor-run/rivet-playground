import { actor } from "rivetkit";
import { workflow } from "rivetkit/workflow";

export const workflowDemo = actor({
  state: { result: null as number | null },
  run: workflow(async (ctx) => {
    const value = await ctx.step("produce-value", async () => {
      console.log("[workflow] produce-value executed: 21");
      return 21;
    });
    await ctx.step("double-value", async (step) => {
      step.state.result = value * 2;
      console.log("[workflow] double-value executed:", step.state.result);
      return step.state.result;
    });
  }),
  actions: {
    getResult: (c) => c.state.result,
  },
});
