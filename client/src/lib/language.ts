export type Language = "english" | "telugu" | "tenglish";

export const languageLabels: Record<Language, string> = {
  english: "English",
  telugu: "తెలుగు",
  tenglish: "Tenglish",
};

export const languageShortLabels: Record<Language, string> = {
  english: "EN",
  telugu: "తె",
  tenglish: "TE",
};

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "english";
  const stored = window.localStorage.getItem("medisafe-language");
  return stored === "telugu" || stored === "tenglish" ? stored : "english";
}

export function storeLanguage(language: Language) {
  if (typeof window !== "undefined") window.localStorage.setItem("medisafe-language", language);
}
