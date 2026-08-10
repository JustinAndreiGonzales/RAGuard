export type ChatCitation = {
  documentTitle: string;
  excerpt: string;
  documentHref: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  createdAt: Date;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: Date;
};

export const MOCK_NO_CONVERSATIONS_YET = false;

const HANDBOOK_CITATION: ChatCitation = {
  documentTitle: "Employee Handbook 2026.pdf",
  excerpt:
    "Full-time employees accrue 1.25 days of paid leave per month, for a total of 15 days annually. Up to 5 unused days may be carried over into the following calendar year.",
  documentHref: "/documents/doc-handbook",
};

const RUNBOOK_CITATION: ChatCitation = {
  documentTitle: "Security Incident Runbook.md",
  excerpt:
    "On detection, page the on-call engineer and open an incident channel within 15 minutes. Do not attempt remediation before the incident is logged.",
  documentHref: "/documents/doc-runbook",
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

export function buildInitialConversations(): Conversation[] {
  if (MOCK_NO_CONVERSATIONS_YET) return [];

  return [
    {
      id: "conv-leave-policy",
      title: "Leave policy questions",
      updatedAt: hoursAgo(2),
      messages: [
        {
          id: "msg-leave-1",
          role: "user",
          content: "How much paid leave do full-time employees get?",
          createdAt: hoursAgo(2.02),
        },
        {
          id: "msg-leave-2",
          role: "assistant",
          content:
            "Full-time employees accrue 1.25 days of paid leave per month, totaling 15 days per year. Up to 5 unused days can carry over into the next calendar year.",
          citations: [HANDBOOK_CITATION],
          createdAt: hoursAgo(2),
        },
      ],
    },
    {
      id: "conv-incident-response",
      title: "Incident response steps",
      updatedAt: hoursAgo(26),
      messages: [
        {
          id: "msg-incident-1",
          role: "user",
          content: "What's the first step when we detect a security incident?",
          createdAt: hoursAgo(26.02),
        },
        {
          id: "msg-incident-2",
          role: "assistant",
          content:
            "Page the on-call engineer and open an incident channel within 15 minutes of detection. Remediation shouldn't start until the incident has been logged.",
          citations: [RUNBOOK_CITATION],
          createdAt: hoursAgo(26),
        },
      ],
    },
    {
      id: "conv-onboarding",
      title: "Onboarding checklist walkthrough",
      updatedAt: hoursAgo(24 * 5),
      messages: [
        {
          id: "msg-onboard-1",
          role: "user",
          content: "Summarize the key points from the employee handbook.",
          createdAt: hoursAgo(24 * 5 + 0.02),
        },
        {
          id: "msg-onboard-2",
          role: "assistant",
          content:
            "The handbook covers leave accrual and carryover, benefits enrollment windows, and the standard onboarding checklist for new hires' first two weeks.",
          citations: [HANDBOOK_CITATION],
          createdAt: hoursAgo(24 * 5),
        },
      ],
    },
  ];
}

export function generateMockReply(
  userText: string,
  turnIndex: number,
): { content: string; citations: ChatCitation[] } {
  const citations =
    turnIndex % 2 === 0
      ? [HANDBOOK_CITATION]
      : [HANDBOOK_CITATION, RUNBOOK_CITATION];

  return {
    content: `Based on the documents you have access to, here's what I found relevant to "${userText.trim()}": ${citations[0].excerpt}`,
    citations,
  };
}
