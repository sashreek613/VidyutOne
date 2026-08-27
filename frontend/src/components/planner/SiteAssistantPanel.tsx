import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { useAssistant } from "../../hooks/useAssistant";

const STARTER_QUESTIONS = [
  "Which sites need grid upgrades?",
  "Why is the top site ranked #1?",
  "What's holding back the lowest-scoring site?",
];

/** Floating chat panel, collapsed to a small button bottom-right by default.
 * Purely additive to the planner dashboard -- reads already-computed site
 * data via the backend assistant endpoint, never scores or recalculates
 * anything itself (see backend/app/services/lyzr_service.py). */
export function SiteAssistantPanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, status, sendMessage } = useAssistant();

  function submit() {
    if (status === "sending") {
      return;
    }
    sendMessage(draft);
    setDraft("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask about these sites"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-vo-accent text-vo-bg shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-vo-line bg-vo-card shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-vo-line px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-vo-text">Ask about these sites</h3>
          <p className="text-[11px] text-vo-muted">Answers from already-scored dashboard data</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="text-vo-muted hover:text-vo-text">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-vo-muted">
              Ask about ranked sites, scores, or recommendations. Try one of these:
            </p>
            <div className="flex flex-col gap-2">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  className="rounded-xl border border-vo-line bg-vo-bg/40 px-3 py-2 text-left text-xs text-vo-text transition-colors hover:border-vo-accent hover:text-vo-accent-ink"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <div key={i} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-vo-accent-dim px-3 py-2 text-xs text-vo-accent-ink"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm border border-vo-line bg-vo-bg/60 px-3 py-2 text-xs text-vo-text"
                }
              >
                {message.text}
              </div>
            </div>
          ))
        )}
        {status === "sending" ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-vo-line bg-vo-bg/60 px-3 py-2 text-xs text-vo-muted">
              Thinking…
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-vo-line p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask a question…"
          disabled={status === "sending"}
          className="flex-1 rounded-xl border border-vo-line bg-vo-bg px-3 py-2 text-xs text-vo-text placeholder:text-vo-muted focus:border-vo-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={status === "sending" || !draft.trim()}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vo-accent text-vo-bg disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
