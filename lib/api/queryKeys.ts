export const queryKeys = {
  documents: {
    all: ["documents"] as const,
    detail: (id: string) => ["documents", id] as const,
    chunks: (id: string, params?: { limit: number; offset: number }) =>
      ["documents", id, "chunks", params] as const,
    permissions: (id: string) => ["documents", id, "permissions"] as const,
  },
  teams: {
    all: ["teams"] as const,
    detail: (id: string) => ["teams", id] as const,
  },
  users: {
    all: ["users"] as const,
    byEmail: (email: string) => ["users", "byEmail", email] as const,
    me: ["users", "me"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    detail: (id: string) => ["conversations", id] as const,
  },
};
