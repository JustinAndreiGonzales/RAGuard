"use client";

import Table, { Column } from "@/components/Table";
import StatusBadge from "@/components/StatusBadge";
import Avatar from "@/components/Avatar";
import FileTypeTag from "@/components/FileTypeTag";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import EmptyState from "@/components/EmptyState";
import CitationChip from "@/components/CitationChip";
import { Inbox, FolderOpen } from "lucide-react";

interface TeamRow {
  id: number;
  name: string;
  members: number;
}

interface DocumentRow {
  id: string;
  title: string;
  fileType: string;
  status: "pending" | "processing" | "ready" | "failed";
  ownerName: string;
  ownerInitials: string;
  uploadedAt: string;
}

const page = () => {
  const teamColumns: Column<TeamRow>[] = [
    { key: "name", label: "Team name" },
    { key: "members", label: "Members" },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: () => (
        <button className="text-stone-500 hover:text-stone-800 text-sm">
          View
        </button>
      ),
    },
  ];

  const teams: TeamRow[] = [
    { id: 1, name: "Design", members: 2 },
    { id: 2, name: "Ops", members: 3 },
    { id: 3, name: "Security", members: 1 },
  ];

  const documents: DocumentRow[] = [
    {
      id: "1",
      title: "Q3 Roadmap.pdf",
      fileType: "PDF",
      status: "ready",
      ownerName: "Alice Kim",
      ownerInitials: "AK",
      uploadedAt: "2 days ago",
    },
    {
      id: "2",
      title: "Onboarding Guide.docx",
      fileType: "DOCX",
      status: "processing",
      ownerName: "Bob Ruiz",
      ownerInitials: "BR",
      uploadedAt: "5 hours ago",
    },
    {
      id: "3",
      title: "Meeting Notes — quarterly sync and follow-up items.md",
      fileType: "MD",
      status: "failed",
      ownerName: "Admin",
      ownerInitials: "A",
      uploadedAt: "1 week ago",
    },
    {
      id: "4",
      title: "Raw Notes.txt",
      fileType: "TXT",
      status: "pending",
      ownerName: "Alice Kim",
      ownerInitials: "AK",
      uploadedAt: "just now",
    },
  ];

  const documentColumns: Column<DocumentRow>[] = [
    {
      key: "title",
      label: "Title",
      render: (_value, row) => (
        <div className="flex items-center gap-sm">
          <FileTypeTag text={row.fileType} />
          <span className="type-body text-primary truncate">{row.title}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge status={value as DocumentRow["status"]} />
      ),
    },
    {
      key: "ownerName",
      label: "Owner",
      render: (_value, row) => (
        <div className="flex items-center gap-sm">
          <Avatar size="sm" initials={row.ownerInitials} />
          <span className="type-body text-primary">{row.ownerName}</span>
        </div>
      ),
    },
    {
      key: "uploadedAt",
      label: "Uploaded",
      render: (value) => (
        <span className="type-caption text-secondary">{value as string}</span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: () => (
        <div className="flex gap-xs justify-end">
          <Button variant="ghost" size="sm">
            Share
          </Button>
          <Button variant="ghost" size="sm">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-4xl p-4 flex flex-col gap-xl">
      {/* <div>
        <h2 className="type-h3 text-primary mb-sm">Teams</h2>
        <Table<TeamRow> data={teams} columns={teamColumns} keyField="id" />
      </div>
      <div>
        <h2 className="type-h3 text-primary mb-sm">Documents</h2>
        <Table<DocumentRow>
          data={documents}
          columns={documentColumns}
          keyField="id"
        />
      </div> */}
      <div className="flex flex-col gap-sm">
        <h2 className="type-h3 text-primary">Toast</h2>
        <Toast
          variant="success"
          message="Document uploaded successfully."
          onDismiss={() => {}}
        />
        <Toast
          variant="error"
          message="Failed to upload document. Please try again."
          onDismiss={() => {}}
        />
        <Toast
          variant="info"
          message="Your session will expire in 5 minutes."
          onDismiss={() => {}}
        />
        <Toast
          variant="info"
          message="This toast cannot be dismissed."
          dismissible={false}
        />
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="type-h3 text-primary">Empty State</h2>
        <div className="grid grid-cols-2 gap-xl">
          <div className="p-xl border border-line rounded-lg">
            <EmptyState
              icon={<Inbox />}
              heading="No conversations yet"
              body="Ask something to get started."
            />
          </div>
          <div className="p-xl border border-line rounded-lg">
            <EmptyState
              icon={<FolderOpen />}
              heading="No documents yet"
              body="Upload a document to start building your knowledge base."
              ctaLabel="Upload document"
              onCtaClick={() => {}}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="type-h3 text-primary">Citation Chip</h2>
        <p className="type-body-lg text-primary">
          Employees are entitled to 15 days of paid leave per year, accrued
          monthly and carried over up to a maximum of 5 unused days.{" "}
        </p>
        <div className="flex gap-xs">
          <CitationChip
            documentTitle="Employee Handbook 2024.pdf"
            excerpt="Full-time employees accrue 1.25 days of paid leave per month, for a total of 15 days annually. Up to 5 unused days may be carried over into the following calendar year."
            documentHref="/documents/1"
          />
          <CitationChip
            documentTitle="HR Policy — Leave and Time Off (Quarterly Update).md"
            excerpt="Carried-over leave must be used within the first quarter of the new year or it is forfeited."
            documentHref="/documents/2"
          />
          <CitationChip
            documentTitle="Onboarding Guide.docx"
            excerpt="See the benefits section for a summary of leave, sick time, and holiday policies."
            documentHref="/documents/3"
            expanded
          />
        </div>
      </div>
    </div>
  );
};

export default page;
