import { describe, expect, it, vi } from "vitest";
import { conversationStorageKey, filterSavedConversations, persistConversations, type Conversation } from "./conversations";

const blankDraft: Conversation = {
  id: "draft",
  title: "New conversation",
  updatedAt: 1,
  messages: [{ id: "welcome", role: "assistant", text: "Hi, I’m here. What’s on your mind?", time: "10:00 AM", status: "done" }],
};

const savedConversation: Conversation = {
  ...blankDraft,
  id: "saved",
  title: "A saved conversation",
  messages: [
    ...blankDraft.messages,
    { id: "user-1", role: "user", text: "I have a question.", time: "10:01 AM", status: "done" },
  ],
};

describe("saved MindSafe conversation filtering", () => {
  it("excludes welcome-only drafts so cleared history stays empty", () => {
    expect(filterSavedConversations([blankDraft])).toEqual([]);
    expect(filterSavedConversations([])).toEqual([]);
  });

  it("persists cleared history as an empty array and removes legacy transcript keys", () => {
    const store = new Map<string, string>([["mindsafe.messages", "legacy transcript"], ["mindsafe.sessions", "legacy sessions"]]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
      },
    });
    try {
      expect(persistConversations(filterSavedConversations([blankDraft]))).toBe(true);
      expect(store.get(conversationStorageKey)).toBe("[]");
      expect(store.has("mindsafe.messages")).toBe(false);
      expect(store.has("mindsafe.sessions")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps conversations that contain a user message", () => {
    expect(filterSavedConversations([blankDraft, savedConversation])).toEqual([savedConversation]);
  });
});
