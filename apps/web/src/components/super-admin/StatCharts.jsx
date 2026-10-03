import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "../../utils/intl";

// Colours are CSS variables (.mc-chart in index.css), so the charts follow the
// light/dark theme without re-rendering.
const AXIS = { fill: "var(--mc-muted)", fontSize: 12 };

const tooltipProps = {
  contentStyle: {
    background: "var(--mc-surface-raised, #fff)",
    border: "1px solid var(--mc-line)",
    borderRadius: 8,
    color: "var(--mc-ink)",
    fontSize: 13,
  },
  labelStyle: { color: "var(--mc-ink)", fontWeight: 600 },
  itemStyle: { color: "var(--mc-ink)" },
  cursor: { stroke: "var(--mc-line)", fill: "var(--mc-soft)" },
};

function Frame({ title, summary, children }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <h6 className="fw-bold mb-3">{title}</h6>
        <div className="mc-chart" role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height={280}>{children}</ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/** Monthly growth: one line per series. `series` is [{ key, label, color }]. */
export function TrendChart({ title, data, series, locale }) {
  const format = (value) => formatNumber(value, locale);
  const summary = `${title}: ${series.map(({ label }) => label).join(", ")}`;
  return (
    <Frame title={title} summary={summary}>
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="var(--mc-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--mc-line)" }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={format} />
        <Tooltip {...tooltipProps} formatter={(value) => format(value)} />
        <Legend wrapperStyle={{ color: "var(--mc-ink)", fontSize: 13 }} />
        {series.map(({ key, label, color }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, stroke: color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </Frame>
  );
}

/** Totals as bars. `data` is [{ label, value }]. */
export function TotalsChart({ title, data, locale }) {
  const format = (value) => formatNumber(value, locale);
  const summary = `${title}: ${data.map(({ label, value }) => `${label} ${format(value)}`).join(", ")}`;
  return (
    <Frame title={title} summary={summary}>
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="var(--mc-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--mc-line)" }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={format} />
        <Tooltip {...tooltipProps} formatter={(value) => format(value)} />
        <Bar dataKey="value" fill="var(--mc-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </Frame>
  );
}
