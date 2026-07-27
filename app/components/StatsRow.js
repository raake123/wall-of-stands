"use client";

import { useTheme } from "../lib/theme-context";

export default function StatsRow({ filed, supporters, resolved }) {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, CARD, BORDER, MUTED } = colors;

  const cells = [
    { value: filed, label: "Stands filed", color: RED },
    { value: supporters, label: "Total supporters", color: GOLD },
    { value: resolved, label: "Resolved", color: GREEN },
  ];

  return (
    <div
      className="flex rounded-lg mb-5 overflow-hidden"
      style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          className="flex-1 text-center px-2 py-3"
          style={i > 0 ? { borderLeft: "1px solid " + BORDER } : undefined}
        >
          <p className="text-lg font-black" style={{ color: c.color }}>{c.value}</p>
          <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: MUTED }}>
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}
