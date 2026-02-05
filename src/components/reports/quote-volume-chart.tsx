"use client";

import * as React from "react";

type Point = { day: string; count: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function QuoteVolumeChart({
  data,
  title = "Quote volume",
  subtitle = "Quotes created per day",
}: {
  data: Point[];
  title?: string;
  subtitle?: string;
}) {
  const w = 920;
  const h = 240;
  const padX = 24;
  const padY = 24;

  const max = Math.max(1, ...data.map((d) => (Number.isFinite(d.count) ? d.count : 0)));

  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (innerW * i) / Math.max(1, data.length - 1);
    const y =
      padY +
      innerH * (1 - clamp((Number.isFinite(d.count) ? d.count : 0) / max, 0, 1));
    return { x, y, d };
  });

  const dPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const last = data[data.length - 1]?.count ?? 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-foreground/60">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground/60">Last day</div>
          <div className="text-lg font-semibold">{last}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="block min-w-[720px]"
          role="img"
          aria-label="Quote volume chart"
        >
          {/* grid */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = padY + (innerH * (i + 1)) / 4;
            return (
              <line
                key={i}
                x1={padX}
                x2={w - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                opacity={0.08}
              />
            );
          })}

          {/* line */}
          <path d={dPath} fill="none" stroke="currentColor" opacity={0.9} strokeWidth={2} />

          {/* points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="currentColor"
              opacity={0.9}
            />
          ))}

          {/* x labels (sparse) */}
          {points.map((p, i) => {
            const show = i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2);
            if (!show) return null;
            return (
              <text
                key={`t-${i}`}
                x={p.x}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity={0.55}
              >
                {p.d.day}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 text-xs text-foreground/60">
        Consistent quoting leads to more closed jobs. Use this trend to stay on pace.
      </div>
    </section>
  );
}
