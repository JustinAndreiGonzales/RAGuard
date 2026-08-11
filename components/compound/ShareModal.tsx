"use client";

import { Search, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import type { PrincipalType } from "@/lib/api/types";
import { getInitials } from "@/lib/format";
import {
  useDocumentPermissionsQuery,
  useGrantPermissionMutation,
  useRevokePermissionMutation,
} from "@/lib/hooks/useDocuments";
import { useTeamsQuery } from "@/lib/hooks/useTeams";
import { useUserByEmailQuery } from "@/lib/hooks/useUsers";
import Avatar from "../simple/Avatar";
import Button from "../simple/Button";
import Input from "../simple/Input";
import Modal from "../simple/Modal";
import { useToast } from "../providers/ToastProvider";

type ShareModalProps = {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
};

const ShareModal = ({ documentId, documentTitle, onClose }: ShareModalProps) => {
  const { showToast } = useToast();
  const [principalType, setPrincipalType] = useState<PrincipalType>("user");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const isEmailLike = /\S+@\S+\.\S+/.test(debouncedQuery);
  const userQuery = useUserByEmailQuery(debouncedQuery, {
    enabled: principalType === "user" && isEmailLike,
  });
  const teamsQuery = useTeamsQuery({ enabled: principalType === "team" });
  const permissionsQuery = useDocumentPermissionsQuery(documentId);
  const grantMutation = useGrantPermissionMutation(documentId);
  const revokeMutation = useRevokePermissionMutation(documentId);

  const teamResults = (teamsQuery.data ?? []).filter((t) =>
    t.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  const handleGrant = async (principalId: string, name: string) => {
    try {
      await grantMutation.mutateAsync({ principalType, principalId });
      setQuery("");
      showToast("success", `Shared with ${name}`);
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const handleRevoke = async (permissionId: string) => {
    try {
      await revokeMutation.mutateAsync(permissionId);
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  return (
    <Modal
      size="md"
      title={`Share "${documentTitle}"`}
      onClose={onClose}
      primaryLabel="Done"
      onPrimaryAction={onClose}
    >
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-sm">
          <div className="flex gap-xs">
            <Button
              variant={principalType === "user" ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setPrincipalType("user");
                setQuery("");
              }}
            >
              User
            </Button>
            <Button
              variant={principalType === "team" ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setPrincipalType("team");
                setQuery("");
              }}
            >
              Team
            </Button>
          </div>
          <Input
            placeholder="Add person or team by email/name"
            leadingIcon={<Search className="h-md w-md" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {principalType === "user" && isEmailLike && (
            <div>
              {userQuery.isFetching ? (
                <p className="type-body-sm text-tertiary">Searching…</p>
              ) : userQuery.data ? (
                <button
                  type="button"
                  onClick={() =>
                    handleGrant(userQuery.data!.id, userQuery.data!.name ?? debouncedQuery)
                  }
                  className="w-full flex items-center gap-sm px-sm py-xs rounded-md hover:bg-canvas type-body-sm text-primary text-left"
                >
                  <Avatar size="sm" initials={getInitials(userQuery.data.name)} />
                  {userQuery.data.name ?? debouncedQuery}
                </button>
              ) : (
                <p className="type-body-sm text-tertiary">
                  No user found with that email.
                </p>
              )}
            </div>
          )}
          {principalType === "team" && debouncedQuery && (
            <div className="flex flex-col">
              {teamResults.length === 0 ? (
                <p className="type-body-sm text-tertiary">No matching teams.</p>
              ) : (
                teamResults.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleGrant(team.id, team.name)}
                    className="w-full flex items-center gap-sm px-sm py-xs rounded-md hover:bg-canvas type-body-sm text-primary text-left"
                  >
                    <Users className="h-md w-md text-tertiary" />
                    {team.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <p className="type-label text-primary">People with access</p>
          {permissionsQuery.isLoading ? (
            <p className="type-body-sm text-tertiary">Loading…</p>
          ) : (permissionsQuery.data?.length ?? 0) === 0 ? (
            <p className="type-body-sm text-tertiary">No one has access yet.</p>
          ) : (
            permissionsQuery.data!.map((perm) => {
              const Icon = perm.principalType === "team" ? Users : User;
              return (
                <div
                  key={perm.id}
                  className="flex items-center justify-between gap-sm py-xs"
                >
                  <div className="flex items-center gap-sm min-w-0">
                    <Icon className="h-md w-md text-tertiary shrink-0" />
                    <span className="type-body-sm text-primary truncate">
                      {perm.name ?? "Unknown"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(perm.id)}
                  >
                    Revoke
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
