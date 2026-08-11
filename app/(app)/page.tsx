"use client";

import { FileX, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "@/components/simple/Button";
import CitationChip from "@/components/simple/CitationChip";
import EmptyState from "@/components/simple/EmptyState";
import TextArea from "@/components/simple/TextArea";
import { useChatHistory } from "./_components/ChatHistoryContext";

const ChatPage = () => {
  const {
    activeConversationId,
    activeConversationDetail,
    isActiveConversationLoading,
    draft,
    setDraft,
    isStreaming,
    pendingUserText,
    streamingText,
    showNoAccessState,
    handleNewChat,
    handleSend,
  } = useChatHistory();

  const persistedMessages = activeConversationDetail?.messages ?? [];
  const hasVisibleMessages = persistedMessages.length > 0 || !!pendingUserText;

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
      ) : activeConversationId && isActiveConversationLoading && !pendingUserText ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="type-body text-tertiary">Loading conversation…</p>
        </div>
      ) : !hasVisibleMessages ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare />}
            heading="Welcome to RAGuard"
            body="Ask a question about your documents to get started."
            ctaLabel={!activeConversationId ? "New chat" : null}
            onCtaClick={!activeConversationId ? handleNewChat : null}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-xl flex flex-col gap-lg">
          {persistedMessages.map((m, messageIndex) => {
            const isLastMessage = messageIndex === persistedMessages.length - 1;
            return m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[65%] bg-accent-subtle-bg rounded-lg p-md">
                  <p className="type-body-lg text-primary whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[65%] flex flex-col gap-xs bg-surface border border-line-subtle rounded-lg p-md">
                  <div className="type-body-lg text-primary [&_p]:m-0 [&_p+p]:mt-sm [&_table]:border-collapse [&_table]:mt-sm [&_th]:border [&_th]:border-line [&_th]:p-xs [&_td]:border [&_td]:border-line [&_td]:p-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      {m.citations.map((c, i) => (
                        <CitationChip
                          key={`${m.id}-${c.documentId}-${i}`}
                          documentTitle={c.documentTitle}
                          excerpt={c.excerpt}
                          documentHref={`/documents/${c.documentId}`}
                          forceUpward={isLastMessage}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {pendingUserText && (
            <div className="flex justify-end">
              <div className="max-w-[65%] bg-accent-subtle-bg rounded-lg p-md">
                <p className="type-body-lg text-primary whitespace-pre-wrap">
                  {pendingUserText}
                </p>
              </div>
            </div>
          )}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[65%] bg-surface border border-line-subtle rounded-lg p-md">
                {streamingText ? (
                  <div className="type-body-lg text-primary [&_p]:m-0 [&_p+p]:mt-sm [&_table]:border-collapse [&_table]:mt-sm [&_th]:border [&_th]:border-line [&_th]:p-xs [&_td]:border [&_td]:border-line [&_td]:p-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingText}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="type-body-lg text-primary">Thinking…</p>
                )}
              </div>
            </div>
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
