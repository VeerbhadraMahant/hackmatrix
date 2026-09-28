"""Recommendation engine.

Generates a ranked `list[Recommendation]` by actually calling
`app.simulate.engine.simulate()` for each plausible candidate action -- every
recommendation therefore carries a real, simulated `ImpactEstimate`, not a
hand-waved guess. This is the core "show the expected impact of any
recommended action" requirement.

Candidate generation heuristics (deliberately simple / explainable):
  * every debt -> try prepaying it with ~10% of estimated monthly free cash
    flow
  * every subscription-category recurring item -> try cancelling it
    (in the absence of real usage-detection from analytics-agent, we treat
    ALL subscriptions as candidates and let the impact/ranking speak for
    itself; a real "unused" signal from `app.analytics.recurring` would
    narrow this list -- see TODO below)
  * if the forecast's first_gap_date falls within 30 days -> try
    `shift_payment_date` (if a plausible near-collision exists) and
    `reduce_category_spend` as gap-mitigation candidates
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.schemas import (
    ActionType,
    CashFlowForecast,
    Debt,
    HealthScore,
    Recommendation,
    RecurringObligation,
    TxnCategory,
)
from app.simulate.engine import ForecastInputs, _free_cash_flow, simulate

_TOP_N_DEFAULT = 5


def _candidate_requests(
    recurring: list[RecurringObligation],
    debts: list[Debt],
    forecast: CashFlowForecast,
) -> list[tuple[ActionType, dict, str]]:
    """Return (action, action_params, rationale) tuples for plausible
    candidate actions given the current state."""
    candidates: list[tuple[ActionType, dict, str]] = []

    monthly_fcf = _free_cash_flow(recurring)
    ten_pct_fcf = max(abs(monthly_fcf) * 0.10, 500.0)

    # TODO(integration): once app.analytics.debt.compare_payoff_strategies
    # is available, use it to pick which debt(s) to prioritise (avalanche
    # order) instead of proposing all of them.
    for debt in debts:
        candidates.append(
            (
                ActionType.prepay_debt,
                {"debt_id": debt.id, "extra_payment": round(ten_pct_fcf, 2)},
                f"Debt on {debt.id} carries {debt.interest_rate_apr:.1f}% APR; "
                f"extra principal payments compound in your favour fastest "
                f"on your highest-rate debt.",
            )
        )

    # TODO(integration): once app.analytics.recurring exposes a real
    # "last used" / "likely unused" signal, filter this to only genuinely
    # unused subscriptions instead of proposing every one.
    for item in recurring:
        if item.category == TxnCategory.subscriptions:
            candidates.append(
                (
                    ActionType.cancel_subscription,
                    {"group_ids": [item.group_id]},
                    f"{item.merchant} (~{abs(item.amount):.0f}/mo) is a recurring "
                    f"subscription; cancelling frees up cash flow immediately.",
                )
            )

    if forecast.first_gap_date is not None:
        days_to_gap = (forecast.first_gap_date - datetime.now(timezone.utc).date()).days
        if 0 <= days_to_gap <= 30:
            # gap-mitigation candidate 1: shift the first outflow-heavy
            # obligation a few days later, if any exist
            outflows = [r for r in recurring if r.amount < 0]
            if outflows:
                target = min(outflows, key=lambda r: r.next_expected_date)
                candidates.append(
                    (
                        ActionType.shift_payment_date,
                        {"group_id": target.group_id, "shift_days": 5},
                        f"A projected cash-flow gap on {forecast.first_gap_date.isoformat()} "
                        f"is within 30 days; shifting {target.merchant}'s payment date by a "
                        f"few days may avoid the collision with other due dates.",
                    )
                )
            # gap-mitigation candidate 2: reduce discretionary spend
            candidates.append(
                (
                    ActionType.reduce_category_spend,
                    {"category": TxnCategory.dining.value, "percent": 25},
                    f"A projected cash-flow gap on {forecast.first_gap_date.isoformat()} "
                    f"is within 30 days; trimming discretionary spend (e.g. dining) by 25% "
                    f"builds a buffer before then.",
                )
            )

    return candidates


def generate_recommendations(
    *,
    recurring: list[RecurringObligation],
    debts: list[Debt],
    health_score: HealthScore,
    forecast: CashFlowForecast,
    forecast_inputs: ForecastInputs,
    top_n: int = _TOP_N_DEFAULT,
) -> list[Recommendation]:
    """Simulate every candidate action and return the top-N ranked by
    |impact.delta| weighted by confidence."""
    candidates = _candidate_requests(recurring, debts, forecast)

    scored: list[tuple[float, Recommendation]] = []
    for action, params, rationale in candidates:
        try:
            result = simulate(
                action,
                params,
                current_forecast_inputs=forecast_inputs,
                current_health_score=health_score.overall,
            )
        except Exception:
            # A candidate that fails to simulate (e.g. bad params for this
            # user's data) is simply skipped rather than surfaced as a
            # broken recommendation.
            continue

        score = abs(result.impact.delta) * result.confidence
        recommendation = Recommendation(
            action=action,
            text=_describe(action, params, result),
            rationale=rationale,
            impact=result.impact,
            confidence=result.confidence,
            action_params=params,
        )
        scored.append((score, recommendation))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [rec for _, rec in scored[:top_n]]


def _describe(action: ActionType, params: dict, result) -> str:
    impact = result.impact
    if action == ActionType.prepay_debt:
        return (
            f"Pay an extra {params.get('extra_payment', 0):.0f}/month toward "
            f"{params.get('debt_id')} -- saves ~{abs(impact.delta):.0f} in interest."
        )
    if action == ActionType.cancel_subscription:
        return (
            f"Cancel subscription(s) {params.get('group_ids')} -- "
            f"+{impact.delta:.0f}/month free cash flow."
        )
    if action == ActionType.shift_payment_date:
        return (
            f"Shift {params.get('group_id')}'s due date by {params.get('shift_days', 0)} day(s) "
            f"-- moves first projected gap by {impact.delta} day(s)."
        )
    if action == ActionType.reduce_category_spend:
        return (
            f"Reduce {params.get('category')} spend by {params.get('percent')}% -- "
            f"saves ~{abs(impact.delta):.0f}/month."
        )
    return f"{action.value}: {impact.metric} changes by {impact.delta}."
