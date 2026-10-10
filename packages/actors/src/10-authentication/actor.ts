import { jwtVerify } from "jose";
import { actor, UserError } from "rivetkit";
import { readSigningKey } from "./tokens";

interface ConnectionState {
  userId: string;
  role: "owner" | "viewer";
}

export const protectedCounter = actor({
  state: { count: 0, ownerUserId: "alice" },
  createConnState: async (c, params: { token: string }): Promise<ConnectionState> => {
    try {
      const { payload } = await jwtVerify(params.token, await readSigningKey(), {
        algorithms: ["HS256"],
        issuer: "local-learning-backend",
        audience: "rivet-playground",
      });
      if (!payload.sub) throw new Error("Missing user identity");
      return {
        userId: payload.sub,
        role: payload.sub === c.state.ownerUserId ? "owner" : "viewer",
      };
    } catch {
      throw new UserError("Invalid credential", { code: "forbidden" });
    }
  },
  actions: {
    whoAmI: (c) => c.conn.state,
    getCount: (c) => c.state.count,
    increment: (c) => {
      if (c.conn.state.role !== "owner") {
        throw new UserError("Only the owner can increment", { code: "owner_required" });
      }
      c.state.count += 1;
      return c.state.count;
    },
  },
});
