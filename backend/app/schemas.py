"""Single source of truth for API/data contracts shared across all backend
modules (analytics, forecast, simulate, recommend, copilot) and mirrored to
the frontend via generated OpenAPI types.

Do not duplicate these shapes elsewhere -- import from here.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Domain enums
# ---------------------------------------------------------------------------


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit_card"
    loan = "loan"
    investment = "investment"


class TxnCategory(str, Enum):
    income = "income"
    rent_housing = "rent_housing"
    emi_loan = "emi_loan"
    groceries = "groceries"
    dining = "dining"
    transport = "transport"
    utilities = "utilities"
    subscriptions = "subscriptions"
    shopping = "shopping"
    healthcare = "healthcare"
    entertainment = "entertainment"
    investment_sip = "investment_sip"
    credit_card_payment = "credit_card_payment"
    transfer = "transfer"
    fees_interest = "fees_interest"
    other = "other"


class RecurrenceFrequency(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    quarterly = "quarterly"
    annual = "annual"
    irregular = "irregular"


class ActionType(str, Enum):
    cancel_subscription = "cancel_subscription"
    reduce_category_spend = "reduce_category_spend"
    prepay_debt = "prepay_debt"
    increase_sip = "increase_sip"
    build_emergency_fund = "build_emergency_fund"
    refinance_debt = "refinance_debt"
    affordability_check = "affordability_check"
    shift_payment_date = "shift_payment_date"


# ---------------------------------------------------------------------------
# Core entities (mirror DB models, used at the API boundary)
# ---------------------------------------------------------------------------


class Account(BaseModel):
    id: str
    user_id: str
    name: str
    type: AccountType
    balance: float
    credit_limit: Optional[float] = None
    interest_rate_apr: Optional[float] = None
    currency: str = "INR"


class Transaction(BaseModel):
    id: str
    user_id: str
    account_id: str
    date: date
    amount: float  # positive = inflow, negative = outflow
    merchant: str
    category: TxnCategory
    description: Optional[str] = None
    is_recurring: bool = False
    recurring_group_id: Optional[str] = None


class Debt(BaseModel):
    id: str
    user_id: str
    account_id: str
    principal: float
    interest_rate_apr: float
    minimum_payment: float
    due_day_of_month: int


class Income(BaseModel):
    id: str
    user_id: str
    source: str
    amount: float
    frequency: RecurrenceFrequency
    next_date: date


class RecurringObligation(BaseModel):
    group_id: str
    merchant: str
    category: TxnCategory
    amount: float
    frequency: RecurrenceFrequency
    next_expected_date: date
    confidence: float = Field(ge=0, le=1)


class Goal(BaseModel):
    """Mirrors models.GoalRow. Added by analytics-agent for goal-progress
    projection (app.analytics.goals) -- new shape, does not alter any
    existing contract."""

    id: str
    user_id: str
    name: str
    target_amount: float
    target_date: Optional[date] = None
    current_amount: float = 0


# ---------------------------------------------------------------------------
# Health score
# ---------------------------------------------------------------------------


class SubScore(BaseModel):
    name: str
    score: float = Field(ge=0, le=100)
    weight: float
    detail: str


class HealthScore(BaseModel):
    overall: float = Field(ge=0, le=100)
    sub_scores: list[SubScore]
    computed_at: datetime
    trend_30d: Optional[float] = None  # delta vs 30 days ago


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------


class ForecastPoint(BaseModel):
    date: date
    p10: float
    p50: float
    p90: float
    is_gap_risk: bool = False


class CashFlowForecast(BaseModel):
    generated_at: datetime
    horizon_days: int
    points: list[ForecastPoint]
    first_gap_date: Optional[date] = None
    confidence: float = Field(ge=0, le=1)
    basis: str  # human-readable explanation of method/data used


# ---------------------------------------------------------------------------
# The Answer Contract -- facts / predictions / recommendations
# This is the core differentiator: every insight & copilot response uses it.
# ---------------------------------------------------------------------------


class Fact(BaseModel):
    """An observed, verifiable statement grounded in the user's own data."""

    text: str
    value: Optional[float] = None
    source_txn_ids: list[str] = Field(default_factory=list)


class Prediction(BaseModel):
    """A model-derived statement about the future or an inferred pattern."""

    text: str
    value: Optional[float] = None
    range_low: Optional[float] = None
    range_high: Optional[float] = None
    confidence: float = Field(ge=0, le=1)
    basis: str  # what the prediction is derived from


class ImpactEstimate(BaseModel):
    metric: str  # e.g. "monthly free cash flow", "health score"
    before: float
    after: float
    delta: float
    horizon: str  # e.g. "next 30 days", "12 months"


class Recommendation(BaseModel):
    action: ActionType
    text: str
    rationale: str
    impact: ImpactEstimate
    confidence: float = Field(ge=0, le=1)
    action_params: dict = Field(default_factory=dict)


class DataGap(BaseModel):
    text: str
    what_would_help: str


class AnswerContract(BaseModel):
    """The shape every /chat, /recommendations and dashboard-insight response
    conforms to. Frontend renders three lanes (Observed / Predicted /
    Recommended) directly from this."""

    query: Optional[str] = None
    facts: list[Fact] = Field(default_factory=list)
    predictions: list[Prediction] = Field(default_factory=list)
    recommendations: list[Recommendation] = Field(default_factory=list)
    data_gaps: list[DataGap] = Field(default_factory=list)
    narrative: str = ""  # short natural-language summary tying it together


# ---------------------------------------------------------------------------
# Simulation (what-if)
# ---------------------------------------------------------------------------


class SimulationRequest(BaseModel):
    action: ActionType
    action_params: dict = Field(default_factory=dict)


class SimulationResult(BaseModel):
    request: SimulationRequest
    health_score_before: float
    health_score_after: float
    forecast_before: CashFlowForecast
    forecast_after: CashFlowForecast
    impact: ImpactEstimate
    confidence: float = Field(ge=0, le=1)


# ---------------------------------------------------------------------------
# Dashboard aggregate + recompute diff (for the /timeline "what changed" view)
# ---------------------------------------------------------------------------


class DashboardSnapshot(BaseModel):
    user_id: str
    health_score: HealthScore
    net_worth: float
    monthly_income: float
    monthly_expenses: float
    savings_rate: float
    recurring_obligations: list[RecurringObligation]
    debts: list[Debt]
    forecast: CashFlowForecast
    insights: AnswerContract
    generated_at: datetime


class RecomputeDiff(BaseModel):
    """Returned after a new event/transaction is added, so the UI can
    animate exactly what changed and why."""

    trigger: str  # e.g. "added transaction", "new income source"
    health_score_before: float
    health_score_after: float
    forecast_first_gap_before: Optional[date] = None
    forecast_first_gap_after: Optional[date] = None
    new_recommendations: list[Recommendation] = Field(default_factory=list)
    removed_recommendation_actions: list[ActionType] = Field(default_factory=list)
    narrative: str


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    # Additive, backward-compatible: defaults to the demo persona so existing
    # callers that don't send it keep working unchanged.
    user_id: str = "demo-priya"
    # Privacy preference (Security page toggle): when true, never call the
    # Gemini API for this message, regardless of whether a key is configured.
    force_offline: bool = False


ChatRole = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str
    answer: Optional[AnswerContract] = None
    created_at: datetime
