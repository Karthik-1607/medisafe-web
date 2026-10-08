import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("MindSafe portal foundation", () => {
  it("does not expose an authenticated user in a public session", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();

    expect(result).toBeUndefined();
  });
});
