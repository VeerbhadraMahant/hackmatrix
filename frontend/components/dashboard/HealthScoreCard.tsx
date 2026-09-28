import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { HealthScore } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function HealthScoreCard({ score }: { score: HealthScore }) {
  const trend = score.trend_30d;
  const trendUp = trend !== null && trend > 0;
  const trendDown = trend !== null && trend < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health score</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-6xl text-ink leading-none">{Math.round(score.overall)}</span>
          <span className="text-sm text-pewter">/ 100</span>
        </div>
        {trend !== null && (
          <span
            className={
              "flex items-center gap-1 text-sm font-medium " +
              (trendUp ? "text-ember-dark" : trendDown ? "text-graphite" : "text-pewter")
            }
          >
            {trendUp ? "↑" : trendDown ? "↓" : "→"} {Math.abs(trend).toFixed(1)} pts / 30d
          </span>
        )}
      </div>

      <div className="mt-6 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={score.sub_scores} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-fog)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-pewter)" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11, fill: "var(--color-graphite)" }}
            />
            <Tooltip
              formatter={(value, _name, item) => [
                `${Math.round(Number(value))} / 100`,
                (item?.payload as { detail?: string } | undefined)?.detail ?? "",
              ]}
              contentStyle={{ borderRadius: 6, borderColor: "var(--color-mist)", fontSize: 12 }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {score.sub_scores.map((s, i) => (
                <Cell key={i} fill={s.score >= 60 ? "var(--color-ink)" : "var(--color-ember)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
