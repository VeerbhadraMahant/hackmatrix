"""Merchant -> TxnCategory categorization.

Primary path: fast rules/dictionary matching on merchant name (substring /
regex) covering common Indian merchants, plus a couple of generic amount
heuristics (e.g. EMI-shaped merchant names).

Fallback path (only used when `get_settings().has_gemini` is true): embed the
merchant name with the configured Gemini embedding model and compare via
cosine similarity against a small in-process cache of seed-example
embeddings. Degrades to `TxnCategory.other` on any error, timeout, or missing
key -- this function must never raise.
"""
from __future__ import annotations

import math
import re
import threading

from app.core.config import get_settings
from app.schemas import TxnCategory

# ---------------------------------------------------------------------------
# Rule-based matcher
# ---------------------------------------------------------------------------

# Ordered (pattern, category) list; first match wins. Patterns are matched
# case-insensitively against the merchant string (substring, via regex).
_RULES: list[tuple[re.Pattern, TxnCategory]] = [
    # Income
    (re.compile(r"salary|payroll|infosys|tcs payroll|wipro payroll|neft.*salary", re.I), TxnCategory.income),
    # Rent / housing
    (re.compile(r"rent|lease|landlord|apartments?|nobroker|nestaway|prestige lakeview", re.I), TxnCategory.rent_housing),
    # EMI / loans
    (re.compile(r"\bemi\b|home loan|auto loan|car loan|student loan|loan emi|hdfc.*loan|sbi.*loan|bajaj finserv", re.I), TxnCategory.emi_loan),
    # Groceries
    (re.compile(r"bigbasket|blinkit|zepto|dmart|grofers|more retail|reliance fresh|nature'?s basket|grocery", re.I), TxnCategory.groceries),
    # Dining
    (re.compile(r"swiggy|zomato|dominos|pizza hut|starbucks|cafe coffee day|ccd|barbeque nation|mcdonald|kfc|burger king|restaurant|eatery|dining", re.I), TxnCategory.dining),
    # Transport
    (re.compile(r"\buber\b|\bola\b|rapido|irctc|indigo|spicejet|vistara|metro rail|bmtc|best bus|petrol|fuel|hpcl|indian oil|bharat petroleum|fastag", re.I), TxnCategory.transport),
    # Utilities
    (re.compile(r"bescom|mseb|adani electricity|tata power|electricity|broadband|jio fiber|airtel (?!fiber)?.*(recharge|postpaid)|water bill|gas cylinder|indane|piped gas", re.I), TxnCategory.utilities),
    # Subscriptions
    (re.compile(r"netflix|spotify|hotstar|disney\+|amazon prime video|prime video|youtube premium|apple music|jio ?cinema|sonyliv|zee5|gym membership|cult\.?fit", re.I), TxnCategory.subscriptions),
    # Shopping
    (re.compile(r"amazon(?!.*prime video)|flipkart|myntra|ajio|nykaa|meesho|croma|reliance digital|decathlon", re.I), TxnCategory.shopping),
    # Healthcare
    (re.compile(r"apollo pharmacy|pharmeasy|1mg|netmeds|practo|hospital|clinic|diagnostic|pathlab|medplus", re.I), TxnCategory.healthcare),
    # Entertainment
    (re.compile(r"pvr|inox|bookmyshow|cinema|theatre|movie", re.I), TxnCategory.entertainment),
    # Investment / SIP
    (re.compile(r"zerodha|groww|coin sip|mutual fund|sip -|upstox|kuvera|nps contribution|ppf", re.I), TxnCategory.investment_sip),
    # Credit card payment
    (re.compile(r"credit card (payment|bill)|cc bill payment|card payment received", re.I), TxnCategory.credit_card_payment),
    # Transfer
    (re.compile(r"neft|imps|upi transfer|self transfer|fund transfer|atm withdrawal", re.I), TxnCategory.transfer),
    # Fees / interest
    (re.compile(r"late fee|interest charged|finance charge|annual fee|penal(ty|ty charge)|overdraft fee", re.I), TxnCategory.fees_interest),
    # School fees (recurring, treat as rent_housing-adjacent obligation -> "other" bucket has no schema slot,
    # closest fit in TxnCategory is "other" unless clearly EMI-like; keep explicit for clarity)
    (re.compile(r"school fees?|tuition fee|vidya", re.I), TxnCategory.other),
]


