import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import viteConfig from "../vite.config";

describe("MindSafe development logging privacy", () => {
  it("does not register the removed Manus debug collector plugin", () => {
    const names = (viteConfig.plugins ?? []).map((plugin) =>
      !Array.isArray(plugin) && plugin ? (plugin as { name?: string }).name : undefined,
    );
    expect(names).not.toContain("manus-debug-collector");
  });

  it("does not ship the browser telemetry script", () => {
    expect(existsSync(resolve(process.cwd(), "client/public/__manus__/debug-collector.js"))).toBe(false);
  });

  it("never references the collector from the app HTML", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(html).not.toContain("debug-collector.js");
  });
});
