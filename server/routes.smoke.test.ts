import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("MediSafe destination routes", () => {
  it("registers the core public journeys and recovery states", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(app).toContain('path="/mental-health"');
    expect(app).toContain('path="/recovery"');
    expect(app).toContain('path="/help"');
    expect(app).toContain('path="/emergency"');
    expect(app).toContain('path="/login"');
    expect(app).toContain('path="/404"');
  });

  it("connects both landing segments to dedicated pages", () => {
    const landing = readFileSync(resolve(process.cwd(), "client/src/pages/LandingPage.tsx"), "utf8");
    expect(landing).toContain('href="/mental-health"');
    expect(landing).toContain('href="/recovery"');
    expect(landing).toContain('href="/emergency"');
    expect(landing).toContain('href="/login"');
  });
});
