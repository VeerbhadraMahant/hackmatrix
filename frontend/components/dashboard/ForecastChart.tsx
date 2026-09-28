import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CashFlowForecast } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

/**
 * P50 as the main Ember line, P10-P90 as a soft Mist band. When a second
 * forecast is provided (simulate "before" overlay), its P50 renders as a
 * dashed graphite line for comparison.
 */
export function ForecastChart({
  forecast,
  compareForecast,
  compareLabel = "Before",
}: {
  forecast: CashFlowForecast;
  compareForecast?: CashFlowForecast;
  compareLabel?: string;
}) {
  const data = forecast.points.map((p, i) => ({
    date: p.date,
    band: [p.p10, p.p90],
    p50: p.p50,
    comparePoint: compareForecast?.points[i]?.p50 ?? null,
  }));

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-fog)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDate(d)}
              tick={{ fontSize: 11, fill: "var(--color-pewter)" }}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 11, fill: "var(--color-pewter)" }}
              width={80}
            />
            <Tooltip
              labelFormatter={(d) => formatDate(String(d))}
              formatter={(value, name) => {
                if (name === "band" && Array.isArray(value)) {
                  return [`${formatCurrency(Number(value[0]))} - ${formatCurrency(Number(value[1]))}`, "P10-P90 range"];
                }
                if (name === "p50") return [formatCurrency(Number(value)), "P50 (expected)"];
                if (name === "comparePoint") return [formatCurrency(Number(value)), compareLabel];
                return [String(value), String(name)];
              }}
              contentStyle={{ borderRadius: 6, borderColor: "var(--color-mist)", fontSize: 12 }}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--color-mist)"
              fillOpacity={0.35}
              isAnimationActive={false}
            />
            {compareForecast && (
              <Line
                type="monotone"
                dataKey="comparePoint"
                stroke="var(--color-graphite)"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="p50"
              stroke="var(--color-ember)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {forecast.first_gap_date && (
              <ReferenceLine
                x={forecast.first_gap_date}
                stroke="var(--color-ink)"
                strokeDasharray="2 2"
                label={{
                  value: "Shortfall",
                  position: "insideTopLeft",
                  fontSize: 11,
                  fill: "var(--color-ink)",
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {forecast.first_gap_date ? (
        <p className="mt-3 text-sm text-graphite">
          Projected shortfall around{" "}
          <span className="font-semibold text-ink">{formatDate(forecast.first_gap_date)}</span>.
        </p>
      ) : (
        <p className="mt-3 text-sm text-graphite">No shortfall projected in this horizon.</p>
      )}
    </div>
  );
}
