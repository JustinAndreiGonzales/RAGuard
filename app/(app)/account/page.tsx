"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import Avatar from "@/components/simple/Avatar";
import Button from "@/components/simple/Button";
import Input from "@/components/simple/Input";
import Pill from "@/components/simple/Pill";
import { getErrorMessage } from "@/lib/api/errors";
import { getInitials } from "@/lib/format";
import { useUpdatePasswordMutation } from "@/lib/hooks/useAccount";
import { useMeQuery } from "@/lib/hooks/useUsers";

const AccountPage = () => {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const meQuery = useMeQuery();
  const updatePasswordMutation = useUpdatePasswordMutation();

  const name = meQuery.data?.name ?? session?.user?.name ?? null;
  const email = meQuery.data?.email ?? session?.user?.email ?? "";
  const role = meQuery.data?.role ?? session?.user?.role ?? "user";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirmError(null);

    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({
        password: currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "Password updated");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  return (
    <div className="p-2xl">
      <div className="bg-surface rounded-lg p-2xl max-w-[560px] mx-auto flex flex-col gap-xl">
        <div className="flex flex-col items-center gap-xs text-center">
          <Avatar size="lg" initials={getInitials(name)} />
          <p className="type-h3 text-primary">{name ?? "Unknown"}</p>
          <p className="type-body-sm text-tertiary">{email}</p>
          <Pill size="sm">{role}</Pill>
        </div>

        <div className="flex flex-col gap-sm">
          <p className="type-label text-primary">Team memberships</p>
          {(meQuery.data?.teams.length ?? 0) === 0 ? (
            <p className="type-body-sm text-tertiary">
              Not a member of any teams yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-xs">
              {meQuery.data!.teams.map((team) => (
                <Pill key={team.id}>{team.name}</Pill>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <p className="type-label text-primary">Change password</p>
          <Input
            label="Current password"
            type="password"
            passwordToggle
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            passwordToggle
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            passwordToggle
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            state={confirmError ? "error" : "default"}
            errorText={confirmError ?? ""}
            required
          />
          <Button
            variant="primary"
            type="submit"
            state={updatePasswordMutation.isPending ? "loading" : "default"}
          >
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AccountPage;
