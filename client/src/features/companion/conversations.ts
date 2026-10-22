export type Language = "English" | "తెలుగు" | "Tanglish";
export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "done" | "error" | "stopped";
export type MessageFeedback = "helpful" | "not-helpful";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
  status?: MessageStatus;
  feedback?: MessageFeedback;
  safety?: "medical-emergency" | "self-harm";
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

const STORAGE_KEY = "medisafe.conversations.v1";
const LEGACY_MESSAGES_KEY = "medisafe.messages";
const LEGACY_SESSIONS_KEY = "medisafe.sessions";

export function formatMessageTime(date = new Date()): string {
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function newId(prefix: string): string {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomId}`;
}

export function makeWelcomeMessage(): ChatMessage {
  return {
    id: newId("welcome"),
    role: "assistant",
    text: "Hello there. I'm right here with you, and this is your safe, judgment-free space. How are you feeling in your mind and heart today?",
    time: formatMessageTime(),
    status: "done",
  };
}

export function createConversation(): Conversation {
  return {
    id: newId("conversation"),
    title: "New conversation",
    updatedAt: Date.now(),
    messages: [makeWelcomeMessage()],
  };
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === "string"
    && (message.role === "user" || message.role === "assistant")
    && typeof message.text === "string"
    && typeof message.time === "string";
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const conversation = value as Partial<Conversation>;
  return typeof conversation.id === "string"
    && typeof conversation.title === "string"
    && typeof conversation.updatedAt === "number"
    && Array.isArray(conversation.messages)
    && conversation.messages.every(isChatMessage);
}

function safeParse(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function safeParseStorage(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    return safeParse(window.localStorage.getItem(key));
  } catch {
    return undefined;
  }
}

function legacyConversation(): Conversation | undefined {
  if (typeof window === "undefined") return undefined;
  const parsed = safeParseStorage(LEGACY_MESSAGES_KEY);
  if (!Array.isArray(parsed)) return undefined;
  const messages = parsed.filter(isChatMessage).map(message => ({ ...message, status: "done" as const }));
  if (!messages.length) return undefined;
  const firstUserMessage = messages.find(message => message.role === "user")?.text;
  return {
    id: newId("conversation-migrated"),
    title: firstUserMessage ? titleFromMessage(firstUserMessage) : "Earlier conversation",
    updatedAt: Date.now(),
    messages,
  };
}

export function titleFromMessage(text: string): string {
  const compact = text.trim().replace(/\s+/g, " ");
  return compact.length > 36 ? `${compact.slice(0, 36)}…` : compact || "New conversation";
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [createConversation()];
  const saved = safeParseStorage(STORAGE_KEY) ?? safeParseStorage("mindsafe.conversations.v1");
  if (Array.isArray(saved)) {
    const valid = saved.filter(isConversation).map(conversation => ({
      ...conversation,
      messages: conversation.messages.map(message => message.status === "streaming" ? { ...message, status: "stopped" as const } : message),
    }));
    if (valid.length) return valid.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  const migrated = legacyConversation();
  return [migrated ?? createConversation()];
}

export function filterSavedConversations(conversations: Conversation[]): Conversation[] {
  return conversations.filter(conversation => conversation.messages.some(message => message.role === "user"));
}

export function persistConversations(conversations: Conversation[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    window.localStorage.removeItem(LEGACY_MESSAGES_KEY);
    window.localStorage.removeItem(LEGACY_SESSIONS_KEY);
    return true;
  } catch {
    return false;
  }
}

export const conversationStorageKey = STORAGE_KEY;
