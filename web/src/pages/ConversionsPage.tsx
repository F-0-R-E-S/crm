import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import ListToolbar, {
  ToolbarInput,
  ToolbarSelect,
} from "../components/ListToolbar";
import PaginationBar from "../components/PaginationBar";

interface Conversion {
  id: string;
  lead_id: string;
  broker_id: string;
  affiliate_id: string;
  conversion_type: string;
  amount: string;
  currency: string;
  buy_price: string;
  sell_price: string;
  profit: string;
  status: string;
  broker_transaction_id: string;
  is_fake: boolean;
  converted_at: string;
}

interface PLRow {
  broker_id?: string;
  affiliate_id?: string;
  conversion_count: number;
  total_buy: string;
  total_sell: string;
  total_profit: string;
}

type Tab = "conversions" | "pl" | "pricing" | "payouts";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "rejected" },
];
const TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "FTD", value: "ftd" },
  { label: "Deposit", value: "deposit" },
  { label: "Retention", value: "retention" },
];

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

export default function ConversionsPage() {
  const [tab, setTab] = useState<Tab>("conversions");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: conversionsData, isLoading: loadingConversions } = useQuery({
    queryKey: ["conversions", page, statusFilter, typeFilter, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PAGE_SIZE),
      });

      if (statusFilter) {
        params.set("status", statusFilter);
      }
      if (typeFilter) {
        params.set("conversion_type", typeFilter);
      }
      if (dateFrom) {
        params.set("from", toStartOfDay(dateFrom));
      }
      if (dateTo) {
        params.set("to", toEndOfDay(dateTo));
      }

      return api.get<{ conversions: Conversion[]; total: number }>(
        `/conversions?${params.toString()}`,
      );
    },
    enabled: tab === "conversions",
    placeholderData: (prev) => prev,
  });

  const { data: plData, isLoading: loadingPl } = useQuery({
    queryKey: ["conversions-pl"],
    queryFn: async () => {
      const [brokerData, affiliateData] = await Promise.all([
        api.get<{ pl_by_broker: PLRow[] }>("/pl/by-broker"),
        api.get<{ pl_by_affiliate: PLRow[] }>("/pl/by-affiliate"),
      ]);

      return {
        byBroker: brokerData.pl_by_broker || [],
        byAffiliate: affiliateData.pl_by_affiliate || [],
      };
    },
    enabled: tab === "pl",
  });

  const conversions = conversionsData?.conversions ?? [];
  const total = conversionsData?.total ?? 0;
  const plByBroker = plData?.byBroker ?? [];
  const plByAffiliate = plData?.byAffiliate ?? [];
  const hasFilters = Boolean(statusFilter || typeFilter || dateFrom || dateTo);

  const tabs: { key: Tab; label: string }[] = [
    { key: "conversions", label: "Conversions" },
    { key: "pl", label: "P&L" },
    { key: "pricing", label: "Pricing Rules" },
    { key: "payouts", label: "Payouts" },
  ];

  return (
    <div className="page-section">
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: -0.5,
          color: "var(--text-1)",
          marginBottom: 6,
        }}
      >
        Conversions & P&L
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>
        Track FTDs, manage pricing, and monitor profit/loss
      </p>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: "1px solid var(--glass-border)",
          paddingBottom: 2,
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? "btn-primary" : "btn-ghost"}
            style={{
              fontSize: 12,
              padding: "6px 16px",
              borderRadius: "12px 12px 0 0",
            }}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "conversions" && (
        <>
          <ListToolbar
            summary={
              hasFilters ? (
                <button
                  className="btn-ghost"
                  style={{ padding: "5px 12px" }}
                  onClick={() => {
                    setStatusFilter("");
                    setTypeFilter("");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              ) : undefined
            }
          >
            <ToolbarSelect
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
            <ToolbarSelect
              label="Type"
              value={typeFilter}
              options={TYPE_OPTIONS}
              onChange={(value) => {
                setTypeFilter(value);
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

          <div
            className="glass-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingConversions && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--text-3)",
                      }}
                    >
                      Loading conversions...
                    </td>
                  </tr>
                )}
                {!loadingConversions && conversions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--text-3)",
                      }}
                    >
                      {hasFilters
                        ? "No conversions matched the current filters."
                        : "No conversions yet."}
                    </td>
                  </tr>
                )}
                {conversions.map((conversion) => (
                  <tr key={conversion.id}>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background:
                            conversion.conversion_type === "ftd"
                              ? "rgba(52,211,153,0.15)"
                              : "rgba(255,255,255,0.06)",
                          color:
                            conversion.conversion_type === "ftd"
                              ? "#34d399"
                              : "var(--text-2)",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {conversion.conversion_type}
                      </span>
                      {conversion.is_fake && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            color: "#f87171",
                            fontWeight: 600,
                          }}
                        >
                          FAKE
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {conversion.currency} {conversion.amount}
                    </td>
                    <td style={{ color: "var(--text-2)" }}>
                      ${conversion.buy_price}
                    </td>
                    <td style={{ color: "var(--text-2)" }}>
                      ${conversion.sell_price}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          parseFloat(conversion.profit) >= 0
                            ? "#34d399"
                            : "#f87171",
                      }}
                    >
                      ${conversion.profit}
                    </td>
                    <td>
                      <span className={`status-badge ${conversion.status}`}>
                        {conversion.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(conversion.converted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PaginationBar
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              itemLabel="conversions"
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {tab === "pl" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <div className="glass-card">
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 14,
                color: "var(--text-1)",
              }}
            >
              P&L by Broker
            </h3>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Count</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {loadingPl && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "var(--text-3)" }}
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loadingPl &&
                  plByBroker.map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontSize: 11, color: "var(--text-2)" }}>
                        {row.broker_id?.slice(0, 8)}...
                      </td>
                      <td>{row.conversion_count}</td>
                      <td>${row.total_buy}</td>
                      <td>${row.total_sell}</td>
                      <td
                        style={{
                          fontWeight: 600,
                          color:
                            parseFloat(row.total_profit) >= 0
                              ? "#34d399"
                              : "#f87171",
                        }}
                      >
                        ${row.total_profit}
                      </td>
                    </tr>
                  ))}
                {!loadingPl && plByBroker.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "var(--text-3)" }}
                    >
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="glass-card">
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 14,
                color: "var(--text-1)",
              }}
            >
              P&L by Affiliate
            </h3>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Count</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {loadingPl && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "var(--text-3)" }}
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loadingPl &&
                  plByAffiliate.map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontSize: 11, color: "var(--text-2)" }}>
                        {row.affiliate_id?.slice(0, 8)}...
                      </td>
                      <td>{row.conversion_count}</td>
                      <td>${row.total_buy}</td>
                      <td>${row.total_sell}</td>
                      <td
                        style={{
                          fontWeight: 600,
                          color:
                            parseFloat(row.total_profit) >= 0
                              ? "#34d399"
                              : "#f87171",
                        }}
                      >
                        ${row.total_profit}
                      </td>
                    </tr>
                  ))}
                {!loadingPl && plByAffiliate.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "var(--text-3)" }}
                    >
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pricing" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 14,
              color: "var(--text-1)",
            }}
          >
            Pricing Rules
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>
            Configure buy/sell prices by affiliate, broker, GEO, and funnel.
            Most specific rule wins.
          </p>
        </div>
      )}

      {tab === "payouts" && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 14,
              color: "var(--text-1)",
            }}
          >
            Affiliate Payouts
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>
            Track accrued amounts, create payout records, and manage approval
            workflow.
          </p>
        </div>
      )}
    </div>
  );
}
