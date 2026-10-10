import { actor } from "rivetkit";
import { workflow } from "rivetkit/workflow";

export const workflowRecovery = actor({
  state: { result: null as number | null },
  run: workflow(async (ctx) => {
    const value = await ctx.step("produce-value", async () => {
      console.log(`[workflow recovery] STEP 1 executed (worker PID ${process.pid})`);
      return 21;
    });
    console.log("[workflow recovery] Step 1 returned:", value);
    await ctx.step("double-value", async (step) => {
      console.log(`[workflow recovery] STEP 2 started, waiting (worker PID ${process.pid})`);
      await new Promise<void>((resolve) => setTimeout(resolve, 20_000));
      step.state.result = value * 2;
      console.log("[workflow recovery] STEP 2 finished:", step.state.result);
      return step.state.result;
    });
  }),
  actions: {
    getResult: (c) => c.state.result,
  },
});
