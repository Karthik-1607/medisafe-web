export type PortalRole = "patient" | "doctor";

export type PortalNavId =
  | "Overview"
  | "Companion"
  | "Assessments"
  | "Wellness"
  | "Care team"
  | "My Records"
  | "Patients"
  | "Medication"
  | "Alerts";

/** Canonical URL slug for every portal section. */
export const portalSlugs: Record<PortalNavId, string> = {
  Overview: "overview",
  Companion: "companion",
  Assessments: "assessments",
  Wellness: "wellness",
  "Care team": "care-team",
  "My Records": "records",
  Patients: "patients",
  Medication: "medication",
  Alerts: "alerts",
};

const sectionToNav: Record<string, PortalNavId> = Object.fromEntries(
  Object.entries(portalSlugs).map(([nav, slug]) => [slug, nav as PortalNavId]),
);

const patientSections: PortalNavId[] = ["Overview", "Companion", "Assessments", "Wellness", "Care team", "My Records"];
const doctorSections: PortalNavId[] = ["Overview", "Patients", "Assessments", "Medication", "Alerts"];

export function sectionsForRole(role: PortalRole): PortalNavId[] {
  return role === "patient" ? patientSections : doctorSections;
}

export function portalHref(nav: PortalNavId): string {
  return `/portal/${portalSlugs[nav]}`;
}

/** Resolve the section out of a /portal/<slug> URL. Unknown slugs return null. */
export function navFromLocation(location: string): PortalNavId | null {
  const [path] = location.split("?");
  if (path !== "/portal" && !path.startsWith("/portal/")) return null;
  const slug = path.replace(/^\/portal\/?/, "").split("/")[0];
  if (!slug) return "Overview";
  return sectionToNav[slug] ?? null;
}

export function canAccessSection(nav: PortalNavId, role: PortalRole): boolean {
  return sectionsForRole(role).includes(nav);
}
