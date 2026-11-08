import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Table2 } from "lucide-react";
import { BD, INC_TYPES, MID, NAVY, NK, PAPER, SL, STATUS_LABEL, WHITE } from "../constants.js";
import {
  countBy,
  filterIncidents,
  formatMinutes,
  hourHeatmap,
  PRIORITY_ORDER,
  RANGES,
  responderPerformance,
  responseTimesByPriority,
  STATUS_ORDER,
  summarize,
  timeSeries,
  WEEKDAYS,
} from "../admin/analytics.js";
import { downloadCsv, incidentsToCsv } from "../admin/incidentCsv.js";

// Categorical slots 1–2 and the sequential blue ramp, validated for this light
// surface with the dataviz palette checker (CVD ΔE 24.7, contrast ≥ 3:1).
const SERIES_1 = "#2a78d6";
const SERIES_2 = "#eb6834";
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const GRID = "#E6EAF1";
const AXIS_TICK = { fill: MID, fontSize: 11 };

const typeLabel = key => INC_TYPES[key]?.label || key;

function ChartTooltip({ active, payload, label, format = value => value }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 6, padding: "8px 10px", boxShadow: "0 6px 18px rgba(15,35,70,.12)", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: NK, marginBottom: 4 }}>{label}</div>
      {payload.map(item => (
        <div key={item.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, color: SL }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
          {item.name}: <strong style={{ color: NK }}>{item.value == null ? "—" : format(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: SL }}>
      {items.map(([label, color]) => (
        <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true" style={{ width: 14, height: 3, borderRadius: 2, background: color }} />{label}
        </span>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>{columns.map(([label]) => <th key={label} scope="col" style={{ textAlign: "left", padding: "6px 8px", color: MID, fontWeight: 700, borderBottom: `1px solid ${BD}`, whiteSpace: "nowrap" }}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{columns.map(([label, read]) => <td key={label} style={{ padding: "6px 8px", color: NK, borderBottom: `1px solid ${GRID}` }}>{read(row)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every chart can flip to a plain table: identity is never colour-only, and the
// numbers stay readable for screen readers and printouts.
function ChartCard({ title, subtitle, legend, table, children, span = 1, height = 260 }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section style={{ gridColumn: `span ${span}`, background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, padding: "16px 18px", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, color: NK, fontFamily: "'IBM Plex Serif',serif", margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 12, color: MID, margin: "3px 0 0" }}>{subtitle}</p>}
        </div>
        {table && (
          <button type="button" onClick={() => setShowTable(value => !value)} aria-pressed={showTable} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", border: `1px solid ${BD}`, borderRadius: 5, background: showTable ? PAPER : WHITE, color: NAVY, fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            <Table2 size={13} aria-hidden="true" /> {showTable ? "Chart" : "Table"}
          </button>
        )}
      </div>
      {legend && !showTable && <div style={{ marginBottom: 10 }}>{legend}</div>}
      {showTable ? <DataTable {...table} /> : <div style={{ height }}>{children}</div>}
    </section>
  );
}

function StatTile({ label, value, detail }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: NK, fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1.15, marginTop: 6 }}>{value}</div>
      {detail && <div style={{ fontSize: 11.5, color: SL, marginTop: 4 }}>{detail}</div>}
    </div>
  );
}

function RankedBars({ data, name, format }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={120} tick={{ ...AXIS_TICK, fill: SL }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: PAPER }} content={<ChartTooltip format={format} />} />
        <Bar dataKey="count" name={name} fill={SERIES_1} barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Heatmap({ grid }) {
  const [hover, setHover] = useState(null);
  const color = count => count === 0 || grid.max === 0 ? PAPER : RAMP[Math.min(RAMP.length - 1, Math.floor((count / grid.max) * (RAMP.length - 1)))];
  return (
    <div>
      <div aria-live="polite" style={{ fontSize: 12, color: SL, minHeight: 18, marginBottom: 6 }}>
        {hover ? <><strong style={{ color: NK }}>{WEEKDAYS[hover.day]} {String(hover.hour).padStart(2, "0")}:00–{String(hover.hour).padStart(2, "0")}:59</strong> · {hover.count} report{hover.count === 1 ? "" : "s"}</> : "Hover a cell for the exact count."}
      </div>
      <div style={{ overflowX: "auto" }}>
        <div role="img" aria-label="Reports by weekday and hour" style={{ display: "grid", gridTemplateColumns: "36px repeat(24, minmax(16px, 1fr))", gap: 2, minWidth: 520 }}>
          <span />
          {Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ fontSize: 10, color: MID, textAlign: "center" }}>{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span>)}
          {grid.cells.map((row, day) => [
            <span key={`label-${day}`} style={{ fontSize: 11, color: SL, alignSelf: "center" }}>{WEEKDAYS[day]}</span>,
            ...row.map((count, hour) => (
              <span
                key={`${day}-${hour}`}
                title={`${WEEKDAYS[day]} ${String(hour).padStart(2, "0")}:00 · ${count} report${count === 1 ? "" : "s"}`}
                onMouseEnter={() => setHover({ day, hour, count })}
                onMouseLeave={() => setHover(null)}
                style={{ height: 22, borderRadius: 3, background: color(count), outline: hover?.day === day && hover?.hour === hour ? `2px solid ${NK}` : "none" }}
              />
            )),
          ])}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: MID }}>
        Fewer
        {[PAPER, ...RAMP].map(swatch => <span key={swatch} aria-hidden="true" style={{ width: 16, height: 10, borderRadius: 2, background: swatch }} />)}
        More{grid.max ? ` (max ${grid.max} in one hour slot)` : ""}
      </div>
    </div>
  );
}

const selectStyle = { padding: "8px 12px", border: `1.5px solid ${BD}`, borderRadius: 6, fontSize: 13, color: NK, background: WHITE };

export default function IncidentAnalyticsPanel({ incidents }) {
  const [range, setRange] = useState("30d");
  const [type, setType] = useState("all");
  const [priority, setPriority] = useState("all");

  const data = useMemo(() => {
    const now = Date.now();
    const rows = filterIncidents(incidents, { range, type, priority }, now);
    return {
      rows,
      summary: summarize(rows),
      series: timeSeries(rows, range, now),
      byType: countBy(rows, incident => incident.type).map(row => ({ ...row, label: typeLabel(row.key) })),
      byStatus: countBy(rows, incident => incident.status, STATUS_ORDER).map(row => ({ ...row, label: STATUS_LABEL[row.key] || row.key })),
      byPriority: countBy(rows, incident => incident.priority, PRIORITY_ORDER).map(row => ({ ...row, label: row.key })),
      byLocation: countBy(rows, incident => incident.loc).slice(0, 8).map(row => ({ ...row, label: row.key.length > 26 ? `${row.key.slice(0, 25)}…` : row.key, full: row.key })),
      response: responseTimesByPriority(rows),
      heatmap: hourHeatmap(rows),
      responders: responderPerformance(rows),
    };
  }, [incidents, range, type, priority]);

  const { summary } = data;
  const rangeLabel = RANGES.find(([key]) => key === range)?.[1];
  const exportCsv = () => downloadCsv(
    `ceis-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
    incidentsToCsv(data.rows, { type: Object.fromEntries(Object.entries(INC_TYPES).map(([key, value]) => [key, value.label])), status: STATUS_LABEL }),
  );

  return (
    <div style={{ animation: "fadeIn .35s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'IBM Plex Serif',serif", fontSize: 24, color: NK, marginBottom: 4 }}>Incident analytics</h2>
          <p style={{ fontSize: 13, color: SL }}>Live from the incident feed · {summary.total} report{summary.total === 1 ? "" : "s"} in the last {rangeLabel?.toLowerCase()}{type !== "all" ? ` · ${typeLabel(type)}` : ""}{priority !== "all" ? ` · ${priority}` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div role="group" aria-label="Time range" style={{ display: "inline-flex", border: `1.5px solid ${BD}`, borderRadius: 6, overflow: "hidden", background: WHITE }}>
            {RANGES.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setRange(key)} aria-pressed={range === key} style={{ padding: "7px 11px", border: 0, borderRight: `1px solid ${BD}`, background: range === key ? NAVY : WHITE, color: range === key ? WHITE : SL, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          <select aria-label="Filter by incident type" value={type} onChange={event => setType(event.target.value)} style={selectStyle}>
            <option value="all">All types</option>
            {Object.entries(INC_TYPES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <select aria-label="Filter by priority" value={priority} onChange={event => setPriority(event.target.value)} style={selectStyle}>
            <option value="all">All priorities</option>
            {PRIORITY_ORDER.map(key => <option key={key} value={key}>{key}</option>)}
          </select>
          <button type="button" onClick={exportCsv} disabled={!data.rows.length} style={{ ...selectStyle, display: "inline-flex", alignItems: "center", gap: 6, color: NAVY, fontWeight: 700, cursor: data.rows.length ? "pointer" : "not-allowed", opacity: data.rows.length ? 1 : 0.5 }}>
            <Download size={15} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 14 }}>
        <StatTile label="Reports" value={summary.total} detail={`${summary.sos} SOS · ${summary.anonymous} anonymous`} />
        <StatTile label="Open now" value={summary.active} detail={`${summary.activeCritical} critical · ${summary.unassigned} unassigned`} />
        <StatTile label="Median to dispatch" value={formatMinutes(summary.medianDispatchMinutes)} detail="Report → responder assigned" />
        <StatTile label="Median to resolve" value={formatMinutes(summary.medianResolveMinutes)} detail="Report → resolved" />
        <StatTile label="Resolution rate" value={summary.resolutionRate == null ? "—" : `${Math.round(summary.resolutionRate * 100)}%`} detail={`${summary.resolved} resolved or closed`} />
      </div>

      {summary.total === 0 ? (
        <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 10, padding: 32, textAlign: "center", color: SL }}>No incidents match these filters. Widen the time range or clear a filter.</div>
      ) : (
        <div className="ceis-analytics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          <ChartCard
            span={2}
            title="Reports over time"
            subtitle={range === "365d" ? "Weekly totals" : range === "all" ? "Monthly totals" : "Daily totals"}
            legend={<Legend items={[["All reports", SERIES_1], ["SOS alerts", SERIES_2]]} />}
            table={{ columns: [["Period", row => row.label], ["All reports", row => row.total], ["SOS alerts", row => row.sos]], rows: data.series }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: MID, strokeWidth: 1 }} content={<ChartTooltip />} />
                <Line type="monotone" dataKey="total" name="All reports" stroke={SERIES_1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: WHITE, strokeWidth: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="sos" name="SOS alerts" stroke={SERIES_2} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: WHITE, strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="By incident type" subtitle="Ranked by number of reports" table={{ columns: [["Type", row => row.label], ["Reports", row => row.count]], rows: data.byType }}>
            <RankedBars data={data.byType} name="Reports" />
          </ChartCard>

          <ChartCard title="Response pipeline" subtitle="Where reports currently sit, in workflow order" table={{ columns: [["Status", row => row.label], ["Reports", row => row.count]], rows: data.byStatus }}>
            <RankedBars data={data.byStatus} name="Reports" />
          </ChartCard>

          <ChartCard
            title="Response times by priority"
            subtitle="Median minutes from report"
            legend={<Legend items={[["To dispatch", SERIES_1], ["To resolve", SERIES_2]]} />}
            table={{ columns: [["Priority", row => row.priority], ["Reports", row => row.count], ["Median to dispatch", row => formatMinutes(row.dispatch)], ["Median to resolve", row => formatMinutes(row.resolve)]], rows: data.response }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.response} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="priority" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: PAPER }} content={<ChartTooltip format={formatMinutes} />} />
                <Bar dataKey="dispatch" name="To dispatch" fill={SERIES_1} maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="resolve" name="To resolve" fill={SERIES_2} maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Priority mix" subtitle="Reports per priority level" table={{ columns: [["Priority", row => row.label], ["Reports", row => row.count]], rows: data.byPriority }}>
            <RankedBars data={data.byPriority} name="Reports" />
          </ChartCard>

          <ChartCard
            span={2}
            height="auto"
            title="When incidents happen"
            subtitle="Reports by weekday and hour (your local time) — use it to plan responder shifts"
            table={{ columns: [["Day", row => row.day], ...Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, "0"), row => row.cells[hour]])], rows: data.heatmap.cells.map((cells, index) => ({ day: WEEKDAYS[index], cells })) }}
          >
            <Heatmap grid={data.heatmap} />
          </ChartCard>

          <ChartCard title="Hotspot locations" subtitle="Top 8 locations by reports" table={{ columns: [["Location", row => row.full], ["Reports", row => row.count]], rows: data.byLocation }}>
            <RankedBars data={data.byLocation} name="Reports" />
          </ChartCard>

          <ChartCard title="Responder performance" subtitle="Assignments in this period" height="auto">
            {data.responders.length ? (
              <DataTable
                columns={[
                  ["Responder", row => row.name],
                  ["Assigned", row => row.assigned],
                  ["Active", row => row.active],
                  ["Resolved", row => row.resolved],
                  ["Median dispatch → resolve", row => formatMinutes(row.medianDispatchToResolveMinutes)],
                ]}
                rows={data.responders}
              />
            ) : <p style={{ fontSize: 13, color: SL }}>No responder assignments in this period.</p>}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
