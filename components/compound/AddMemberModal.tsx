"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserSummary } from "@/lib/api/types";
import { getInitials } from "@/lib/format";
import { useAddTeamMemberMutation } from "@/lib/hooks/useTeams";
import { useUserByEmailQuery } from "@/lib/hooks/useUsers";
import Avatar from "../simple/Avatar";
import Input from "../simple/Input";
import Modal from "../simple/Modal";
import { useToast } from "../providers/ToastProvider";

type AddMemberModalProps = {
  teamId: string;
  onClose: () => void;
};

const AddMemberModal = ({ teamId, onClose }: AddMemberModalProps) => {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingMembers, setPendingMembers] = useState<UserSummary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addMemberMutation = useAddTeamMemberMutation(teamId);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const isEmailLike = /\S+@\S+\.\S+/.test(debouncedQuery);
  const userQuery = useUserByEmailQuery(debouncedQuery, { enabled: isEmailLike });

  const alreadyStaged = (id: string) => pendingMembers.some((m) => m.id === id);

  const handleAddToStaging = (user: UserSummary) => {
    if (alreadyStaged(user.id)) return;
    setPendingMembers((prev) => [...prev, user]);
    setQuery("");
  };

  const removeFromStaging = (id: string) => {
    setPendingMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (pendingMembers.length === 0) return;
    setIsSubmitting(true);
    const results = await Promise.allSettled(
      pendingMembers.map((m) => addMemberMutation.mutateAsync(m.id)),
    );
    setIsSubmitting(false);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      showToast(
        "success",
        `${succeeded} member${succeeded === 1 ? "" : "s"} added${
          failed ? `, ${failed} failed` : ""
        }`,
      );
    } else {
      showToast("error", "Failed to add members");
    }
    onClose();
  };

  return (
    <Modal
      size="sm"
      title="Add member"
      onClose={onClose}
      primaryLabel={isSubmitting ? "Adding…" : "Add"}
      primaryDisabled={pendingMembers.length === 0 || isSubmitting}
      onPrimaryAction={handleSubmit}
      hasSecondButton
      secondaryLabel="Cancel"
    >
      <div className="flex flex-col gap-md">
        <Input
          label="Search by email"
          placeholder="name@example.com"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isEmailLike && (
          <div>
            {userQuery.isFetching ? (
              <p className="type-body-sm text-tertiary">Searching…</p>
            ) : userQuery.data ? (
              <button
                type="button"
                onClick={() => handleAddToStaging(userQuery.data!)}
                disabled={alreadyStaged(userQuery.data.id)}
                className="w-full flex items-center gap-sm px-sm py-xs rounded-md hover:bg-canvas type-body-sm text-primary text-left disabled:opacity-40 disabled:cursor-not-allowed"
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

        {pendingMembers.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {pendingMembers.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-xs h-[28px] pl-sm pr-xs rounded-full bg-canvas border border-line-subtle type-body-sm text-primary"
              >
                {m.name ?? "Unknown"}
                <button
                  type="button"
                  onClick={() => removeFromStaging(m.id)}
                  aria-label={`Remove ${m.name ?? "member"}`}
                  className="text-tertiary hover:text-primary"
                >
                  <X className="h-[14px] w-[14px]" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AddMemberModal;
