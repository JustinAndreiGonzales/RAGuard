"use client";

import { Search, UserCog } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import Avatar from "@/components/simple/Avatar";
import Button from "@/components/simple/Button";
import EmptyState from "@/components/simple/EmptyState";
import Input from "@/components/simple/Input";
import Modal from "@/components/simple/Modal";
import Pill from "@/components/simple/Pill";
import Table, { Column } from "@/components/simple/Table";
import { getErrorMessage } from "@/lib/api/errors";
import type { Role, UserListItem } from "@/lib/api/types";
import { getInitials } from "@/lib/format";
import { useUpdateUserRoleMutation, useUsersQuery } from "@/lib/hooks/useUsers";

const RoleBadge = ({ role }: { role: Role }) => <Pill size="sm">{role}</Pill>;

const UsersAdminPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.replace("/");
    }
  }, [status, isAdmin, router]);

  const usersQuery = useUsersQuery({ enabled: isAdmin });
  const updateRoleMutation = useUpdateUserRoleMutation();

  const [emailQuery, setEmailQuery] = useState("");
  const [roleChangeTarget, setRoleChangeTarget] = useState<UserListItem | null>(null);

  const allUsers = usersQuery.data ?? [];
  const trimmedQuery = emailQuery.trim().toLowerCase();
  const filteredUsers = useMemo(
    () =>
      trimmedQuery
        ? allUsers.filter((u) => u.email.toLowerCase().includes(trimmedQuery))
        : allUsers,
    [allUsers, trimmedQuery],
  );

  if (!isAdmin) return null;

  const nextRole = (role: Role): Role => (role === "admin" ? "user" : "admin");

  const handleConfirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    const target = nextRole(roleChangeTarget.role);
    try {
      await updateRoleMutation.mutateAsync({
        id: roleChangeTarget.id,
        role: target,
      });
      showToast(
        "success",
        `${roleChangeTarget.name ?? roleChangeTarget.email} is now ${target}`,
      );
      setRoleChangeTarget(null);
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const columns: Column<UserListItem>[] = [
    {
      key: "name",
      label: "User",
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
      render: (v) => (
        <span className="type-body-sm text-secondary">{v as string}</span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (v) => <RoleBadge role={v as Role} />,
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_v, row) => {
        const isSelf = row.id === session?.user?.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isSelf}
            title={isSelf ? "You can't change your own role" : undefined}
            onClick={() => setRoleChangeTarget(row)}
          >
            Change role
          </Button>
        );
      },
    },
  ];

  return (
    <div className="p-xl flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="type-h1 text-primary">Users</h1>
      </div>

      <div className="max-w-[360px]">
        <Input
          label="Search by email"
          placeholder="name@example.com"
          value={emailQuery}
          onChange={(e) => setEmailQuery(e.target.value)}
        />
      </div>

      {!usersQuery.isLoading && filteredUsers.length === 0 ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <EmptyState
            icon={trimmedQuery ? <Search /> : <UserCog />}
            heading={trimmedQuery ? "No matching users" : "No users yet"}
            body={
              trimmedQuery
                ? `No user found with an email containing "${emailQuery.trim()}".`
                : "There are no users to display."
            }
          />
        </div>
      ) : (
        <Table<UserListItem>
          columns={columns}
          data={filteredUsers}
          keyField="id"
        />
      )}

      {roleChangeTarget && (
        <Modal
          size="sm"
          title="Change role"
          onClose={() => setRoleChangeTarget(null)}
          primaryLabel={updateRoleMutation.isPending ? "Changing…" : "Change role"}
          primaryDisabled={updateRoleMutation.isPending}
          onPrimaryAction={handleConfirmRoleChange}
          hasSecondButton
          secondaryLabel="Cancel"
        >
          <p className="type-body text-primary">
            Change{" "}
            <span className="type-label">
              {roleChangeTarget.name ?? roleChangeTarget.email}
            </span>
            &apos;s role from <RoleBadge role={roleChangeTarget.role} /> to{" "}
            <RoleBadge role={nextRole(roleChangeTarget.role)} />?
          </p>
        </Modal>
      )}
    </div>
  );
};

export default UsersAdminPage;
