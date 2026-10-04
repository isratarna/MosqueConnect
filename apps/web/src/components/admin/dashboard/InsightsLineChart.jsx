import { useEffect, useRef, useState } from "react";
import { formatShortDate, niceMax, plotPoints, pointsToPath } from "../../../utils/dashboardFormat";
import { useLocale } from "../../../hooks/useLocale";

const HEIGHT = 240;
const MARGIN = { top: 12, right: 78, bottom: 26, left: 34 };

/**
 * Daily counts for several series on one shared y-axis. A crosshair follows
 * the pointer (or the arrow keys) and lists every series for that day.
 *
 * @param {{ series: {key: string, label: string, color: string}[], data: object[] }} props
 */
export default function InsightsLineChart({ series, data }) {
  const { t, locale } = useLocale();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.floor(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = niceMax(Math.max(0, ...data.flatMap((day) => series.map((item) => day[item.key]))));
  const lines = series.map((item) => ({ ...item, points: plotPoints(data.map((day) => day[item.key]), { width: plotWidth, height: plotHeight, max }) }));
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  // End labels, nudged apart so they never overlap.
  const endLabels = lines
    .map((line) => ({ key: line.key, label: line.label, color: line.color, y: line.points.at(-1)?.y ?? plotHeight }))
    .sort((a, b) => a.y - b.y)
    .reduce((placed, label) => [...placed, { ...label, y: placed.length ? Math.max(label.y, placed.at(-1).y + 13) : label.y }], []);

  const indexAt = (clientX) => {
    const box = wrapRef.current.getBoundingClientRect();
    const x = clientX - box.left - MARGIN.left;
    return Math.min(data.length - 1, Math.max(0, Math.round(x / stepX)));
  };

  const onKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = active ?? data.length - 1;
    const next = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: data.length - 1 }[event.key];
    setActive(Math.min(data.length - 1, Math.max(0, next)));
  };

  const day = active !== null ? data[active] : null;
  const crossX = active !== null ? lines[0].points[active].x : 0;
  const ticks = [0, max / 2, max];
  const xTicks = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter((value, index, list) => list.indexOf(value) === index);

  return (
    <>
      <ul className="mc-chart-legend" aria-label={t("dashboard.insights.legend")}>
        {series.map((item) => (
          <li key={item.key}><span className="mc-chart-legend__key" style={{ background: item.color }} aria-hidden="true" />{item.label}</li>
        ))}
      </ul>
      <div className="mc-chart" ref={wrapRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        tabIndex={0}
        aria-label={t("dashboard.insights.chartAria", { series: series.map((item) => item.label.toLowerCase()).join(", "), from: formatShortDate(data[0]?.date, locale), to: formatShortDate(data.at(-1)?.date, locale) })}
        onPointerMove={(event) => setActive(indexAt(event.clientX))}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1="0" x2={plotWidth} y1={plotHeight - (tick / max) * plotHeight} y2={plotHeight - (tick / max) * plotHeight} className={tick === 0 ? "mc-chart-baseline" : "mc-chart-grid"} />
              <text x="-6" y={plotHeight - (tick / max) * plotHeight} dy="0.32em" textAnchor="end" className="mc-chart-tick">{Math.round(tick)}</text>
            </g>
          ))}
          {xTicks.map((index) => (
            <text key={index} x={lines[0].points[index].x} y={plotHeight + 18} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} className="mc-chart-tick">
              {formatShortDate(data[index].date, locale)}
            </text>
          ))}
          {lines.map((line) => <path key={line.key} d={pointsToPath(line.points)} className="mc-chart-line" style={{ stroke: line.color }} />)}
          {endLabels.map((label) => (
            <text key={label.key} x={plotWidth + 8} y={label.y} dy="0.32em" className="mc-chart-label">{label.label}</text>
          ))}
          {day && (
            <g>
              <line x1={crossX} x2={crossX} y1="0" y2={plotHeight} className="mc-chart-crosshair" />
              {lines.map((line) => <circle key={line.key} cx={crossX} cy={line.points[active].y} r="4" className="mc-chart-dot" style={{ fill: line.color }} />)}
            </g>
          )}
        </g>
      </svg>
      {day && (
        <div
          className="mc-chart-tooltip"
          role="status"
          style={{ left: Math.min(width - 150, Math.max(0, MARGIN.left + crossX + 10)), top: MARGIN.top }}
        >
          <div className="fw-semibold mb-1">{formatShortDate(day.date, locale)}</div>
          {series.map((item) => (
            <div key={item.key} className="d-flex align-items-center gap-2">
              <span className="mc-chart-tooltip__key" style={{ background: item.color }} aria-hidden="true" />
              <strong>{day[item.key]}</strong> <span className="text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
