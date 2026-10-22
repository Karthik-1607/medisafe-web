import type { Language } from "./language";

/**
 * MediSafe is organised around two journeys: mental wellbeing (depression,
 * anxiety, sleep, mood) and recovery (drug addiction, dependence, cravings).
 * Everything in the public header follows that model, and resources that are
 * useful for both journeys are deliberately repeated under each of them.
 */

export type PillarId = "wellbeing" | "recovery";

type Localized = Record<Language, string>;

export type SiteLink = {
  id: string;
  href: string;
  label: Localized;
};

export type Pillar = SiteLink & {
  id: PillarId;
  /** Short scope line, e.g. "Depression · anxiety · sleep". */
  scope: Localized;
  /** One sentence shown in the mobile menu. */
  summary: Localized;
};

export const pillars: Pillar[] = [
  {
    id: "wellbeing",
    href: "/mental-health",
    label: {
      english: "Mental wellbeing",
      telugu: "మానసిక శ్రేయస్సు",
      tenglish: "Mental wellbeing",
    },
    scope: {
      english: "Depression · anxiety · sleep · mood",
      telugu: "డిప్రెషన్ · ఆందోళన · నిద్ర · మూడ్",
      tenglish: "Depression · anxiety · sleep · mood",
    },
    summary: {
      english: "Understand low mood, anxiety and sleep, and take one small step that fits today.",
      telugu: "తగ్గిన మానసిక స్థితి, ఆందోళన, నిద్రను అర్థం చేసుకుని, ఈ రోజుకు సరిపోయే చిన్న అడుగు వేయండి.",
      tenglish: "Low mood, anxiety, sleep ni understand cheskuni, ivala ki set ayye small step teesukondi.",
    },
  },
  {
    id: "recovery",
    href: "/recovery",
    label: {
      english: "Recovery",
      telugu: "రికవరీ",
      tenglish: "Recovery",
    },
    scope: {
      english: "Drug addiction · dependence · support",
      telugu: "డ్రగ్ అడిక్షన్ · ఆధారపడటం · సహాయం",
      tenglish: "Drug addiction · dependence · support",
    },
    summary: {
      english: "Learn about substances, cravings and triggers, and find a recovery path without shame.",
      telugu: "పదార్థాలు, క్రేవింగ్స్, ట్రిగ్గర్లను తెలుసుకుని, సిగ్గు లేకుండా రికవరీ మార్గాన్ని కనుగొనండి.",
      tenglish: "Substances, cravings, triggers gurinchi telusukuni, shame lekunda recovery path kanukondi.",
    },
  },
];

/** Header links: the two journeys first, then the support routes. */
export const primaryLinks: SiteLink[] = [
  ...pillars.map(({ id, href, label }) => ({ id, href, label })),
  {
    id: "get-help",
    href: "/help",
    label: { english: "Get help", telugu: "సహాయం", tenglish: "Get help" },
  },
  {
    id: "emergency",
    href: "/emergency",
    label: { english: "Emergency", telugu: "అత్యవసరం", tenglish: "Emergency" },
  },
];

/**
 * Shown under both journeys. These are the same destinations on purpose:
 * a self-check, a doctor and a way to get help belong to both paths.
 */
export const journeyLinks: SiteLink[] = [
  {
    id: "self-check",
    href: "/portal/assessments",
    label: { english: "Self-check", telugu: "స్వీయ తనిఖీ", tenglish: "Self-check" },
  },
  {
    id: "find-care",
    href: "/portal/care-team",
    label: { english: "Find care", telugu: "సంరక్షణ", tenglish: "Find care" },
  },
  {
    id: "get-help",
    href: "/help",
    label: { english: "Get help", telugu: "సహాయం", tenglish: "Get help" },
  },
];

export const careSpaceLink: SiteLink = {
  id: "care-space",
  href: "/portal",
  label: {
    english: "Open care space",
    telugu: "కేర్ స్పేస్",
    tenglish: "Care space",
  },
};

export function labelFor(link: SiteLink, language: Language): string {
  return link.label[language];
}

export function pillarFor(id: PillarId): Pillar {
  return pillars.find((pillar) => pillar.id === id) ?? pillars[0];
}

/** True when the current location belongs to a link (and its child routes). */
export function isActivePath(location: string, href: string): boolean {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}
