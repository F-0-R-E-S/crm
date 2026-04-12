import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { format } from "date-fns";
import ListToolbar, { ToolbarSelect } from "../components/ListToolbar";

interface Session {
  id: string;
  ip: string;
  user_agent: string;
  device_name: string;
  last_active_at: string;
  expires_at: string;
  created_at: string;
  current: boolean;
}

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<{ sessions: Session[] }>("/auth/sessions"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => api.delete("/auth/sessions"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const sessions = data?.sessions || [];
  const filteredSessions = sessions.filter((session) => {
    if (scope === "current" && !session.current) {
      return false;
    }
    if (scope === "other" && session.current) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }

    return `${session.device_name} ${session.ip} ${session.user_agent}`
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const hasFilters = Boolean(normalizedSearch || scope);

  return (
    <div className="page-section">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: "var(--text-1)",
            }}
          >
            Active Sessions
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            {filteredSessions.length.toLocaleString()} sessions in view
          </p>
        </div>

        {sessions.length > 1 && (
          <button
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending}
            className="btn-danger"
            style={{ fontSize: 12, padding: "8px 14px" }}
          >
            {revokeAllMutation.isPending ? "Revoking…" : "Revoke All Other"}
          </button>
        )}
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by device, IP, or browser…"
        summary={
          hasFilters ? (
            <button
              className="btn-ghost"
              style={{ padding: "5px 12px" }}
              onClick={() => {
                setSearch("");
                setScope("");
              }}
            >
              Clear filters
            </button>
          ) : undefined
        }
      >
        <ToolbarSelect
          label="Scope"
          value={scope}
          options={[
            { label: "All sessions", value: "" },
            { label: "Current only", value: "current" },
            { label: "Other devices", value: "other" },
          ]}
          onChange={setScope}
        />
      </ListToolbar>

      <div style={{ display: "grid", gap: 14 }}>
        {isLoading && (
          <div
            className="glass-card"
            style={{ color: "var(--text-3)", textAlign: "center" }}
          >
            Loading sessions...
          </div>
        )}

        {!isLoading && filteredSessions.length === 0 && (
          <div
            className="glass-card"
            style={{ color: "var(--text-3)", textAlign: "center" }}
          >
            {hasFilters
              ? "No sessions matched the current filters."
              : "No active sessions found."}
          </div>
        )}

        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="glass-card"
            style={{
              padding: 18,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {session.device_name === "Mobile"
                  ? "\u{1F4F1}"
                  : session.device_name === "Tablet"
                    ? "\u{1F4F1}"
                    : "\u{1F4BB}"}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-1)",
                    }}
                  >
                    {session.device_name || "Unknown Device"}
                  </div>
                  {session.current && (
                    <span className="status-badge delivered">current</span>
                  )}
                </div>

                <div
                  style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}
                >
                  IP {session.ip || "Unknown"} · Last active{" "}
                  {format(new Date(session.last_active_at), "MMM d, HH:mm")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-3)",
                    marginTop: 4,
                    wordBreak: "break-word",
                  }}
                >
                  {session.user_agent || "Unknown browser"}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}
                >
                  Created {format(new Date(session.created_at), "MMM d, HH:mm")}{" "}
                  · Expires{" "}
                  {format(new Date(session.expires_at), "MMM d, HH:mm")}
                </div>
              </div>
            </div>

            {!session.current && (
              <button
                onClick={() => revokeMutation.mutate(session.id)}
                disabled={revokeMutation.isPending}
                className="btn-ghost"
                style={{ alignSelf: "center" }}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
