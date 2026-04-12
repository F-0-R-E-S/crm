import { useEffect, useRef, useState } from "react";

const BROKERS_PERF = [
  { name: "AlphaFX Pro", leads: 9360, conv: 14.2, rev: "$18,420" },
  { name: "TradingHub", leads: 8610, conv: 11.8, rev: "$14,310" },
  { name: "CryptoLeads+", leads: 5940, conv: 9.4, rev: "$8,880" },
  { name: "ForexDirect", leads: 5220, conv: 16.3, rev: "$12,640" },
  { name: "BinaryWorld", leads: 4290, conv: 8.7, rev: "$6,210" },
  { name: "MarketPlus", leads: 2670, conv: 12.1, rev: "$4,840" },
];

const COUNTRIES = [
  { c: "DE", n: "Germany", pct: 24 },
  { c: "UA", n: "Ukraine", pct: 18 },
  { c: "PL", n: "Poland", pct: 14 },
  { c: "RO", n: "Romania", pct: 11 },
  { c: "TR", n: "Turkey", pct: 9 },
  { c: "BR", n: "Brazil", pct: 7 },
];

function flag(cc: string) {
  return cc
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

function useChart(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    draw(ctx, rect.width, rect.height);
  }, [canvasRef, draw]);
}

function LineChart({
  colors,
  labels,
  datasets,
}: {
  colors: string[];
  labels: string[];
  datasets: number[][];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useChart(ref, (ctx, W, H) => {
    const pad = { top: 16, right: 20, bottom: 32, left: 48 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    let maxVal = 0;
    datasets.forEach((d) => d.forEach((v) => (maxVal = Math.max(maxVal, v))));
    maxVal = Math.ceil(maxVal / 200) * 200 || 1000;

    // Grid
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + cH - (i / 5) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "10px Inter";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round((i / 5) * maxVal)), pad.left - 6, y + 4);
    }

    // X labels
    const step = Math.ceil(labels.length / 8);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "10px Inter";
    ctx.textAlign = "center";
    labels.forEach((l, i) => {
      if (i % step === 0) {
        const x = pad.left + (i / (labels.length - 1)) * cW;
        ctx.fillText(l, x, H - pad.bottom + 16);
      }
    });

    // Lines
    datasets.forEach((data, di) => {
      const pts = data.map((v, i) => ({
        x: pad.left + (i / (data.length - 1)) * cW,
        y: pad.top + cH - (v / maxVal) * cH,
      }));

      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
      grad.addColorStop(0, colors[di] + "44");
      grad.addColorStop(1, colors[di] + "00");

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad.top + cH);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, pad.top + cH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      pts.forEach((p, i) =>
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
      );
      ctx.strokeStyle = colors[di];
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors[di];
      ctx.fill();
    });
  });
  return <canvas ref={ref} style={{ width: "100%", height: "100%" }} />;
}

function buildSeries(days: number) {
  const labels = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const leads = labels.map((_, index) => {
    const wave = Math.sin(index / 3.2) * 170;
    const trend = index * 6;
    return Math.max(260, Math.round(780 + wave + trend));
  });
  const conversions = leads.map((value, index) =>
    Math.max(18, Math.round(value * (0.095 + (index % 6) * 0.004))),
  );

  return { labels, leads, conversions };
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const { labels, leads, conversions } = buildSeries(range);

  return (
    <div className="page-section">
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
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            Last {range} days · refreshed 5m ago
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              className={range === value ? "btn-primary" : "btn-ghost"}
              style={
                range === value
                  ? { fontSize: 12, padding: "8px 16px" }
                  : undefined
              }
              onClick={() => setRange(value as 7 | 30 | 90)}
            >
              {value}D
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            icon: "📥",
            val: "28,441",
            label: "Leads Received",
            delta: "+18%",
            color: "#4facfe",
            up: true,
          },
          {
            icon: "📤",
            val: "21,803",
            label: "Leads Delivered",
            delta: "+22%",
            color: "#34d399",
            up: true,
          },
          {
            icon: "💰",
            val: "3,214",
            label: "Conversions",
            delta: "+9%",
            color: "#a78bfa",
            up: true,
          },
          {
            icon: "🛡",
            val: "1,847",
            label: "Fraud Blocked",
            delta: "-4%",
            color: "#f87171",
            up: false,
          },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "var(--r-xl)",
                background: `radial-gradient(circle at 85% 15%, ${k.color}18, transparent 65%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${k.color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              {k.icon}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>
              {k.val}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
              {k.label}
            </div>
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
                background: k.up
                  ? "rgba(52,211,153,0.14)"
                  : "rgba(248,113,113,0.14)",
                color: k.up ? "#34d399" : "#f87171",
              }}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div className="section-label" style={{ margin: 0 }}>
            Leads & Conversions — {range} Days
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 3,
                  borderRadius: 2,
                  background: "#4facfe",
                  display: "inline-block",
                }}
              ></span>{" "}
              Leads
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 3,
                  borderRadius: 2,
                  background: "#a78bfa",
                  display: "inline-block",
                }}
              ></span>{" "}
              Conversions
            </span>
          </div>
        </div>
        <div style={{ height: 220 }}>
          <LineChart
            colors={["#4facfe", "#a78bfa"]}
            labels={labels}
            datasets={[leads, conversions]}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Countries */}
        <div className="glass-card">
          <div className="section-label">Top Countries</div>
          {COUNTRIES.map((c) => (
            <div key={c.c} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {flag(c.c)} {c.n}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-1)",
                  }}
                >
                  {c.pct}%
                </span>
              </div>
              <div className="score-track">
                <div
                  className="score-fill"
                  style={{
                    width: `${c.pct * 4}%`,
                    background: "var(--grad-blue)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Broker performance */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 14px" }}>
            <div className="section-label">Broker Performance</div>
          </div>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Broker</th>
                <th>Leads</th>
                <th>Conv%</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {BROKERS_PERF.map((b) => (
                <tr key={b.name}>
                  <td className="td-primary" style={{ fontWeight: 500 }}>
                    {b.name}
                  </td>
                  <td>{b.leads.toLocaleString()}</td>
                  <td
                    style={{
                      fontWeight: 600,
                      color: b.conv > 12 ? "#34d399" : "#fbbf24",
                    }}
                  >
                    {b.conv}%
                  </td>
                  <td style={{ fontWeight: 600, color: "#34d399" }}>{b.rev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
