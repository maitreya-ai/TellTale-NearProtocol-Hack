"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VaultSnapshot } from "@/lib/types";
import { fmtNear, vaultEvents } from "./events";

const HOUR = 3_600_000;
const SPANS = [HOUR, 6 * HOUR, 24 * HOUR, 7 * 24 * HOUR, 30 * 24 * HOUR];
const BINS = 36;
const H = 168;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

function label(ms: number, span: number): string {
  const d = new Date(ms);
  return span > 24 * HOUR
    ? d.toLocaleDateString([], { month: "short", day: "numeric" })
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** NEAR paid per time bucket (bars) with each trip marked in red. */
export function ActivityChart({ snap }: { snap: VaultSnapshot }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const events = vaultEvents(snap);
    const now = snap.fetchedAt || Date.now();
    const oldest = events.length ? Math.min(...events.map((e) => e.at)) : now;
    const span = SPANS.find((s) => now - oldest <= s * 0.95) ?? SPANS[SPANS.length - 1]!;
    const start = now - span;
    const step = span / BINS;
    const bins = Array.from({ length: BINS }, (_, i) => ({
      from: start + i * step,
      near: 0,
      payments: 0,
      trips: 0,
    }));
    for (const e of events) {
      const i = Math.min(BINS - 1, Math.floor((e.at - start) / step));
      if (i < 0) continue;
      if (e.kind === "payment") {
        bins[i]!.near += e.amount ?? 0;
        bins[i]!.payments += 1;
      } else bins[i]!.trips += 1;
    }
    const max = Math.max(0.1, ...bins.map((b) => b.near));
    const trips = events.filter((e) => e.kind === "trip" && e.at >= start);
    return { bins, max, start, span, step, trips, now };
  }, [snap]);

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const bw = innerW / BINS;
  const x = (t: number) => PAD.left + ((t - model.start) / model.span) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / model.max) * innerH;
  const hovered = hover !== null ? model.bins[hover] : null;

  return (
    <div ref={wrap} className="relative">
      <svg
        width={width}
        height={H}
        role="img"
        aria-label="NEAR paid over time, with trips marked"
        className="block"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.floor((e.clientX - r.left - PAD.left) / bw);
          setHover(i >= 0 && i < BINS ? i : null);
        }}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(model.max * f)}
              y2={y(model.max * f)}
              stroke="var(--border)"
              strokeDasharray={f === 0 ? undefined : "3 3"}
            />
            <text
              x={PAD.left - 8}
              y={y(model.max * f) + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[10px] tabular-nums"
            >
              {fmtNear(model.max * f)}
            </text>
          </g>
        ))}
        {model.bins.map((b, i) => {
          const h = Math.max(b.near > 0 ? 2 : 0, innerH - (y(b.near) - PAD.top));
          return (
            <g key={i}>
              {hover === i && (
                <rect
                  x={PAD.left + i * bw}
                  y={PAD.top}
                  width={bw}
                  height={innerH}
                  fill="var(--muted)"
                />
              )}
              <rect
                x={PAD.left + i * bw + bw * 0.18}
                y={PAD.top + innerH - h}
                width={bw * 0.64}
                height={h}
                rx={2}
                fill="var(--foreground)"
                opacity={hover === null || hover === i ? 0.88 : 0.4}
              />
            </g>
          );
        })}
        {model.trips.map((t) => (
          <g key={t.id}>
            <line
              x1={x(t.at)}
              x2={x(t.at)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--tripped)"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(t.at)}
              cy={PAD.top + 3}
              r={4}
              fill="var(--tripped)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          </g>
        ))}
        {[0, 1 / 3, 2 / 3, 1].map((f, i) => (
          <text
            key={f}
            x={PAD.left + f * innerW}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"}
            className="fill-muted-foreground text-[10px]"
          >
            {i === 3 ? "now" : label(model.start + f * model.span, model.span)}
          </text>
        ))}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-36 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
          style={{
            left: Math.min(Math.max(PAD.left + (hover + 0.5) * bw, 80), width - 80),
          }}
        >
          <div className="text-muted-foreground">{label(hovered.from, model.span)}</div>
          <div className="mt-1 flex justify-between gap-4">
            <span>Paid</span>
            <span className="font-medium tabular-nums">{fmtNear(hovered.near)} NEAR</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Payments</span>
            <span className="tabular-nums">{hovered.payments}</span>
          </div>
          {hovered.trips > 0 && (
            <div className="flex justify-between gap-4 text-tripped">
              <span>Trips</span>
              <span className="tabular-nums">{hovered.trips}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
