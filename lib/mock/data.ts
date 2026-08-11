import type { InferSelectModel } from "drizzle-orm";
import {
  documentPermissions,
  documents,
  teamMembers,
  teams,
  users,
} from "@/db/schema";

export type MockUser = InferSelectModel<typeof users>;
export type MockDocument = InferSelectModel<typeof documents>;
export type MockDocumentPermission = InferSelectModel<
  typeof documentPermissions
>;
export type MockTeam = InferSelectModel<typeof teams>;
export type MockTeamMember = InferSelectModel<typeof teamMembers>;

export const MOCK_VIEWER_IS_ADMIN = true;
export const MOCK_EMPTY_DOCUMENTS = false;
export const MOCK_EMPTY_TEAMS = false;
export const MOCK_USER_HAS_DOCUMENT_ACCESS = true;

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

export const mockUsers: MockUser[] = [
  {
    id: "usr-alice",
    email: "alice@example.com",
    name: "Alice Kim",
    passwordHash: null,
    role: MOCK_VIEWER_IS_ADMIN ? "admin" : "user",
    createdAt: hoursAgo(24 * 90),
    updatedAt: hoursAgo(24 * 90),
  },
  {
    id: "usr-ben",
    email: "ben@example.com",
    name: "Ben Ortiz",
    passwordHash: null,
    role: "user",
    createdAt: hoursAgo(24 * 60),
    updatedAt: hoursAgo(24 * 60),
  },
  {
    id: "usr-carla",
    email: "carla@example.com",
    name: "Carla Reyes",
    passwordHash: null,
    role: "admin",
    createdAt: hoursAgo(24 * 120),
    updatedAt: hoursAgo(24 * 120),
  },
];

export const mockCurrentUser: MockUser = mockUsers.find(
  (u) => u.id === "usr-alice",
)!;

export const mockTeams: MockTeam[] = MOCK_EMPTY_TEAMS
  ? []
  : [
      { id: "team-eng", name: "Engineering", createdAt: hoursAgo(24 * 80) },
      { id: "team-design", name: "Design", createdAt: hoursAgo(24 * 50) },
    ];

export const mockTeamMembers: MockTeamMember[] = MOCK_EMPTY_TEAMS
  ? []
  : [
      { teamId: "team-eng", userId: "usr-alice", createdAt: hoursAgo(24 * 80) },
      { teamId: "team-eng", userId: "usr-ben", createdAt: hoursAgo(24 * 79) },
      {
        teamId: "team-design",
        userId: "usr-carla",
        createdAt: hoursAgo(24 * 50),
      },
    ];

export const mockDocuments: MockDocument[] = MOCK_EMPTY_DOCUMENTS
  ? []
  : [
      {
        id: "doc-handbook",
        ownerId: "usr-alice",
        visibility: "private",
        title: "Employee Handbook 2026.pdf",
        originalFileName: "employee-handbook-2026.pdf",
        fileType: "pdf",
        storagePath: "usr-alice/doc-handbook-employee-handbook-2026.pdf",
        fileSizeBytes: 842_000,
        status: "ready",
        processingError: null,
        embeddingModel: "voyage-4-lite",
        createdAt: hoursAgo(72),
        updatedAt: hoursAgo(71),
      },
      {
        id: "doc-roadmap",
        ownerId: "usr-alice",
        visibility: "private",
        title: "Q3 Roadmap Notes.docx",
        originalFileName: "q3-roadmap-notes.docx",
        fileType: "docx",
        storagePath: "usr-alice/doc-roadmap-q3-roadmap-notes.docx",
        fileSizeBytes: 128_500,
        status: "processing",
        processingError: null,
        embeddingModel: null,
        createdAt: hoursAgo(0.2),
        updatedAt: hoursAgo(0.05),
      },
      {
        id: "doc-runbook",
        ownerId: "usr-ben",
        visibility: "public",
        title: "Security Incident Runbook.md",
        originalFileName: "security-incident-runbook.md",
        fileType: "md",
        storagePath: "usr-ben/doc-runbook-security-incident-runbook.md",
        fileSizeBytes: 41_200,
        status: "ready",
        processingError: null,
        embeddingModel: "voyage-4-lite",
        createdAt: hoursAgo(24 * 5),
        updatedAt: hoursAgo(24 * 5 - 1),
      },
      {
        id: "doc-vendor",
        ownerId: "usr-carla",
        visibility: "private",
        title: "Vendor Contract Draft.pdf",
        originalFileName: "vendor-contract-draft.pdf",
        fileType: "pdf",
        storagePath: "usr-carla/doc-vendor-vendor-contract-draft.pdf",
        fileSizeBytes: 305_000,
        status: "pending",
        processingError: null,
        embeddingModel: null,
        createdAt: hoursAgo(1),
        updatedAt: hoursAgo(1),
      },
      {
        id: "doc-legacy",
        ownerId: "usr-ben",
        visibility: "private",
        title: "Legacy Migration Notes.txt",
        originalFileName: "legacy-migration-notes.txt",
        fileType: "txt",
        storagePath: "usr-ben/doc-legacy-legacy-migration-notes.txt",
        fileSizeBytes: 9_800,
        status: "failed",
        processingError: "Unsupported encoding detected in source file.",
        embeddingModel: null,
        createdAt: hoursAgo(24 * 9),
        updatedAt: hoursAgo(24 * 9 - 1),
      },
    ];

export const mockDocumentPermissions: MockDocumentPermission[] =
  MOCK_EMPTY_DOCUMENTS
    ? []
    : [
        {
          id: "perm-handbook-eng",
          documentId: "doc-handbook",
          principalType: "team",
          principalId: "team-eng",
          grantedBy: "usr-alice",
          createdAt: hoursAgo(71),
        },
        {
          id: "perm-runbook-alice",
          documentId: "doc-runbook",
          principalType: "user",
          principalId: "usr-alice",
          grantedBy: "usr-ben",
          createdAt: hoursAgo(24 * 5 - 1),
        },
      ];

export function getDocumentOwner(doc: MockDocument): MockUser {
  return (
    mockUsers.find((u) => u.id === doc.ownerId) ?? {
      id: doc.ownerId,
      email: "unknown@example.com",
      name: "Unknown",
      passwordHash: null,
      role: "user",
      createdAt: now,
      updatedAt: now,
    }
  );
}

export function getDocumentSharedVia(
  doc: MockDocument,
): { kind: "direct" | "team" | "none"; label: string } {
  const permission = mockDocumentPermissions.find(
    (p) => p.documentId === doc.id,
  );

  if (!permission) return { kind: "none", label: "—" };

  if (permission.principalType === "team") {
    const team = mockTeams.find((t) => t.id === permission.principalId);
    return { kind: "team", label: `Team - ${team?.name ?? "Unknown"}` };
  }

  return { kind: "direct", label: "Direct" };
}

export function getTeamMemberCount(team: MockTeam): number {
  return mockTeamMembers.filter((m) => m.teamId === team.id).length;
}

export const mockTeamsWithMemberCount: (MockTeam & {
  memberCount: number;
})[] = mockTeams.map((team) => ({
  ...team,
  memberCount: getTeamMemberCount(team),
}));
