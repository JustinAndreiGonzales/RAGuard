"use client";

import { cn } from "@/components/lib/utils";
import Button from "@/components/simple/Button";
import { useChatHistory } from "./ChatHistoryContext";

const ChatSidebarHistory = () => {
  const {
    groupedConversations,
    activeConversationId,
    setActiveConversationId,
    handleNewChat,
  } = useChatHistory();

  return (
    <div className="flex flex-col gap-md">
      <Button variant="secondary" fullWidth onClick={handleNewChat}>
        New chat
      </Button>

      <div className="flex flex-col gap-md">
        {groupedConversations.map(([label, convs]) => (
          <div key={label} className="flex flex-col gap-2xs">
            <p className="type-caption text-tertiary uppercase px-sm">
              {label}
            </p>
            {convs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveConversationId(c.id)}
                className={cn(
                  "w-full text-left px-sm py-xs rounded-md type-body-sm truncate",
                  c.id === activeConversationId
                    ? "bg-accent-subtle-bg text-accent-default"
                    : "text-secondary hover:bg-canvas",
                )}
              >
                {c.title}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebarHistory;
