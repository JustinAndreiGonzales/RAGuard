"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import Button from "@/components/simple/Button";
import Input from "@/components/simple/Input";

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      showToast("error", "Invalid email or password");
      return;
    }
    // Prevent a previous session's cached data (documents, conversations, ...)
    // from briefly leaking into this one on shared/kiosk browsers.
    queryClient.clear();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-[400px] bg-surface rounded-xl shadow-md p-2xl flex flex-col gap-md">
        <h1 className="type-h2 text-primary">RAGuard</h1>
        <h2 className="type-h2 text-primary">Log in</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Input label="Email" type="email" name="email" required />
          <Input
            label="Password"
            type="password"
            passwordToggle
            name="password"
            required
          />
          <Button
            variant="primary"
            fullWidth
            type="submit"
            state={isSubmitting ? "loading" : "default"}
          >
            Log in
          </Button>
        </form>
        <p className="type-caption text-tertiary text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent-default hover:text-accent-hover">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
