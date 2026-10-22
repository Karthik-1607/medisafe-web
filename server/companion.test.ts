import { describe, expect, it } from "vitest";
import { companionRequestSchema, detectSafetyCategory, getSafetyReply } from "./companion";

const request = (content: string, language: "English" | "తెలుగు" | "Tanglish" = "English") => companionRequestSchema.parse({
  language,
  messages: [{ role: "user", content }],
});

describe("MediSafe companion safety and response preferences", () => {
  it("defaults to concise replies without requiring a profile name", () => {
    const parsed = request("I have a question about sleep.");
    expect(parsed.detailLevel).toBe("concise");
    expect("profileName" in parsed).toBe(false);
  });

  it("honors an explicit request for more detail", () => {
    expect(request("Please explain in detail.").detailLevel).toBe("concise");
    expect(companionRequestSchema.parse({ ...request("Tell me more."), detailLevel: "detailed" }).detailLevel).toBe("detailed");
  });

  it.each([
    ["I want to kill myself", "self-harm"],
    ["I am having chest pain and can't breathe", "medical-emergency"],
    ["Nenu chachipovali anipistondi", "self-harm"],
    ["నాకు ఛాతి నొప్పి, శ్వాస ఇబ్బంది ఉంది", "medical-emergency"],
    ["I want to end myself", "self-harm"],
    ["I don't see a reason to live", "self-harm"],
    ["Someone is having a heart attack", "medical-emergency"],
    ["His face is drooping and one side is weak", "medical-emergency"],
    ["They lost consciousness", "medical-emergency"],
    ["I may have overdosed", "medical-emergency"],
    ["I think this may be poisoning", "medical-emergency"],
    ["I feel a little tired today", undefined],
  ] as const)("classifies safety signal in %s", (text, category) => {
    expect(detectSafetyCategory(text)).toBe(category);
  });

  it("returns direct India emergency guidance in the selected language", () => {
    const reply = getSafetyReply(request("I might hurt myself", "Tanglish"));
    expect(reply?.category).toBe("self-harm");
    expect(reply?.text).toContain("112");
    expect(reply?.text).toContain("trusted person");
  });
});
