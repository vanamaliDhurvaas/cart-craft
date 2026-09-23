"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/shell/AuthCard";
import { Label, Input, ErrorText, Hint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Something went wrong.");
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      setError("Account created — please log in.");
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Pull up a chair" subtitle="Make an account and start turning recipes into groceries.">
      <form onSubmit={onSubmit}>
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Hint>At least 8 characters.</Hint>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:text-accent-strong">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
