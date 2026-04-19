"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setErr("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-xs text-slate-500">
              Seeded: admin@example.com / password123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
