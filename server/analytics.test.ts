import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("optional analytics bootstrap", () => {
  it("does not leave unresolved Vite environment placeholders in HTML", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).not.toMatch(/%VITE_ANALYTICS_(?:ENDPOINT|WEBSITE_ID)%/);
  });
});
