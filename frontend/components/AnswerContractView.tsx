import type { ReactNode } from "react";
import type { AnswerContract } from "@/lib/types";
import { CardTitle } from "@/components/ui/Card";
import { ConfidenceChip } from "@/components/ui/ConfidenceChip";
import { Chip } from "@/components/ui/Chip";
import { formatCurrency, formatImpactValue } from "@/lib/format";

/**
 * Renders an AnswerContract as three visually distinct, clearly labeled
 * lanes -- Observed / Predicted / Recommended. Shared by the dashboard
 * insights panel and the copilot chat so the "facts vs predictions vs
 * recommendations, always labeled" behavior is identical everywhere.
 * Never blend lanes into a single paragraph.
 */
export function AnswerContractView({ answer }: { answer: AnswerContract }) {
  const { facts, predictions, recommendations, data_gaps, narrative } = answer;
  const isEmpty =
    facts.length === 0 && predictions.length === 0 && recommendations.length === 0 && !narrative;

  if (isEmpty) {
    return <p className="text-sm text-pewter">No insights available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {narrative ? <p className="text-sm leading-relaxed text-graphite">{narrative}</p> : null}

      {facts.length > 0 && (
        <Lane title="Observed" hint="What the data shows">
          <ul className="flex flex-col gap-2">
            {facts.map((f, i) => {
              // Fact.text from the backend already narrates the number in
              // context (currency, percent, or otherwise) -- only append a
              // standalone value badge when the text doesn't already spell
              // it out, to avoid misrendering e.g. a 0.12 rate as "₹0".
              const textAlreadyHasValue = /[₹%]/.test(f.text);
              return (
                <li key={i} className="text-sm text-ink">
                  {f.text}
                  {f.value !== null && !textAlreadyHasValue ? (
                    <span className="ml-2 font-medium">{formatCurrency(f.value)}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Lane>
      )}

      {predictions.length > 0 && (
        <Lane title="Predicted" hint="Our best estimate, not a fact">
          <ul className="flex flex-col gap-3">
            {predictions.map((p, i) => (
              <li key={i} className="flex flex-col gap-1 text-sm text-graphite">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{p.text}</span>
                  <ConfidenceChip value={p.confidence} />
                </div>
                {(p.range_low !== null || p.range_high !== null) && (
                  <span className="text-xs text-pewter">
                    Likely range: {p.range_low !== null ? formatCurrency(p.range_low) : "?"} &ndash;{" "}
                    {p.range_high !== null ? formatCurrency(p.range_high) : "?"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Lane>
      )}

      {recommendations.length > 0 && (
        <Lane title="Recommended" hint="Suggested action, with expected impact">
          <ul className="flex flex-col gap-4">
            {recommendations.map((r, i) => (
              <li key={i} className="rounded-chip border border-mist p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{r.text}</p>
                  <ConfidenceChip value={r.confidence} />
                </div>
                <p className="mt-1 text-xs text-graphite">{r.rationale}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-pewter">{r.impact.metric}:</span>
                  <span className="text-graphite">{formatImpactValue(r.impact.metric, r.impact.before)}</span>
                  <span className="text-mist">&rarr;</span>
                  <span className="font-semibold text-ink">
                    {formatImpactValue(r.impact.metric, r.impact.after)}
                  </span>
                  <span
                    className={
                      r.impact.delta >= 0
                        ? "font-semibold text-ember-dark"
                        : "font-semibold text-ink"
                    }
                  >
                    ({r.impact.delta >= 0 ? "+" : ""}
                    {formatImpactValue(r.impact.metric, r.impact.delta)})
                  </span>
                  <Chip tone="outline" className="ml-auto">
                    {r.impact.horizon}
                  </Chip>
                </div>
              </li>
            ))}
          </ul>
        </Lane>
      )}

      {data_gaps.length > 0 && (
        <div className="rounded-chip border border-dashed border-mist bg-fog/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-pewter">
            What we don&apos;t know yet
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {data_gaps.map((g, i) => (
              <li key={i} className="text-xs text-graphite">
                {g.text}
                <span className="text-pewter"> &mdash; {g.what_would_help}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Lane({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const dot =
    title === "Observed" ? "bg-ink" : title === "Predicted" ? "bg-graphite" : "bg-ember";
  return (
    <section>
      <header className="mb-2 flex items-baseline gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        <CardTitle className="uppercase tracking-wide text-xs text-pewter">{title}</CardTitle>
        <span className="text-xs text-mist">{hint}</span>
      </header>
      {children}
    </section>
  );
}
