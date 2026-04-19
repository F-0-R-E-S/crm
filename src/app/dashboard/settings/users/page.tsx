"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function UsersPage() {
  const utils = trpc.useUtils();
  const { data } = trpc.user.list.useQuery();
  const create = trpc.user.create.useMutation({
    onSuccess: () => utils.user.list.invalidate(),
  });
  const setRole = trpc.user.setRole.useMutation({
    onSuccess: () => utils.user.list.invalidate(),
  });
  const resetPw = trpc.user.resetPassword.useMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleInput] = useState<"ADMIN" | "OPERATOR">("OPERATOR");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Users</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || password.length < 8) return;
          create.mutate({ email, password, role });
          setEmail("");
          setPassword("");
        }}
        className="flex gap-2 mb-4"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="border rounded px-2 py-1"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          className="border rounded px-2 py-1"
        />
        <select
          value={role}
          onChange={(e) => setRoleInput(e.target.value as "ADMIN" | "OPERATOR")}
          className="border rounded px-2 py-1"
        >
          <option value="OPERATOR">OPERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button type="submit" className="border rounded px-3 py-1 bg-black text-white">
          Create
        </button>
      </form>
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>
            <th className="py-2">Email</th>
            <th>Role</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.email}</td>
              <td>
                <select
                  defaultValue={u.role}
                  onChange={(e) =>
                    setRole.mutate({ id: u.id, role: e.target.value as "ADMIN" | "OPERATOR" })
                  }
                  className="border rounded px-2 py-1"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    const pw = prompt("New password (min 8)");
                    if (pw && pw.length >= 8) resetPw.mutate({ id: u.id, password: pw });
                  }}
                  className="text-blue-600"
                >
                  reset pw
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
