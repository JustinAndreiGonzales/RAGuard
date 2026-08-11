"use client";

import { Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDeleteModal from "@/components/compound/ConfirmDeleteModal";
import { useToast } from "@/components/providers/ToastProvider";
import Button from "@/components/simple/Button";
import EmptyState from "@/components/simple/EmptyState";
import Input from "@/components/simple/Input";
import Modal from "@/components/simple/Modal";
import Table, { Column } from "@/components/simple/Table";
import { getErrorMessage } from "@/lib/api/errors";
import type { Team } from "@/lib/api/types";
import {
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useTeamsQuery,
} from "@/lib/hooks/useTeams";

const TeamsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const isAdmin = session?.user?.role === "admin";

  const teamsQuery = useTeamsQuery();
  const createTeamMutation = useCreateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  const teamRows = teamsQuery.data ?? [];

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setTeamNameDraft("");
  };

  const handleCreateTeam = async () => {
    const trimmed = teamNameDraft.trim();
    if (!trimmed) return;

    try {
      await createTeamMutation.mutateAsync({ name: trimmed });
      closeCreateModal();
      showToast("success", "Team created");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeamMutation.mutateAsync(deleteTarget.id);
      showToast("success", `${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const columns: Column<Team>[] = [
    {
      key: "name",
      label: "Team name",
      render: (v) => <span className="type-body text-primary">{v as string}</span>,
    },
    {
      key: "memberCount",
      label: "Members",
      render: (v) => (
        <span className="type-body-sm text-secondary">
          {v === undefined ? "—" : (v as number)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_v, row) => (
        <div className="flex items-center gap-xs justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/teams/${row.id}`)}
          >
            View
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row)}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-xl">
      {!teamsQuery.isLoading && teamRows.length === 0 ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <EmptyState
            icon={<Users />}
            heading={isAdmin ? "No teams yet" : "You're not on a team yet"}
            body={
              isAdmin
                ? "Create a team to start sharing documents with groups of people."
                : "Ask an admin to add you to a team."
            }
            ctaLabel={isAdmin ? "Create team" : null}
            onCtaClick={isAdmin ? () => setCreateModalOpen(true) : null}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-xl">
            <h1 className="type-h1 text-primary">Teams</h1>
            {isAdmin && (
              <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                Create team
              </Button>
            )}
          </div>
          <Table<Team> columns={columns} data={teamRows} keyField="id" />
        </>
      )}

      {createModalOpen && (
        <Modal
          size="sm"
          title="Create team"
          onClose={closeCreateModal}
          primaryLabel="Create"
          onPrimaryAction={handleCreateTeam}
          primaryDisabled={teamNameDraft.trim().length === 0 || createTeamMutation.isPending}
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

      {deleteTarget && (
        <ConfirmDeleteModal
          itemLabel={deleteTarget.name}
          consequenceText="This team, its members, and any document access it grants will be permanently removed."
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteTeam}
          isLoading={deleteTeamMutation.isPending}
        />
      )}
    </div>
  );
};

export default TeamsPage;
