"use client";

import { ArrowLeft, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import AddMemberModal from "@/components/compound/AddMemberModal";
import ConfirmDeleteModal from "@/components/compound/ConfirmDeleteModal";
import { useToast } from "@/components/providers/ToastProvider";
import Avatar from "@/components/simple/Avatar";
import Button from "@/components/simple/Button";
import EmptyState from "@/components/simple/EmptyState";
import Table, { Column } from "@/components/simple/Table";
import { getErrorMessage } from "@/lib/api/errors";
import type { TeamMember } from "@/lib/api/types";
import { getInitials } from "@/lib/format";
import { useRemoveTeamMemberMutation, useTeamQuery } from "@/lib/hooks/useTeams";

const TeamDetailPage = () => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const isAdmin = session?.user?.role === "admin";

  const teamQuery = useTeamQuery(id);
  const removeMemberMutation = useRemoveTeamMemberMutation(id);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  if (teamQuery.isLoading) {
    return (
      <div className="p-xl flex items-center justify-center min-h-[400px]">
        <p className="type-body text-tertiary">Loading team…</p>
      </div>
    );
  }

  if (teamQuery.isError || !teamQuery.data) {
    return (
      <div className="p-xl flex flex-col items-center justify-center min-h-[400px] gap-md">
        <p className="type-body text-secondary">
          {getErrorMessage(teamQuery.error)}
        </p>
        <Button variant="secondary" onClick={() => router.push("/teams")}>
          Back to teams
        </Button>
      </div>
    );
  }

  const team = teamQuery.data;

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeMemberMutation.mutateAsync(removeTarget.id);
      showToast("success", `${removeTarget.name ?? "Member"} removed`);
      setRemoveTarget(null);
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const columns: Column<TeamMember>[] = [
    {
      key: "name",
      label: "Member",
      render: (_v, row) => (
        <div className="flex items-center gap-xs min-w-0">
          <Avatar size="sm" initials={getInitials(row.name)} />
          <span className="type-body-sm text-primary truncate">
            {row.name ?? "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (v) => <span className="type-body-sm text-secondary">{v as string}</span>,
    },
    ...(isAdmin
      ? [
          {
            key: "id",
            label: "Actions",
            align: "right",
            render: (_v, row) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRemoveTarget(row)}
              >
                Remove
              </Button>
            ),
          } satisfies Column<TeamMember>,
        ]
      : []),
  ];

  return (
    <div className="p-xl flex flex-col gap-lg">
      <Button
        variant="ghost"
        size="sm"
        icon="leading"
        iconElement={<ArrowLeft className="h-md w-md" />}
        onClick={() => router.push("/teams")}
        className="w-fit"
      >
        Back to teams
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="type-h1 text-primary truncate">{team.name}</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => setAddMemberOpen(true)}>
            Add member
          </Button>
        )}
      </div>

      {team.members.length === 0 ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <EmptyState
            icon={<Users />}
            heading="No members yet"
            body={
              isAdmin
                ? "Add members to this team to start sharing documents with them."
                : "This team doesn't have any members yet."
            }
            ctaLabel={isAdmin ? "Add member" : null}
            onCtaClick={isAdmin ? () => setAddMemberOpen(true) : null}
          />
        </div>
      ) : (
        <Table<TeamMember> columns={columns} data={team.members} keyField="id" />
      )}

      {addMemberOpen && (
        <AddMemberModal teamId={id} onClose={() => setAddMemberOpen(false)} />
      )}

      {removeTarget && (
        <ConfirmDeleteModal
          itemLabel={`${removeTarget.name ?? "this member"} from ${team.name}`}
          consequenceText="They will lose any access this team grants to shared documents."
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleRemove}
          isLoading={removeMemberMutation.isPending}
        />
      )}
    </div>
  );
};

export default TeamDetailPage;