def _rule_match(merchant: str) -> TxnCategory | None:
    for pattern, category in _RULES:
        if pattern.search(merchant):
            return category
    return None


def _amount_heuristic(merchant: str, amount: float) -> TxnCategory | None:
    """Generic heuristics that don't depend on merchant vocabulary."""
    m = merchant.lower()
    if "emi" in m or "loan" in m:
        return TxnCategory.emi_loan
    return None


# ---------------------------------------------------------------------------
# Gemini-embedding fallback (optional, in-process cache)
# ---------------------------------------------------------------------------

# Small seed set: example merchant strings mapped to their category. Used to
# build a one-time reference embedding matrix; unseen merchants are matched
# to the nearest seed by cosine similarity.
_SEED_EXAMPLES: dict[str, TxnCategory] = {
    "Swiggy Instamart": TxnCategory.dining,
    "Zomato order": TxnCategory.dining,
    "BigBasket grocery order": TxnCategory.groceries,
    "Uber trip": TxnCategory.transport,
    "Indian Oil petrol pump": TxnCategory.transport,
    "Netflix subscription": TxnCategory.subscriptions,
    "Electricity board bill payment": TxnCategory.utilities,
    "Amazon.in shopping order": TxnCategory.shopping,
    "Apollo Pharmacy medicine order": TxnCategory.healthcare,
    "PVR Cinemas ticket": TxnCategory.entertainment,
    "Zerodha Coin SIP": TxnCategory.investment_sip,
    "HDFC home loan EMI": TxnCategory.emi_loan,
    "Monthly house rent": TxnCategory.rent_housing,
    "Credit card bill payment": TxnCategory.credit_card_payment,
    "NEFT fund transfer": TxnCategory.transfer,
    "Late payment fee": TxnCategory.fees_interest,
    "Salary credit": TxnCategory.income,
}

_SIMILARITY_THRESHOLD = 0.72

_embedding_cache: dict[str, list[float]] = {}
_seed_matrix_ready = False
_cache_lock = threading.Lock()


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _get_gemini_client():
    from google import genai  # imported lazily so tests without the package/key never hit this

    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


def _embed(text: str) -> list[float] | None:
    """Embed one string via Gemini; returns None on any failure."""
    try:
        settings = get_settings()
        client = _get_gemini_client()
        resp = client.models.embed_content(model=settings.gemini_embed_model, contents=text)
        if resp.embeddings:
            return list(resp.embeddings[0].values)
    except Exception:
        return None
    return None


def _ensure_seed_matrix() -> None:
    global _seed_matrix_ready
    if _seed_matrix_ready:
        return
    with _cache_lock:
        if _seed_matrix_ready:
            return
        for example in _SEED_EXAMPLES:
            if example not in _embedding_cache:
                vec = _embed(example)
                if vec is not None:
                    _embedding_cache[example] = vec
        _seed_matrix_ready = True


def _gemini_fallback(merchant: str) -> TxnCategory:
    try:
        _ensure_seed_matrix()
        if not _embedding_cache:
            return TxnCategory.other
        vec = _embedding_cache.get(merchant) or _embed(merchant)
        if vec is None:
            return TxnCategory.other
        _embedding_cache[merchant] = vec

        best_category: TxnCategory | None = None
        best_score = -1.0
        for example, category in _SEED_EXAMPLES.items():
            example_vec = _embedding_cache.get(example)
            if example_vec is None:
                continue
            score = _cosine(vec, example_vec)
            if score > best_score:
                best_score = score
                best_category = category
        if best_category is not None and best_score >= _SIMILARITY_THRESHOLD:
            return best_category
    except Exception:
        pass
    return TxnCategory.other


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def categorize(merchant: str, amount: float = 0.0) -> TxnCategory:
    """Return the best-guess TxnCategory for a merchant/amount pair.

    Never raises -- worst case returns TxnCategory.other.
    """
    if not merchant:
        return TxnCategory.other

    matched = _rule_match(merchant)
    if matched is not None:
        return matched

    matched = _amount_heuristic(merchant, amount)
    if matched is not None:
        return matched

    settings = get_settings()
    if settings.has_gemini:
        return _gemini_fallback(merchant)

    return TxnCategory.other
