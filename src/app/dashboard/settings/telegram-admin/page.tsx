"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function TelegramAdminPage() {
  const { theme } = useThemeCtx();
  const cfg = trpc.telegram.adminConfig.useQuery();
  const events = trpc.telegram.recentEvents.useQuery(
    { limit: 50 },
    { refetchInterval: 30_000 },
  );
  const utils = trpc.useUtils();

  const [tokenInput, setTokenInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [chatId, setChatId] = useState("");
  const [text, setText] = useState("Test message from CRM");
  const [revealSecret, setRevealSecret] = useState(false);

  const save = trpc.telegram.setBotToken.useMutation({
    onSuccess: () => {
      setTokenInput("");
      utils.telegram.adminConfig.invalidate();
    },
  });
  const rotate = trpc.telegram.rotateWebhookSecret.useMutation({
    onSuccess: () => utils.telegram.adminConfig.invalidate(),
  });
  const test = trpc.telegram.testSend.useMutation();

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 16 }}>
        Telegram admin
      </h1>

      <Card title="Bot configuration">
        {cfg.data ? (
          <>
            <Row label="Bot username">
              <code>{cfg.data.botUsername ?? "—"}</code>
            </Row>
            <Row label="Webhook URL">
              <code style={{ fontSize: 10 }}>{cfg.data.webhookUrl ?? "(set TELEGRAM_WEBHOOK_BASE_URL env)"}</code>
            </Row>
            <Row label="Webhook secret">
              <code style={{ fontSize: 11 }}>
                {revealSecret ? cfg.data.webhookSecret : "••••••••••••"}
              </code>{" "}
              <button
                type="button"
                style={{ ...btnStyle(theme), padding: "2px 8px", fontSize: 10 }}
                onClick={() => setRevealSecret((v) => !v)}
              >
                {revealSecret ? "hide" : "reveal"}
              </button>{" "}
              <button
                type="button"
                style={{ ...btnStyle(theme), padding: "2px 8px", fontSize: 10 }}
                onClick={() => {
                  if (cfg.data?.webhookSecret) {
                    navigator.clipboard.writeText(cfg.data.webhookSecret).catch(() => {});
                  }
                }}
              >
                copy
              </button>
            </Row>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>No bot configured yet.</div>
        )}

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="Bot token (from @BotFather)"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            style={inputStyle(theme)}
          />
          <input
            type="text"
            placeholder="Bot username (optional, no @)"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            style={inputStyle(theme)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={save.isPending || tokenInput.length < 10}
              onClick={() =>
                save.mutate({ botToken: tokenInput, botUsername: usernameInput || undefined })
              }
            >
              {save.isPending ? "Saving…" : "Save / update"}
            </button>
            <button
              type="button"
              style={btnStyle(theme)}
              disabled={rotate.isPending || !cfg.data}
              onClick={() => {
                if (confirm("Rotate webhook secret? You must re-register the webhook with Telegram.")) {
                  rotate.mutate();
                }
              }}
            >
              {rotate.isPending ? "Rotating…" : "Rotate secret"}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Test send">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="chat id"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            style={inputStyle(theme)}
          />
          <input
            type="text"
            placeholder="text (markdown)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={inputStyle(theme)}
          />
          <div>
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={test.isPending || !chatId || !text}
              onClick={() => test.mutate({ chatId, text })}
            >
              {test.isPending ? "Sending…" : "Send"}
            </button>
            {test.data && (
              <span style={{ fontSize: 11, marginLeft: 10, color: "var(--fg-2)" }}>
                sent msg #{test.data.messageId}
              </span>
            )}
            {test.error && (
              <span style={{ fontSize: 11, marginLeft: 10, color: "oklch(72% 0.15 25)" }}>
                {test.error.message}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card title="Recent events (last 50)">
        <table style={{ width: "100%", fontSize: 11 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "var(--fg-2)",
                fontFamily: "var(--mono)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <th style={{ padding: "6px 8px" }}>when</th>
              <th>event</th>
              <th>chat</th>
              <th>ok</th>
              <th>error</th>
              <th>msg id</th>
            </tr>
          </thead>
          <tbody>
            {(events.data ?? []).map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "6px 8px", fontFamily: "var(--mono)" }}>
                  {new Date(e.createdAt).toLocaleTimeString()}
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{e.eventType}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{e.chatId}</td>
                <td>
                  <Pill size="xs" tone={e.successful ? "success" : "danger"}>
                    {e.successful ? "ok" : "fail"}
                  </Pill>
                </td>
                <td style={{ fontSize: 10 }}>{e.errorMessage ?? ""}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{e.telegramMsgId ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        alignItems: "center",
        padding: "4px 0",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--fg-2)" }}>{label}</div>
      <div style={{ fontSize: 12 }}>{children}</div>
    </div>
  );
}
