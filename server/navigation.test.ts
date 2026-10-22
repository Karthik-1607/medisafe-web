import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { careSpaceLink, journeyLinks, pillars, primaryLinks } from "../client/src/lib/siteNav";
import {
  canAccessSection,
  navFromLocation,
  portalHref,
  portalSlugs,
  sectionsForRole,
} from "../client/src/lib/portalNav";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("MediSafe navigation model", () => {
  it("leads with the two journeys and uses 'Mental wellbeing' as the label", () => {
    expect(pillars.map((pillar) => pillar.id)).toEqual(["wellbeing", "recovery"]);
    expect(pillars[0].href).toBe("/mental-health");
    expect(pillars[1].href).toBe("/recovery");
    expect(pillars[0].label.english).toBe("Mental wellbeing");
    expect(primaryLinks[0].label.english).toBe("Mental wellbeing");
  });

  it("never uses the older clinical nav wording", () => {
    const nav = read("client/src/lib/siteNav.ts");
    expect(nav).not.toMatch(/"Mental health"/);
  });

  it("offers the same shared destinations for both journeys", () => {
    const hrefs = journeyLinks.map((link) => link.href);
    expect(hrefs).toContain("/help");
    expect(hrefs).toContain("/portal/assessments");
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(careSpaceLink.href).toBe("/portal");
  });

  it("keeps every destination distinct within a group", () => {
    const ids = primaryLinks.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
    const hrefs = primaryLinks.map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("registers a route for every navigation destination", () => {
    const app = read("client/src/App.tsx");
    for (const href of primaryLinks.map((link) => link.href)) {
      expect(app).toContain(`path="${href}"`);
    }
    expect(app).toContain('path="/portal/:section"');
    expect(app).toContain('path="/portal"');
  });

  it("renders the shared header on every public page", () => {
    for (const page of [
      "client/src/pages/LandingPage.tsx",
      "client/src/pages/JourneyPage.tsx",
      "client/src/pages/SupportPage.tsx",
      "client/src/pages/NotFound.tsx",
    ]) {
      const source = read(page);
      expect(source).toContain("SiteHeader");
      expect(source).not.toMatch(/<header className="(landing|journey|support|error)-header"/);
    }
  });
});

describe("Portal section URLs", () => {
  it("gives every section a unique slug and a canonical href", () => {
    const slugs = Object.values(portalSlugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(portalHref("Care team")).toBe("/portal/care-team");
    expect(portalHref("My Records")).toBe("/portal/records");
  });

  it("resolves section URLs and rejects unknown ones", () => {
    expect(navFromLocation("/portal")).toBe("Overview");
    expect(navFromLocation("/portal/overview")).toBe("Overview");
    expect(navFromLocation("/portal/care-team")).toBe("Care team");
    expect(navFromLocation("/portal/companion?ref=home")).toBe("Companion");
    expect(navFromLocation("/portal/not-a-section")).toBeNull();
    expect(navFromLocation("/help")).toBeNull();
  });

  it("round-trips every section through the URL", () => {
    for (const role of ["patient", "doctor"] as const) {
      for (const section of sectionsForRole(role)) {
        expect(navFromLocation(portalHref(section))).toBe(section);
      }
    }
  });

  it("keeps patient and clinician sections separate", () => {
    expect(canAccessSection("Companion", "patient")).toBe(true);
    expect(canAccessSection("Companion", "doctor")).toBe(false);
    expect(canAccessSection("Medication", "doctor")).toBe(true);
    expect(canAccessSection("Medication", "patient")).toBe(false);
    expect(canAccessSection("Overview", "patient")).toBe(true);
    expect(canAccessSection("Overview", "doctor")).toBe(true);
  });
});
