import { useMemo, useState, type FormEvent } from "react";
import { Check, Clock3, MessageSquarePlus, Pencil, Search, ShieldCheck, Trash2, X } from "lucide-react";
import type { Conversation } from "./conversations";

type Props = {
  conversations: Conversation[];
  activeId: string;
  temporary: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNewSaved: () => void;
  onNewTemporary: () => void;
};

function relativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function ConversationHistory({
  conversations,
  activeId,
  temporary,
  onSelect,
  onRename,
  onDelete,
  onClearAll,
  onNewSaved,
  onNewTemporary,
}: Props) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter(conversation => !needle
      || conversation.title.toLowerCase().includes(needle)
      || conversation.messages.some(message => message.text.toLowerCase().includes(needle)));
  }, [conversations, query]);

  const beginRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setDraft(conversation.title);
  };
  const saveRename = (event: FormEvent, id: string) => {
    event.preventDefault();
    const title = draft.trim();
    if (title) onRename(id, title);
    setEditingId(null);
  };

  return (
    <section className="chat-history-card" aria-label="Conversation history">
      <div className="chat-history-heading">
        <div>
          <p className="eyebrow">Your conversations</p>
          <h3>Pick up where you left off</h3>
        </div>
        <button className="chat-icon-button" type="button" onClick={onNewSaved} aria-label="Start a new saved conversation" title="New chat">
          <MessageSquarePlus size={16} />
        </button>
      </div>

      <div className={`chat-mode-banner ${temporary ? "temporary" : "saved"}`}>
        <div className="chat-mode-title"><ShieldCheck size={15} /><strong>{temporary ? "Temporary chat" : "Saved on this browser"}</strong></div>
        <p>{temporary
          ? "This conversation is not saved here. The model service still receives your messages to reply."
          : "Your chat history stays in this browser. Messages are sent to the model service for replies."}</p>
        <button className="chat-mode-switch" type="button" onClick={temporary ? onNewSaved : onNewTemporary}>
          {temporary ? "Start a saved chat" : "Start a temporary chat"}
        </button>
      </div>

      <label className="chat-history-search">
        <Search size={15} aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
      </label>

      <div className="chat-history-list" role="list">
        {filtered.map(conversation => (
          <div className={`chat-history-row ${conversation.id === activeId && !temporary ? "active" : ""}`} key={conversation.id} role="listitem">
            {editingId === conversation.id ? (
              <form className="chat-rename-form" onSubmit={event => saveRename(event, conversation.id)}>
                <input value={draft} onChange={event => setDraft(event.target.value)} aria-label="Conversation title" autoFocus maxLength={60} />
                <button type="submit" aria-label="Save conversation name"><Check size={14} /></button>
                <button type="button" aria-label="Cancel rename" onClick={() => setEditingId(null)}><X size={14} /></button>
              </form>
            ) : (
              <>
                <button className="chat-history-open" type="button" onClick={() => onSelect(conversation.id)}>
                  <span className="chat-history-title">{conversation.title}</span>
                  <span className="chat-history-meta"><Clock3 size={11} />{relativeDate(conversation.updatedAt)} · {conversation.messages.length} messages</span>
                </button>
                <button className="chat-row-action" type="button" onClick={() => beginRename(conversation)} aria-label={`Rename ${conversation.title}`} title="Rename">
                  <Pencil size={13} />
                </button>
                <button className="chat-row-action delete" type="button" onClick={() => onDelete(conversation.id)} aria-label={`Delete ${conversation.title}`} title="Delete">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="chat-history-empty">No saved conversations match that search.</p>}
      </div>

      {conversations.length > 0 && (
        <button className="chat-clear-history" type="button" onClick={onClearAll}>Clear saved history</button>
      )}
      <p className="chat-feedback-note">Chat controls and local ratings stay on this browser.</p>
    </section>
  );
}
