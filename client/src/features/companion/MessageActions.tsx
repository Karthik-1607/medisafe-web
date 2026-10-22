import { Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { MessageFeedback } from "./conversations";

type Props = {
  feedback?: MessageFeedback;
  retryLabel: string;
  onCopy: () => void;
  onFeedback: (feedback: MessageFeedback) => void;
  onRetry: () => void;
};

export function MessageActions({ feedback, retryLabel, onCopy, onFeedback, onRetry }: Props) {
  return (
    <div className="chat-message-actions">
      <button type="button" onClick={onCopy} aria-label="Copy reply" title="Copy reply"><Copy size={13} /></button>
      <button type="button" className={feedback === "helpful" ? "selected" : ""} onClick={() => onFeedback("helpful")} aria-label="Mark reply helpful" aria-pressed={feedback === "helpful"} title="Helpful"><ThumbsUp size={13} /></button>
      <button type="button" className={feedback === "not-helpful" ? "selected" : ""} onClick={() => onFeedback("not-helpful")} aria-label="Mark reply not helpful" aria-pressed={feedback === "not-helpful"} title="Not helpful"><ThumbsDown size={13} /></button>
      <button type="button" onClick={onRetry} aria-label={retryLabel} title={retryLabel} className="chat-retry-action">
        <RotateCcw size={13} />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}
