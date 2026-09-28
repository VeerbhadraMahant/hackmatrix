/**
 * TypeScript mirror of backend/app/schemas.py. Hand-written for Phase 0 so
 * the frontend can build against a stable contract immediately; superseded
 * by generated types (openapi-typescript against the live FastAPI schema)
 * once the backend stabilizes -- keep shapes identical in the meantime.
 */

export type AccountType = "checking" | "savings" | "credit_card" | "loan" | "investment";

export type TxnCategory =
  | "income"
  | "rent_housing"
  | "emi_loan"
  | "groceries"
  | "dining"
  | "transport"
  | "utilities"
  | "subscriptions"
  | "shopping"
  | "healthcare"
  | "entertainment"
  | "investment_sip"
  | "credit_card_payment"
  | "transfer"
  | "fees_interest"
  | "other";

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual" | "irregular";

export type ActionType =
  | "cancel_subscription"
  | "reduce_category_spend"
  | "prepay_debt"
  | "increase_sip"
  | "build_emergency_fund"
  | "refinance_debt"
  | "affordability_check"
  | "shift_payment_date";

export interface SubScore {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface HealthScore {
  overall: number;
  sub_scores: SubScore[];
  computed_at: string;
  trend_30d: number | null;
}

export interface ForecastPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
  is_gap_risk: boolean;
}

export interface CashFlowForecast {
  generated_at: string;
  horizon_days: number;
  points: ForecastPoint[];
  first_gap_date: string | null;
  confidence: number;
  basis: string;
}

export interface Fact {
  text: string;
  value: number | null;
  source_txn_ids: string[];
}

export interface Prediction {
  text: string;
  value: number | null;
  range_low: number | null;
  range_high: number | null;
  confidence: number;
  basis: string;
}

export interface ImpactEstimate {
  metric: string;
  before: number;
  after: number;
  delta: number;
  horizon: string;
}

export interface Recommendation {
  action: ActionType;
  text: string;
  rationale: string;
  impact: ImpactEstimate;
  confidence: number;
  action_params: Record<string, unknown>;
}

export interface DataGap {
  text: string;
  what_would_help: string;
}

export interface AnswerContract {
  query: string | null;
  facts: Fact[];
  predictions: Prediction[];
  recommendations: Recommendation[];
  data_gaps: DataGap[];
  narrative: string;
}

export interface RecurringObligation {
  group_id: string;
  merchant: string;
  category: TxnCategory;
  amount: number;
  frequency: RecurrenceFrequency;
  next_expected_date: string;
  confidence: number;
}

export interface Debt {
  id: string;
  user_id: string;
  account_id: string;
  principal: number;
  interest_rate_apr: number;
  minimum_payment: number;
  due_day_of_month: number;
}

export interface DashboardSnapshot {
  user_id: string;
  health_score: HealthScore;
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  recurring_obligations: RecurringObligation[];
  debts: Debt[];
  forecast: CashFlowForecast;
  insights: AnswerContract;
  generated_at: string;
}

export interface RecomputeDiff {
  trigger: string;
  health_score_before: number;
  health_score_after: number;
  forecast_first_gap_before: string | null;
  forecast_first_gap_after: string | null;
  new_recommendations: Recommendation[];
  removed_recommendation_actions: ActionType[];
  narrative: string;
}

export interface SimulationRequest {
  action: ActionType;
  action_params: Record<string, unknown>;
}

export interface SimulationResult {
  request: SimulationRequest;
  health_score_before: number;
  health_score_after: number;
  forecast_before: CashFlowForecast;
  forecast_after: CashFlowForecast;
  impact: ImpactEstimate;
  confidence: number;
}
