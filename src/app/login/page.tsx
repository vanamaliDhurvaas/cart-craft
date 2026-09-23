"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/shell/AuthCard";
import { Label, Input, ErrorText } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Welcome back" subtitle="Good to see you — let's get back to the kitchen.">
      <form onSubmit={onSubmit}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-accent hover:text-accent-strong">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
