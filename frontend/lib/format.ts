export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * ImpactEstimate.metric is a free-text string from the backend (e.g.
 * "Interest paid (12mo)", "Emergency fund months", "Health score"), so we
 * can't know its unit precisely. Heuristic: metrics whose label suggests a
 * score/rate/percent or whose magnitude is small (months, ratios, score
 * points) render as a plain number; everything else renders as currency.
 */
export function formatImpactValue(metric: string, value: number): string {
  const lower = metric.toLowerCase();
  const looksLikePlainNumber =
    lower.includes("score") || lower.includes("rate") || lower.includes("percent") || lower.includes("month");
  if (looksLikePlainNumber || Math.abs(value) < 50) {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }
  return formatCurrency(value);
}
