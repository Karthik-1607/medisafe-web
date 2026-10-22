import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  Globe2,
  LockKeyhole,
  Mic,
  MessageCircleHeart,
  Send,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { ConversationHistory } from "./ConversationHistory";
import { MessageActions } from "./MessageActions";
import "./chat.css";
import {
  createConversation,
  filterSavedConversations,
  formatMessageTime,
  loadConversations,
  makeWelcomeMessage,
  newId,
  persistConversations,
  titleFromMessage,
  type ChatMessage,
  type Conversation,
  type Language,
  type MessageFeedback,
} from "./conversations";
import { readChatStream } from "./stream";

type Props = {
  language?: Language;
  setLanguage?: (language: Language) => void;
  setNotice?: (message: string) => void;
};

type DetailLevel = "concise" | "detailed";
type MessageUpdate = ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[]);

function readDetailPreference(): DetailLevel {
  try {
    return window.localStorage.getItem("mindsafe.replyLength") === "detailed" ? "detailed" : "concise";
  } catch {
    return "concise";
  }
}

function getConversationTitle(messages: ChatMessage[]): string | undefined {
  const firstUserMessage = messages.find(message => message.role === "user");
  return firstUserMessage ? titleFromMessage(firstUserMessage.text) : undefined;
}

export function CompanionWorkspace({ language: propLanguage, setLanguage: propSetLanguage, setNotice: propSetNotice }: Props) {
  const [internalLanguage, setInternalLanguage] = useState<Language>(() => {
    try {
      const raw = window.localStorage.getItem("mindsafe.language");
      return raw ? JSON.parse(raw) : "English";
    } catch {
      return "English";
    }
  });

  const language = propLanguage ?? internalLanguage;
  const setLanguage = (lang: Language) => {
    setInternalLanguage(lang);
    try {
      window.localStorage.setItem("mindsafe.language", JSON.stringify(lang));
    } catch {}
    propSetLanguage?.(lang);
  };

  const setNotice = (msg: string) => {
    if (propSetNotice) propSetNotice(msg);
    else toast(msg);
  };

  const [initialConversations] = useState(() => loadConversations());
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0]?.id ?? "");
  const [temporary, setTemporary] = useState(false);
  const [temporaryMessages, setTemporaryMessages] = useState<ChatMessage[]>(() => [makeWelcomeMessage()]);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(readDetailPreference);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState(() => {
    try {
      return window.localStorage.getItem("mindsafe_intention") || "";
    } catch {
      return "";
    }
  });
  const activeController = useRef<AbortController | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const storageWarningShown = useRef(false);

  const activeConversation = conversations.find(conversation => conversation.id === activeId) ?? conversations[0];
  const messages = temporary ? temporaryMessages : activeConversation?.messages ?? [];
  const latestAssistantId = [...messages].reverse().find(message => message.role === "assistant")?.id;
  const latestAssistantIndex = latestAssistantId ? messages.findIndex(message => message.id === latestAssistantId) : -1;
  const canRetryLatest = latestAssistantIndex > 0 && messages.slice(0, latestAssistantIndex).some(message => message.role === "user");
  const today = useMemo(() => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date()), []);

  useEffect(() => {
    if (temporary) return;
    const saved = persistConversations(filterSavedConversations(conversations));
    if (!saved && !storageWarningShown.current) {
      storageWarningShown.current = true;
      setNotice("This browser could not save chat history. You can keep chatting, but saved chats may not return later.");
    } else if (saved) {
      storageWarningShown.current = false;
    }
  }, [conversations, temporary]);

  useEffect(() => {
    try {
      window.localStorage.setItem("mindsafe.replyLength", detailLevel);
    } catch {
      // A reply-length preference is optional and does not block chat.
    }
  }, [detailLevel]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => () => activeController.current?.abort(), []);

  const updateCurrentMessages = (update: MessageUpdate) => {
    if (temporary) {
      setTemporaryMessages(current => typeof update === "function" ? update(current) : update);
      return;
    }
    setConversations(current => current.map(conversation => {
      if (conversation.id !== activeId) return conversation;
      const nextMessages = typeof update === "function" ? update(conversation.messages) : update;
      const autoTitle = conversation.title === "New conversation" ? getConversationTitle(nextMessages) : undefined;
      return {
        ...conversation,
        ...(autoTitle ? { title: autoTitle } : {}),
        updatedAt: Date.now(),
        messages: nextMessages,
      };
    }).sort((first, second) => second.updatedAt - first.updatedAt));
  };

  const runStream = async (context: ChatMessage[], assistantId: string) => {
    const controller = new AbortController();
    activeController.current = controller;
    setIsTyping(true);
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          detailLevel,
          messages: context
            .filter(message => message.text.trim() && message.status !== "error" && message.status !== "stopped")
            .slice(-16)
            .map(message => ({ role: message.role, content: message.text })),
        }),
        signal: controller.signal,
      });
      const result = await readChatStream(response, text => {
        updateCurrentMessages(current => current.map(message => message.id === assistantId
          ? { ...message, text: message.text + text }
          : message));
      });
      updateCurrentMessages(current => current.map(message => message.id === assistantId
        ? { ...message, status: "done", safety: result.safety }
        : message));
      if (result.safety) setNotice("Please use the urgent-support guidance in this reply now.");
    } catch (error) {
      const aborted = controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
      updateCurrentMessages(current => current.map(message => message.id === assistantId
        ? { ...message, status: aborted ? "stopped" : "error" }
        : message));
      if (!aborted) {
        console.error("[MindSafe chat] stream failed", error);
        setNotice("I couldn’t finish that reply. Your message is still here, and you can retry it.");
      }
    } finally {
      if (activeController.current === controller) {
        activeController.current = null;
        setIsTyping(false);
      }
    }
  };

  const sendMessage = (value = input) => {
    const text = value.trim();
    if (!text || isTyping) return;
    const userMessage: ChatMessage = {
      id: newId("user"),
      role: "user",
      text,
      time: formatMessageTime(),
      status: "done",
    };
    const assistantMessage: ChatMessage = {
      id: newId("assistant"),
      role: "assistant",
      text: "",
      time: formatMessageTime(),
      status: "streaming",
    };
    const context = [...messages, userMessage];
    updateCurrentMessages([...context, assistantMessage]);
    setInput("");
    void runStream(context, assistantMessage.id);
  };

  const retryAssistant = (assistantId: string) => {
    if (isTyping) return;
    const index = messages.findIndex(message => message.id === assistantId);
    if (index < 1) return;
    const context = messages.slice(0, index);
    if (!context.some(message => message.role === "user")) return;
    const existingReply = messages[index];
    updateCurrentMessages([
      ...context,
      { ...existingReply, text: "", status: "streaming", feedback: undefined, safety: undefined, time: formatMessageTime() },
    ]);
    void runStream(context, assistantId);
  };

  const stopResponse = () => activeController.current?.abort();

  const startNewSavedChat = () => {
    stopResponse();
    const next = createConversation();
    setConversations(current => [next, ...current]);
    setActiveId(next.id);
    setTemporary(false);
    setTemporaryMessages([makeWelcomeMessage()]);
    setInput("");
  };

  const startTemporaryChat = () => {
    stopResponse();
    setTemporary(true);
    setTemporaryMessages([makeWelcomeMessage()]);
    setInput("");
    setNotice("Temporary chat is not saved in this browser. The model service still processes messages to answer.");
  };

  const openConversation = (id: string) => {
    stopResponse();
    setTemporary(false);
    setActiveId(id);
    setInput("");
  };

  const renameConversation = (id: string, title: string) => {
    setConversations(current => current.map(conversation => conversation.id === id ? { ...conversation, title, updatedAt: Date.now() } : conversation));
  };

  const deleteConversation = (id: string) => {
    const conversation = conversations.find(item => item.id === id);
    if (!conversation || !window.confirm(`Delete “${conversation.title}” from this browser?`)) return;
    if (activeId === id) stopResponse();
    const remaining = conversations.filter(item => item.id !== id);
    const next = remaining.length ? remaining : [createConversation()];
    setConversations(next);
    if (activeId === id) setActiveId(next[0].id);
  };

  const clearSavedHistory = () => {
    if (!window.confirm("Clear all saved MindSafe conversations from this browser? This cannot be undone.")) return;
    stopResponse();
    const next = createConversation();
    setConversations([next]);
    setActiveId(next.id);
    setTemporary(false);
    setTemporaryMessages([makeWelcomeMessage()]);
    setInput("");
    setNotice("Saved conversations were cleared from this browser.");
  };

  const setFeedback = (id: string, feedback: MessageFeedback) => {
    updateCurrentMessages(current => current.map(message => message.id === id ? { ...message, feedback } : message));
  };

  const copyReply = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Reply copied.");
    } catch {
      setNotice("Copy is unavailable in this browser. You can select the reply text instead.");
    }
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setNotice("Spoken replies are not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "తెలుగు" ? "te-IN" : "en-IN";
    utterance.rate = 0.96;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const speechWindow = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice input is not available in this browser. You can still type or paste your message.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language === "తెలుగు" ? "te-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setNotice("I couldn’t hear that clearly. Please try again or type your message.");
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setIsListening(false);
      if (transcript) sendMessage(transcript);
    };
    recognition.start();
  };

  const handleSaveIntention = () => {
    const trimmed = intentionDraft.trim();
    try {
      window.localStorage.setItem("mindsafe_intention", trimmed);
      setNotice(trimmed ? "Your intention is saved for this session." : "Intention cleared.");
    } catch {
      setNotice("Could not save intention in local storage.");
    }
  };

  return (
    <div className="companion-layout">
      <section className="companion-card" aria-label="MindSafe companion chat">
        <div className="companion-topbar">
          <div className="companion-title">
            <div className="sparkle-avatar"><MessageCircleHeart size={17} /></div>
            <div><h2>Your companion</h2><p>Brief, supportive conversation</p></div>
          </div>
          <div className="chat-response-length" role="group" aria-label="Reply length">
            <button type="button" className={detailLevel === "concise" ? "selected" : ""} onClick={() => setDetailLevel("concise")} aria-pressed={detailLevel === "concise"}>Brief</button>
            <button type="button" className={detailLevel === "detailed" ? "selected" : ""} onClick={() => setDetailLevel("detailed")} aria-pressed={detailLevel === "detailed"}>More detail</button>
          </div>
        </div>
        <div className="chat-current-title">
          <span>{temporary ? "Temporary chat · not saved" : activeConversation?.title ?? "New conversation"}</span>
          <span className={`private-pill ${temporary ? "temporary" : "saved"}`}>
            {temporary ? <LockKeyhole size={12} /> : <Check size={12} />}
            {temporary ? "not saved here" : "on this browser"}
          </span>
        </div>
        <div className="date-divider"><span />{today.toUpperCase()}<span /></div>
        <div className="chat-sr-only" role="status" aria-live="polite">{isTyping ? "MindSafe is replying." : ""}</div>
        <div className="message-list" ref={messageListRef} aria-live="off">
          {messages.map(message => (
            <div className={`message-row ${message.role === "user" ? "from-user" : "from-assistant"}`} key={message.id}>
              {message.role === "assistant" && <div className="mini-assistant"><Sparkles size={12} /></div>}
              <div className={`message-bubble ${message.safety ? "urgent-bubble" : ""}`}>
                {message.safety && <div className="chat-safety-label">Urgent support</div>}
                {message.text ? <p>{message.text}</p> : message.status === "streaming" ? <div className="chat-thinking" aria-label="The companion is replying"><i /><i /><i /><span>Thinking</span></div> : null}
                {message.status === "error" && <p className="chat-message-state" role="status">I couldn’t finish that reply. Your message is still here.</p>}
                {message.status === "stopped" && <p className="chat-message-state" role="status">Reply stopped. You can try again.</p>}
                <div className="message-meta">
                  <span>{message.time}{message.status === "streaming" && message.text ? " · replying" : ""}</span>
                  {message.role === "assistant" && message.text && <button className="speak-button" type="button" onClick={() => speak(message.text)} aria-label="Speak this reply"><Volume2 size={13} /></button>}
                </div>
                {message.role === "assistant" && message.text && message.id === latestAssistantId && canRetryLatest && message.status !== "streaming" && (
                  <MessageActions
                    feedback={message.feedback}
                    retryLabel={message.status === "error" || message.status === "stopped" ? "Retry reply" : "Regenerate reply"}
                    onCopy={() => void copyReply(message.text)}
                    onFeedback={feedback => setFeedback(message.id, feedback)}
                    onRetry={() => retryAssistant(message.id)}
                  />
                )}
                {message.role === "assistant" && !message.text && message.id === latestAssistantId && (message.status === "error" || message.status === "stopped") && canRetryLatest && (
                  <MessageActions
                    retryLabel="Retry reply"
                    onCopy={() => setNotice("There is no reply text to copy yet.")}
                    onFeedback={feedback => setFeedback(message.id, feedback)}
                    onRetry={() => retryAssistant(message.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Interactive Quick Prompts */}
        {!isTyping && (
          <div className="chat-chips-scroll">
            {language === "Tanglish" ? (
              <>
                <button type="button" onClick={() => sendMessage("Konchem anxious ga undi")} className="chat-chip">🌱 Anxious ga undi</button>
                <button type="button" onClick={() => sendMessage("Nidra pattatledu, em cheyyali?")} className="chat-chip">🌙 Nidra pattatledu</button>
                <button type="button" onClick={() => sendMessage("Breathing exercise cheddama?")} className="chat-chip">🫁 Breathing exercise</button>
                <button type="button" onClick={() => sendMessage("Just matladataniki safe space kavali")} className="chat-chip">🤝 Just listening kavali</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => sendMessage("I'm feeling anxious and overwhelmed today")} className="chat-chip">🌱 Feeling overwhelmed</button>
                <button type="button" onClick={() => sendMessage("My mind won't stop overthinking")} className="chat-chip">💭 Mind won't stop racing</button>
                <button type="button" onClick={() => sendMessage("Can you guide me through a 1-minute calming breath?")} className="chat-chip">🫁 Quick calming breath</button>
                <button type="button" onClick={() => sendMessage("I just need a safe space to vent and be heard")} className="chat-chip">🤝 Just need to vent</button>
              </>
            )}
          </div>
        )}

        <form className="composer-wrap" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
          <div className="composer">
            <button className={`composer-icon ${isListening ? "listening" : ""}`} type="button" onClick={startListening} aria-label={isListening ? "Listening" : "Use voice input"} title="Voice input"><Mic size={18} /></button>
            <input value={input} onChange={event => setInput(event.target.value)} maxLength={4000} placeholder="Write what’s on your mind…" aria-label="Message your companion" disabled={isTyping} />
            {isTyping
              ? <button className="send-button stop" type="button" onClick={stopResponse} aria-label="Stop response" title="Stop response"><Square size={15} /></button>
              : <button className="send-button" type="submit" disabled={!input.trim()} aria-label="Send message" title="Send message"><Send size={17} /></button>}
          </div>
          <div className="composer-foot"><span>Supportive information, not a diagnosis.</span><span>{messages.filter(message => message.role === "user").length} messages · {detailLevel === "concise" ? "brief replies" : "more detail"}</span></div>
        </form>
      </section>

      <aside className="companion-rail" aria-label="Conversation controls and preferences">
        <ConversationHistory
          conversations={filterSavedConversations(conversations)}
          activeId={activeId}
          temporary={temporary}
          onSelect={openConversation}
          onRename={renameConversation}
          onDelete={deleteConversation}
          onClearAll={clearSavedHistory}
          onNewSaved={startNewSavedChat}
          onNewTemporary={startTemporaryChat}
        />
        <div className="intent-card">
          <div className="intent-label"><span className="aqua-dot" /> SESSION INTENTION <span aria-hidden="true">·</span></div>
          <h3>You don’t have to solve it all.</h3>
          <p>Try naming one thing you can gently set down for tonight.</p>
          <div className="intent-input">
            <input
              aria-label="Session intention"
              placeholder="e.g. Setting aside work worries"
              value={intentionDraft}
              onChange={e => setIntentionDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSaveIntention(); }}
            />
            <button type="button" onClick={handleSaveIntention} aria-label="Save intention"><Send size={14} /></button>
          </div>
        </div>
        <div className="rail-card language-card">
          <div className="rail-card-head"><div><p className="eyebrow">Conversation language</p><h3>Reply in your comfort zone</h3></div><Globe2 size={19} /></div>
          <div className="language-options">{(["English", "తెలుగు", "Tanglish"] as Language[]).map(option => <button type="button" key={option} className={language === option ? "selected" : ""} onClick={() => setLanguage(option)}>{option}{language === option && <Check size={14} />}</button>)}</div>
          <p className="language-note">Casual Telugu-in-English is welcome — “miru ela unnaru?”</p>
        </div>
        <div className="rail-card voice-card"><div className="voice-art"><AudioLines size={22} /></div><div><p className="eyebrow">Need a quieter way?</p><h3>Listen to replies</h3><p>Use the speaker on any response for spoken support.</p></div></div>
      </aside>
    </div>
  );
}
