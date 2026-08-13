"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import Button from "@/components/simple/Button";
import Input from "@/components/simple/Input";
import { getErrorMessage } from "@/lib/api/errors";
import { useRegisterMutation } from "@/lib/hooks/useAuth";

export default function SignupPage() {
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const registerMutation = useRegisterMutation();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    setConfirmError(null);

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    try {
      await registerMutation.mutateAsync({ email, password, name });
    } catch (err) {
      showToast("error", getErrorMessage(err));
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      showToast("error", "Account created — please log in.");
      router.push("/login");
      return;
    }

    queryClient.clear();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-[400px] bg-surface rounded-xl shadow-md p-2xl flex flex-col gap-md">
        <h1 className="type-h2 text-primary">RAGuard</h1>
        <h2 className="type-h2 text-primary">Create account</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Input label="Name" type="text" name="name" required />
          <Input label="Email" type="email" name="email" required />
          <Input
            label="Password"
            type="password"
            passwordToggle
            name="password"
            required
          />
          <Input
            label="Confirm password"
            type="password"
            passwordToggle
            name="confirmPassword"
            state={confirmError ? "error" : "default"}
            errorText={confirmError ?? ""}
            required
          />
          <Button
            variant="primary"
            fullWidth
            type="submit"
            state={registerMutation.isPending ? "loading" : "default"}
          >
            Create account
          </Button>
        </form>
        <p className="type-caption text-tertiary text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-default hover:text-accent-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
