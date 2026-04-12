import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../lib/api";
import { usePermissions } from "../hooks/usePermissions";
import PermissionGate from "../components/PermissionGate";
import clsx from "clsx";
import ListToolbar, { ToolbarSelect } from "../components/ListToolbar";
import PaginationBar from "../components/PaginationBar";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface InviteItem {
  id: string;
  email: string;
  role: string;
  name: string;
  expires_at: string;
  created_at: string;
}

interface RoleItem {
  role: string;
  label: string;
  description?: string;
  permissions?: string[];
}

const FALLBACK_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "network_admin", label: "Network Admin" },
  { value: "affiliate_manager", label: "Affiliate Manager" },
  { value: "team_lead", label: "Team Lead" },
  { value: "media_buyer", label: "Media Buyer" },
  { value: "finance_manager", label: "Finance Manager" },
];

const PAGE_SIZE = 12;

export default function UsersPage() {
  const { has } = usePermissions();
  const [showInvite, setShowInvite] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("media_buyer");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      api.get<{ users: User[]; total: number }>("/users?limit=100"),
  });

  const { data: invitesData, refetch: refetchInvites } = useQuery({
    queryKey: ["invites"],
    queryFn: () => api.get<{ invites: InviteItem[] }>("/auth/invites"),
    enabled: has("users:invite"),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () =>
      api
        .get<{ roles: RoleItem[] }>("/roles")
        .catch(() => ({ roles: [] as RoleItem[] })),
    enabled: has("users:write"),
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);

    try {
      await api.post("/auth/invites", {
        email: inviteEmail,
        role: inviteRole,
        name: inviteName,
      });
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
      refetchInvites();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invite",
      );
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      refetchUsers();
    } catch {
      // ignore
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      await api.post(
        `/users/${userId}/${isActive ? "deactivate" : "activate"}`,
        {},
      );
      refetchUsers();
    } catch {
      // ignore
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    try {
      await api.delete(`/auth/invites/${inviteId}`);
      refetchInvites();
    } catch {
      // ignore
    }
  }

  const users = usersData?.users || [];
  const invites = invitesData?.invites || [];
  const roleOptions = rolesData?.roles?.length
    ? rolesData.roles.map((r) => ({ value: r.role, label: r.label }))
    : FALLBACK_ROLES;
  const userFilters = roleOptions.map((role) => ({
    label: role.label,
    value: role.value,
  }));
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.role}`.toLowerCase();
    if (normalizedSearch && !haystack.includes(normalizedSearch)) {
      return false;
    }
    if (roleFilter && user.role !== roleFilter) {
      return false;
    }
    if (statusFilter === "active" && !user.is_active) {
      return false;
    }
    if (statusFilter === "inactive" && user.is_active) {
      return false;
    }
    return true;
  });
  const filteredInvites = invites.filter((invite) => {
    if (!normalizedSearch) {
      return true;
    }

    return `${invite.email} ${invite.name} ${invite.role}`
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const pagedUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const hasFilters = Boolean(normalizedSearch || roleFilter || statusFilter);

  function getRoleLabel(role: string) {
    return roleOptions.find((item) => item.value === role)?.label || role;
  }

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
            Team Members
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            {filteredUsers.length.toLocaleString()} users in view · role-based
            access control
          </p>
        </div>

        <PermissionGate permission="users:invite">
          <button
            onClick={() => {
              setInviteError("");
              setShowInvite(true);
            }}
            className="btn-primary"
            style={{ fontSize: 12, padding: "8px 16px" }}
          >
            + Invite User
          </button>
        </PermissionGate>
      </div>

      {inviteSuccess && (
        <div
          className="form-alert form-alert-success"
          style={{ marginBottom: 14 }}
        >
          {inviteSuccess}
        </div>
      )}

      <ListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search by teammate, email, or role…"
        summary={
          hasFilters ? (
            <button
              className="btn-ghost"
              style={{ padding: "5px 12px" }}
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setStatusFilter("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          ) : undefined
        }
      >
        <ToolbarSelect
          label="Role"
          value={roleFilter}
          options={[{ label: "All roles", value: "" }, ...userFilters]}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />
        <ToolbarSelect
          label="Status"
          value={statusFilter}
          options={[
            { label: "All statuses", value: "" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ]}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
      </ListToolbar>

      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>2FA</th>
              <th>Last Login</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {pagedUsers.map((u) => (
              <tr key={u.id}>
                <td className="td-primary" style={{ minWidth: 220 }}>
                  <div style={{ fontSize: 13.5 }}>
                    {u.name || "Unnamed User"}
                  </div>
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {u.email}
                  </div>
                </td>

                <td>
                  {has("users:write") ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="form-control"
                      style={{ padding: "8px 10px", minWidth: 165 }}
                    >
                      {roleOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: "var(--text-1)", fontSize: 13 }}>
                      {getRoleLabel(u.role)}
                    </span>
                  )}
                </td>

                <td>
                  <span
                    className={clsx(
                      "status-badge",
                      u.is_active ? "delivered" : "rejected",
                    )}
                  >
                    {u.is_active ? "active" : "inactive"}
                  </span>
                </td>

                <td>
                  <span
                    style={{
                      fontSize: 12,
                      color: u.is_2fa_enabled ? "#34d399" : "var(--text-3)",
                      fontWeight: 600,
                    }}
                  >
                    {u.is_2fa_enabled ? "Enabled" : "Off"}
                  </span>
                </td>

                <td style={{ whiteSpace: "nowrap" }}>
                  {u.last_login_at ? (
                    format(new Date(u.last_login_at), "MMM d, HH:mm")
                  ) : (
                    <span style={{ color: "var(--text-3)" }}>Never</span>
                  )}
                </td>

                <td style={{ textAlign: "right" }}>
                  <PermissionGate permission="users:delete">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "6px 13px" }}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </PermissionGate>
                </td>
              </tr>
            ))}

            {pagedUsers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: "42px 0",
                    color: "var(--text-3)",
                  }}
                >
                  {hasFilters
                    ? "No team members matched the current filters."
                    : "No team members found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <PaginationBar
          total={filteredUsers.length}
          page={page}
          pageSize={PAGE_SIZE}
          itemLabel="users"
          onPageChange={setPage}
        />
      </div>

      {filteredInvites.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-label">Pending Invites</div>
          <div
            className="glass-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites.map((inv) => (
                  <tr key={inv.id}>
                    <td className="td-primary">{inv.email}</td>
                    <td>{getRoleLabel(inv.role)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {format(new Date(inv.created_at), "MMM d, HH:mm")}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {format(new Date(inv.expires_at), "MMM d, HH:mm")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleDeleteInvite(inv.id)}
                        className="btn-danger"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvite && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}
        >
          <form
            onSubmit={handleInvite}
            className="modal-box"
            style={{ maxWidth: 760 }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Invite Team Member</div>
                <div className="form-subtitle">
                  Invite a teammate and assign their access role before
                  onboarding.
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  padding: 0,
                  justifyContent: "center",
                }}
                onClick={() => setShowInvite(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div
                className="form-alert form-alert-error"
                style={{ marginBottom: 14 }}
              >
                {inviteError}
              </div>
            )}

            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="invite-name">
                  Full Name
                </label>
                <input
                  id="invite-name"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Alex Petrov"
                  className="form-control"
                  autoFocus
                />
                <div className="form-help">
                  Optional. Leave empty if you only know the email.
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="invite-role">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="form-control"
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <div className="form-help">
                  Permissions are applied immediately after account activation.
                </div>
              </div>

              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="invite-email">
                  Work Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="btn-primary"
              >
                {inviteLoading ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
