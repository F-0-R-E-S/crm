"use client";
import { btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import type { TelegramEventType } from "@/server/telegram/event-catalog";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export default function TelegramSettingsPage() {
  const { theme } = useThemeCtx();
  const catalog = trpc.telegram.catalog.useQuery();
  const subs = trpc.telegram.mySubscriptions.useQuery();
  const utils = trpc.useUtils();
  const [link, setLink] = useState<{
    token: string;
    deepLink: string | null;
    ttlMin: number;
  } | null>(null);

  const issue = trpc.telegram.issueLinkToken.useMutation({
    onSuccess: (r) => setLink(r),
  });
  const update = trpc.telegram.updateSubscription.useMutation({
    onSuccess: () => utils.telegram.mySubscriptions.invalidate(),
  });

  return (
    <div style={{ padding: "20px 28px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 16 }}>
        Telegram
      </h1>
      <p style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 16 }}>
        Link a Telegram chat or group to receive operational alerts. After linking, choose which
        event types, brokers, and affiliates to follow.
      </p>

      {subs.data?.length === 0 && (
        <div
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 12 }}>No linked chats yet.</div>
          <button
            type="button"
            style={btnStyle(theme, "primary")}
            disabled={issue.isPending}
            onClick={() => issue.mutate()}
          >
            {issue.isPending ? "Issuing…" : "Link Telegram"}
          </button>
          {link && (
            <div style={{ marginTop: 14, display: "flex", gap: 18, alignItems: "center" }}>
              {link.deepLink ? (
                <>
                  <QRCodeSVG value={link.deepLink} size={140} />
                  <div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>Open on your phone:</div>
                    <a
                      href={link.deepLink}
                      style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11 }}
                    >
                      {link.deepLink}
                    </a>
                    <div style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 6 }}>
                      Expires in {link.ttlMin} minutes
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12 }}>
                  Token: <code>{link.token}</code>
                  <div style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 4 }}>
                    Admin has not configured the bot username. Run <code>/start {link.token}</code>{" "}
                    manually in the bot chat.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(subs.data ?? []).map((sub) => (
        <SubscriptionCard
          key={sub.id}
          sub={sub}
          catalog={catalog.data}
          onSave={(p) => update.mutate({ id: sub.id, ...p })}
          saving={update.isPending}
          theme={theme}
        />
      ))}
    </div>
  );
}

interface SubProps {
  sub: {
    id: string;
    chatId: string;
    telegramUserId: string | null;
    eventTypes: string[];
    brokerFilter: string[];
    affiliateFilter: string[];
  };
  catalog:
    | {
        brokers: Array<{ id: string; name: string }>;
        affiliates: Array<{ id: string; name: string }>;
        eventTypes: string[];
      }
    | undefined;
  onSave: (p: {
    eventTypes: TelegramEventType[];
    brokerFilter: string[];
    affiliateFilter: string[];
  }) => void;
  saving: boolean;
  theme: "light" | "dark";
}

function SubscriptionCard({ sub, catalog, onSave, saving, theme }: SubProps) {
  const [events, setEvents] = useState<string[]>(sub.eventTypes);
  const [brokers, setBrokers] = useState<string[]>(sub.brokerFilter);
  const [affiliates, setAffiliates] = useState<string[]>(sub.affiliateFilter);

  return (
    <div
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 8 }}>
        chat <code>{sub.chatId}</code> · tg user <code>{sub.telegramUserId ?? "—"}</code>
      </div>
      <FieldGroup label="Event types (empty = all)">
        <MultiSelect
          options={(catalog?.eventTypes ?? []).map((t) => ({ value: t, label: t }))}
          selected={events}
          onChange={setEvents}
          theme={theme}
        />
      </FieldGroup>
      <FieldGroup label="Brokers (empty = all)">
        <MultiSelect
          options={(catalog?.brokers ?? []).map((b) => ({ value: b.id, label: b.name }))}
          selected={brokers}
          onChange={setBrokers}
          theme={theme}
        />
      </FieldGroup>
      <FieldGroup label="Affiliates (empty = all)">
        <MultiSelect
          options={(catalog?.affiliates ?? []).map((a) => ({ value: a.id, label: a.name }))}
          selected={affiliates}
          onChange={setAffiliates}
          theme={theme}
        />
      </FieldGroup>
      <button
        type="button"
        style={btnStyle(theme, "primary")}
        disabled={saving}
        onClick={() =>
          onSave({
            eventTypes: events as TelegramEventType[],
            brokerFilter: brokers,
            affiliateFilter: affiliates,
          })
        }
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--mono)",
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
  theme,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (vals: string[]) => void;
  theme: "light" | "dark";
}) {
  return (
    <select
      multiple
      value={selected}
      onChange={(e) => {
        const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
        onChange(vals);
      }}
      style={{ ...inputStyle(theme), height: 120, width: "100%" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
