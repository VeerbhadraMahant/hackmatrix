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
  /** false = a real user with no accounts yet; the snapshot is an all-zero placeholder. */
  has_data: boolean;
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

/**
 * Types below mirror the transactions/budgets/goals/net-worth/notifications
 * routers being built by sibling agents in parallel -- not live yet at the
 * time of writing, but shapes are fixed by the shared spec. Additive only.
 */

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  merchant: string;
  category: TxnCategory;
  amount: number;
  account_id: string;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransactionFilters {
  category?: TxnCategory;
  merchant?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TransactionUpdate {
  category?: TxnCategory;
  merchant?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: TxnCategory;
  monthly_limit: number;
}

export interface CreateBudgetRequest {
  category: TxnCategory;
  monthly_limit: number;
}

export type BudgetHealth = "under" | "near" | "over";

export interface BudgetStatus {
  category: TxnCategory;
  monthly_limit: number;
  spent_so_far: number;
  remaining: number;
  percent_used: number;
  status: BudgetHealth;
}

export interface SafeToSpend {
  amount: number;
  basis: string;
  as_of_date: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  current_amount: number;
}

export interface GoalProgress {
  goal: Goal;
  monthly_contribution: number;
  projected_completion_date: string | null;
  on_track: boolean;
  months_remaining: number | null;
}

export interface CreateGoalRequest {
  name: string;
  target_amount: number;
  target_date?: string | null;
  current_amount?: number;
}

export interface UpdateGoalRequest {
  current_amount?: number;
  target_date?: string | null;
  target_amount?: number;
}

export interface NetWorthPoint {
  date: string;
  net_worth: number;
}

export interface NetWorthHistory {
  points: NetWorthPoint[];
  current: number;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  balance: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  credit_limit: number | null;
  interest_rate_apr: number | null;
  currency: string;
}

export type NotificationType = "anomaly" | "recommendation" | "upcoming_bill" | "cash_flow_gap";
export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  text: string;
  date: string;
  source_ref: string | null;
}
