import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import LeadDetail from "../components/LeadDetail";
import ListToolbar, {
  ToolbarInput,
  ToolbarSelect,
} from "../components/ListToolbar";
import PaginationBar from "../components/PaginationBar";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  fraud_score?: number;
  affiliate_id?: string;
  created_at: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

interface BulkImportResponse {
  total: number;
  accepted: number;
  rejected: number;
  errors?: Array<{ row: number; field?: string; message: string }>;
}

const PAGE_SIZE = 20;
const LEAD_STATUSES = [
  { label: "All statuses", value: "" },
  { label: "New", value: "new" },
  { label: "Processing", value: "processing" },
  { label: "Delivered", value: "delivered" },
  { label: "Rejected", value: "rejected" },
  { label: "Fraud", value: "fraud" },
  { label: "Duplicate", value: "duplicate" },
];

function fraudColor(score: number) {
  return score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
}

function toStartOfDay(value: string) {
  if (!value) {
    return "";
  }

  return new Date(`${value}T00:00:00`).toISOString();
}

function toEndOfDay(value: string) {
  if (!value) {
    return "";
  }

  return new Date(`${value}T23:59:59.999`).toISOString();
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPayload, setBulkPayload] = useState(
    JSON.stringify(
      [
        {
          first_name: "John",
          last_name: "Doe",
          email: "john.doe@example.com",
          phone: "+14155552671",
          country: "US",
        },
      ],
      null,
      2,
    ),
  );
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim();
  const normalizedCountry = countryFilter.trim().toUpperCase();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [
      "leads",
      page,
      normalizedSearch,
      statusFilter,
      normalizedCountry,
      dateFrom,
      dateTo,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });

      if (normalizedSearch) {
        params.set("search", normalizedSearch);
      }
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      if (normalizedCountry) {
        params.set("country", normalizedCountry);
      }
      if (dateFrom) {
        params.set("date_from", toStartOfDay(dateFrom));
      }
      if (dateTo) {
        params.set("date_to", toEndOfDay(dateTo));
      }

      return api.get<LeadsResponse>(`/leads?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const bulkImportMutation = useMutation({
    mutationFn: (leads: unknown[]) =>
      api.post<BulkImportResponse>("/leads/bulk", { leads }),
    onSuccess: (res) => {
      setBulkSuccess(
        `Bulk import complete: accepted ${res.accepted}/${res.total}, rejected ${res.rejected}.`,
      );
      setBulkError("");
      setShowBulkImport(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-leads"] });
    },
    onError: (err) => {
      setBulkError(err instanceof Error ? err.message : "Bulk import failed");
    },
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const hasFilters = Boolean(
    normalizedSearch || statusFilter || normalizedCountry || dateFrom || dateTo,
  );

  return (
    <div className="page-section">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
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
            Leads
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            {total > 0 ? `${total.toLocaleString()} total` : "No leads yet"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-primary"
            style={{ fontSize: 12, padding: "7px 14px" }}
            onClick={() => {
              setBulkError("");
              setShowBulkImport(true);
            }}
          >
            ⤴ Bulk Import
          </button>
          <button
            className="btn-glass"
            style={{ fontSize: 12, padding: "7px 14px" }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {bulkSuccess && (
        <div
          className="form-alert form-alert-success"
          style={{ marginBottom: 14 }}
        >
          {bulkSuccess}
        </div>
      )}

      <ListToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search leads by name, email, or phone…"
        summary={
          <>
            <span>
              {total > 0
                ? `${total.toLocaleString()} matching leads`
                : "No matching leads"}
            </span>
            {hasFilters && (
              <button
                className="btn-ghost"
                style={{ padding: "5px 12px" }}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setCountryFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            )}
          </>
        }
      >
        <ToolbarSelect
          label="Status"
          value={statusFilter}
          options={LEAD_STATUSES}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
        <ToolbarInput
          label="Country"
          placeholder="US"
          value={countryFilter}
          onChange={(value) => {
            setCountryFilter(value.toUpperCase());
            setPage(1);
          }}
        />
        <ToolbarInput
          label="From"
          type="date"
          max={dateTo || undefined}
          value={dateFrom}
          onChange={(value) => {
            setDateFrom(value);
            setPage(1);
          }}
        />
        <ToolbarInput
          label="To"
          type="date"
          min={dateFrom || undefined}
          value={dateTo}
          onChange={(value) => {
            setDateTo(value);
            setPage(1);
          }}
        />
      </ListToolbar>

      {error && (
        <div
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13,
            color: "#f87171",
            marginBottom: 14,
          }}
        >
          {error instanceof Error ? error.message : "Failed to load leads"}
        </div>
      )}

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Loading bar */}
        {isFetching && (
          <div
            style={{
              height: 2,
              background: "var(--glass-bright)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "100%",
                background: "linear-gradient(90deg, #4facfe, #00f2fe)",
                animation: "pulse 1.5s infinite",
              }}
            />
          </div>
        )}

        <table className="glass-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Country</th>
              <th>Status</th>
              <th>Fraud Score</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}>
                      <div
                        style={{
                          height: 14,
                          borderRadius: 7,
                          background: "var(--glass-bright)",
                          width: j === 0 ? 80 : j === 1 ? 120 : 100,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && leads.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--text-3)",
                    fontSize: 14,
                  }}
                >
                  {hasFilters
                    ? "No leads matched the current filters."
                    : "No leads yet. Send your first lead via the API."}
                </td>
              </tr>
            )}

            {leads.map((lead) => (
              <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)}>
                <td className="td-mono" style={{ color: "var(--text-3)" }}>
                  {lead.id.slice(0, 8)}…
                </td>
                <td className="td-primary">
                  {lead.first_name} {lead.last_name}
                </td>
                <td>{lead.email}</td>
                <td>{lead.country}</td>
                <td>
                  <StatusBadge status={lead.status} />
                </td>
                <td>
                  {lead.fraud_score != null ? (
                    <span
                      style={{
                        fontWeight: 600,
                        color: fraudColor(lead.fraud_score),
                      }}
                    >
                      {lead.fraud_score}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-3)" }}>—</span>
                  )}
                </td>
                <td>{format(new Date(lead.created_at), "MMM d, HH:mm")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <PaginationBar
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          itemLabel="leads"
          onPageChange={setPage}
        />
      </div>

      {selectedLeadId && (
        <LeadDetail
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

      {showBulkImport && (
        <div
          className="modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowBulkImport(false)
          }
        >
          <form
            className="modal-box"
            style={{ maxWidth: 840 }}
            onSubmit={(e) => {
              e.preventDefault();
              setBulkError("");

              let leads: unknown[];
              try {
                const parsed = JSON.parse(bulkPayload);
                if (!Array.isArray(parsed)) {
                  throw new Error("Payload must be a JSON array");
                }
                leads = parsed;
              } catch {
                setBulkError(
                  "Invalid JSON payload. Provide an array of leads.",
                );
                return;
              }

              bulkImportMutation.mutate(leads);
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Bulk Import Leads</div>
                <div className="form-subtitle">
                  Upload up to 10,000 leads in one request via `/leads/bulk`.
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
                onClick={() => setShowBulkImport(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {bulkError && (
              <div
                className="form-alert form-alert-error"
                style={{ marginBottom: 12 }}
              >
                {bulkError}
              </div>
            )}

            <div className="form-field">
              <label className="form-label" htmlFor="bulk-payload">
                Leads JSON Array
              </label>
              <textarea
                id="bulk-payload"
                className="form-control"
                value={bulkPayload}
                onChange={(e) => setBulkPayload(e.target.value)}
                rows={13}
                style={{
                  fontFamily: "SF Mono, Menlo, Consolas, monospace",
                  fontSize: 12,
                }}
              />
              <div className="form-help">
                Required fields per lead: `first_name`, `email`, `phone`,
                `country`.
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowBulkImport(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={bulkImportMutation.isPending}
              >
                {bulkImportMutation.isPending
                  ? "Importing…"
                  : "Run Bulk Import"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
