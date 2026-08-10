"use client";

import { FileX, MessageSquare } from "lucide-react";
import Button from "@/components/simple/Button";
import CitationChip from "@/components/simple/CitationChip";
import EmptyState from "@/components/simple/EmptyState";
import TextArea from "@/components/simple/TextArea";
import { useChatHistory } from "./_components/ChatHistoryContext";

const ChatPage = () => {
  const {
    activeConversation,
    draft,
    setDraft,
    isStreaming,
    showNoAccessState,
    handleNewChat,
    handleSend,
  } = useChatHistory();

  const hasVisibleMessages =
    !!activeConversation && activeConversation.messages.length > 0;

  return (
    <div className="h-full flex flex-col">
      {showNoAccessState ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<FileX />}
            heading="No documents available yet"
            body="Ask an admin to share a document with you"
          />
        </div>
      ) : !hasVisibleMessages ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare />}
            heading="Welcome to RAGuard"
            body="Ask a question about your documents to get started."
            ctaLabel={!activeConversation ? "New chat" : null}
            onCtaClick={!activeConversation ? handleNewChat : null}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-xl flex flex-col gap-lg">
          {activeConversation.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[65%] bg-accent-subtle-bg rounded-lg p-md">
                  <p className="type-body-lg text-primary whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-xs">
                <p className="type-body-lg text-primary whitespace-pre-wrap">
                  {m.content}
                </p>
                {m.citations && m.citations.length > 0 && (
                  <div className="flex flex-wrap gap-xs">
                    {m.citations.map((c) => (
                      <CitationChip
                        key={c.documentHref}
                        documentTitle={c.documentTitle}
                        excerpt={c.excerpt}
                        documentHref={c.documentHref}
                      />
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          {isStreaming && (
            <p className="type-body-lg text-tertiary">Thinking…</p>
          )}
        </div>
      )}

      <div className="border-t border-line bg-surface p-lg flex items-end gap-sm shrink-0">
        <TextArea
          className="flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask a question about your documents…"
          disabled={isStreaming || showNoAccessState}
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={isStreaming || !draft.trim() || showNoAccessState}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
