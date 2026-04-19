"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    if (r?.ok) window.location.assign(r.url ?? "/dashboard");
    else setErr("invalid credentials");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="w-80 space-y-3 border p-6 rounded">
        <h1 className="font-semibold">Sign in</h1>
        <input autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-2 py-1" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border rounded px-2 py-1" />
        <button className="w-full bg-black text-white rounded py-2">Sign in</button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </form>
    </div>
  );
}
