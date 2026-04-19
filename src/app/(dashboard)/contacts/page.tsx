"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const list = trpc.contact.list.useQuery({ search });
  const create = trpc.contact.create.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
  });
  const del = trpc.contact.delete.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName) return;
    create.mutate(
      { firstName, lastName, email: email || null },
      {
        onSuccess: () => {
          setFirstName("");
          setLastName("");
          setEmail("");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New contact</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-wrap gap-2">
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="max-w-[180px]"
              required
            />
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="max-w-[180px]"
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-[240px]"
            />
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding..." : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Company</Th>
                <Th>Title</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {list.data?.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">
                    {c.firstName} {c.lastName}
                  </Td>
                  <Td className="text-slate-600">{c.email ?? "—"}</Td>
                  <Td className="text-slate-600">{c.company?.name ?? "—"}</Td>
                  <Td className="text-slate-600">{c.title ?? "—"}</Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => del.mutate(c.id)}
                      disabled={del.isPending}
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
              {list.data?.length === 0 && (
                <Tr>
                  <Td className="py-6 text-center text-slate-500" {...{ colSpan: 5 }}>
                    No contacts yet.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
