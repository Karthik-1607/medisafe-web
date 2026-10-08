import { describe, expect, it } from "vitest";
import { getStoredLanguage, languageLabels } from "../client/src/lib/language";

describe("MindSafe language contract", () => {
  it("exposes English, Telugu, and Tenglish labels", () => {
    expect(languageLabels.english).toBe("English");
    expect(languageLabels.telugu).toBe("తెలుగు");
    expect(languageLabels.tenglish).toBe("Tenglish");
  });

  it("defaults to English outside a browser session", () => {
    expect(getStoredLanguage()).toBe("english");
  });
});
