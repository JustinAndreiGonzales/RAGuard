export type Role = "admin" | "user";
export type FileType = "pdf" | "txt" | "docx" | "md";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";
export type PrincipalType = "user" | "team";
export type Visibility = "private" | "public";

export type DocumentListItem = {
  id: string;
  owner: string;
  title: string;
  fileType: FileType;
  status: DocumentStatus;
  sharedVia: PrincipalType | null;
  sharedName: string | null;
  createdAt: string;
};

export type DocumentDetail = {
  id: string;
  title: string;
  originalFileName: string;
  fileType: FileType;
  fileSizeBytes: number;
  status: DocumentStatus;
  embeddingModel: string | null;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string | null };
  chunkCount: number;
};

export type DocumentChunk = {
  id: string;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  createdAt: string;
};

export type DocumentChunksResponse = {
  chunks: DocumentChunk[];
  pagination: { limit: number; offset: number; total: number };
};

export type DocumentPermission = {
  id: string;
  principalId: string;
  principalType: PrincipalType;
  grantedBy: string | null;
  name?: string;
};

export type Team = { id: string; name: string; memberCount?: number };

export type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  joinedAt: string;
};

export type TeamDetail = {
  id: string;
  name: string;
  createdAt: string;
  members: TeamMember[];
};

export type UserSummary = { id: string; name: string | null };
export type UserListItem = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

export type Me = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  teams: { id: string; name: string }[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatCitation = {
  documentId: string;
  documentTitle: string;
  excerpt: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  kind?: "answer" | "system_notice";
  content: string;
  citations?: ChatCitation[];
  createdAt: string;
};

export type ConversationDetail = ConversationSummary & { messages: Message[] };
