"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "@/components/simple/Button";
import EmptyState from "@/components/simple/EmptyState";
import Input from "@/components/simple/Input";
import Modal from "@/components/simple/Modal";
import Table, { Column } from "@/components/simple/Table";
import Toast from "@/components/simple/Toast";
import {
  mockCurrentUser,
  mockTeamsWithMemberCount,
  type MockTeam,
} from "@/lib/mock/data";

type TeamTableRow = MockTeam & { memberCount: number };

const TeamsPage = () => {
  const [teamRows, setTeamRows] = useState<TeamTableRow[]>(() => [
    ...mockTeamsWithMemberCount,
  ]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [toast, setToast] = useState<{
    variant: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setTeamNameDraft("");
  };

  const handleCreateTeam = () => {
    const trimmed = teamNameDraft.trim();
    if (!trimmed) return;

    const newTeam: TeamTableRow = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date(),
      memberCount: 0,
    };
    setTeamRows((prev) => [newTeam, ...prev]);
    setTeamNameDraft("");
    setCreateModalOpen(false);
    setToast({ variant: "success", message: "Team created" });
  };

  const columns: Column<TeamTableRow>[] = [
    {
      key: "name",
      label: "Team name",
      render: (v) => (
        <span className="type-body text-primary">{v as string}</span>
      ),
    },
    {
      key: "memberCount",
      label: "Members",
      render: (v) => (
        <span className="type-body-sm text-secondary">{v as number}</span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_v, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => console.log("View team (stub)", row.id)}
        >
          View
        </Button>
      ),
    },
  ];

  const isAdmin = mockCurrentUser.role === "admin";

  return (
    <div className="p-xl">
      {teamRows.length === 0 ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <EmptyState
            icon={<Users />}
            heading="No teams yet"
            body="Create a team to start sharing documents with groups of people."
            ctaLabel={isAdmin ? "Create team" : null}
            onCtaClick={isAdmin ? () => setCreateModalOpen(true) : null}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-xl">
            <h1 className="type-h1 text-primary">Teams</h1>
            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create team
              </Button>
            )}
          </div>
          <Table<TeamTableRow>
            columns={columns}
            data={teamRows}
            keyField="id"
          />
        </>
      )}

      {createModalOpen && (
        <Modal
          size="sm"
          title="Create team"
          onClose={closeCreateModal}
          primaryLabel="Create"
          onPrimaryAction={handleCreateTeam}
          primaryDisabled={teamNameDraft.trim().length === 0}
          hasSecondButton
          secondaryLabel="Cancel"
        >
          <Input
            label="Team name"
            placeholder="e.g. Product Design"
            value={teamNameDraft}
            onChange={(e) => setTeamNameDraft(e.target.value)}
          />
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-lg right-lg z-50">
          <Toast
            variant={toast.variant}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
