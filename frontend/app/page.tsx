import type { ReactElement, SVGProps } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StatTile } from "@/components/ui/StatTile";
import { AnswerContractView } from "@/components/AnswerContractView";
import type { AnswerContract } from "@/lib/types";

/**
 * Illustrative AnswerContract for the live-product-preview section below --
 * hand-built, plausible numbers, rendered through the *real*
 * AnswerContractView component so visitors see FinPilot's actual UI (not a
 * mockup screenshot) before opening the demo.
 */
const PREVIEW_ANSWER: AnswerContract = {
  query: "Can I afford to increase my SIP by ₹3,000/month?",
  narrative:
    "Yes, with room to spare -- your free cash flow comfortably covers the increase, and it meaningfully improves your 12-month trajectory.",
  facts: [
    { text: "Average monthly free cash flow over the last 90 days is ₹18,400.", value: null, source_txn_ids: [] },
    { text: "Current SIP contribution is ₹6,000/month across 2 funds.", value: null, source_txn_ids: [] },
  ],
  predictions: [
    {
      text: "Projected free cash flow next month, after fixed obligations",
      value: 17200,
      range_low: 14800,
      range_high: 19600,
      confidence: 0.81,
      basis: "90-day rolling average, adjusted for known upcoming bills",
    },
  ],
  recommendations: [
    {
      action: "increase_sip",
      text: "Increase SIP by ₹3,000/month",
      rationale: "Stays well within your observed cash-flow buffer even in a below-average month.",
      impact: { metric: "Net worth (5yr projected)", before: 842000, after: 1024000, delta: 182000, horizon: "5 years" },
      confidence: 0.78,
      action_params: {},
    },
  ],
  data_gaps: [],
};

const FEATURES: { title: string; body: string; icon: (p: SVGProps<SVGSVGElement>) => ReactElement }[] = [
  {
    title: "One consolidated view",
    body: "Accounts, recurring obligations, debts, and a cash-flow forecast in a single screen -- no more piecing it together from five apps.",
    icon: IconGrid,
  },
  {
    title: "Ask anything",
    body: "A copilot that answers in plain language, grounded in your actual transactions -- not generic financial advice.",
    icon: IconChat,
  },
  {
    title: "Expected-impact simulation",
    body: "Try a decision before you make it -- prepay a debt, raise a SIP, cancel a subscription -- and see the before/after forecast.",
    icon: IconSliders,
  },
  {
    title: "Facts, predictions, and recommendations -- always separated",
    body: "Observed data, forward-looking estimates, and suggested actions never blur into one confident-sounding paragraph.",
    icon: IconLayers,
  },
  {
    title: "Budgets & safe-to-spend",
    body: "Category budgets that account for what's already committed, so \"safe to spend\" actually means safe to spend.",
    icon: IconWallet,
  },
  {
    title: "Goals tracking",
    body: "Set a target and see, in plain terms, whether you're on pace -- with the specific actions that would close the gap.",
    icon: IconTarget,
  },
  {
    title: "Net worth over time",
    body: "Assets and debts rolled into one trend line, so progress (or drift) is visible at a glance.",
    icon: IconTrend,
  },
];

const STEPS = [
  {
    n: "01",
    title: "See your full picture",
    body: "Connect your accounts and FinPilot builds one consolidated view of balances, obligations, and debts.",
  },
  {
    n: "02",
    title: "Ask anything",
    body: "Ask a plain-language question about your money and get an answer grounded in your real transactions.",
  },
  {
    n: "03",
    title: "Act with confidence, not guesswork",
    body: "Every recommendation ships with its expected impact and a confidence score, so you know exactly what you're deciding.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-display max-w-xl text-4xl leading-tight text-ink sm:text-6xl">
            Your financial health, explained -- not just reported.
          </h1>
          <p className="max-w-lg text-lg text-graphite">
            FinPilot reads your transactions, forecasts your cash flow, and tells you what to do about it --
            with every claim labeled as observed, predicted, or recommended.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard">
              <Button variant="primary" size="md" className="px-6 py-3 text-base">
                Open demo
              </Button>
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-graphite underline-offset-4 hover:text-ink hover:underline">
              See how it works
            </a>
          </div>
        </div>

        <HeroPreview />
      </section>

      {/* Problem framing */}
      <section className="border-y border-mist bg-fog">
        <div className="mx-auto w-full max-w-[900px] px-4 py-12 text-center sm:px-8 sm:py-16">
          <p className="text-lg leading-relaxed text-graphite">
            Your money lives in five places at once -- a checking account, a couple of cards, a loan, maybe an
            investment app -- and none of them talk to each other. You&apos;re left manually reconstructing your own
            financial picture just to answer a simple question: <span className="text-ink">am I okay?</span>
          </p>
        </div>
      </section>

      {/* Live product preview */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <SectionHeading
          eyebrow="The actual product"
          title="See a real answer, not a marketing screenshot"
          body="This is the same AnswerContractView component that renders every insight in the dashboard and copilot -- shown here with an illustrative question and plausible numbers."
        />
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>{PREVIEW_ANSWER.query}</CardTitle>
          </CardHeader>
          <AnswerContractView answer={PREVIEW_ANSWER} />
        </Card>
        <p className="mt-3 text-xs text-pewter">Illustrative data for demonstration -- open the demo to see your own.</p>
      </section>

      {/* Feature grid */}
      <section className="border-t border-mist bg-fog">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
          <SectionHeading
            eyebrow="What's inside"
            title="Everything you need for one honest view of your finances"
          />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="flex flex-col gap-3 bg-paper">
                <f.icon className="h-6 w-6 text-ink" aria-hidden />
                <h3 className="text-base font-semibold text-ink">{f.title}</h3>
                <p className="text-sm text-graphite">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <SectionHeading eyebrow="How it works" title="Three steps from scattered to clear" />
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col gap-2">
              <span className="font-display text-3xl text-mist">{s.n}</span>
              <h3 className="text-base font-semibold text-ink">{s.title}</h3>
              <p className="text-sm text-graphite">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / differentiation */}
      <section className="border-t border-mist bg-carbon text-paper">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel">Our specific promise</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl leading-tight sm:text-4xl">
            Facts, predictions, and recommendations never blur into one confident paragraph.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <LaneExplainer dot="bg-paper" title="Observed" body="What the data shows -- drawn directly from your transactions, nothing inferred." />
            <LaneExplainer dot="bg-steel" title="Predicted" body="Our best estimate, always shown with a confidence score and a likely range -- never a bare number." />
            <LaneExplainer dot="bg-ember" title="Recommended" body="A suggested action with its expected before/after impact, so you can judge it before you act on it." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <Card className="flex flex-col items-start gap-4 bg-fog">
          <h2 className="font-display text-2xl text-ink">See it on real fixture data, right now.</h2>
          <p className="max-w-lg text-sm text-graphite">
            No signup required -- the demo runs against a sample profile so you can see the full picture
            immediately.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">Open demo</Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-mist">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-1 px-4 py-8 text-xs text-pewter sm:px-8">
          <span className="font-display text-sm text-ink">FinPilot</span>
          <span>A demo project -- not a real financial product.</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-pewter">{eyebrow}</p>
      <h2 className="font-display mt-3 text-2xl text-ink sm:text-3xl">{title}</h2>
      {body ? <p className="mt-3 text-sm text-graphite sm:text-base">{body}</p> : null}
    </div>
  );
}

function LaneExplainer({ dot, title, body }: { dot: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
        <span className="text-sm font-semibold uppercase tracking-wide text-paper">{title}</span>
      </div>
      <p className="text-sm text-steel">{body}</p>
    </div>
  );
}

/**
 * Static, illustrative rendering of the health-score stat + a forecast
 * sparkline for the hero -- built from real primitives (StatTile, Chip) with
 * plausible numbers, not a screenshot, so the hero shows the product rather
 * than only describing it. Deliberately not the live ForecastChart (which
 * needs client-side recharts + real data) -- this stays a lightweight static
 * SVG so the hero renders instantly with zero network dependency.
 */
function HeroPreview() {
  return (
    <Card className="relative flex flex-col gap-6 bg-fog">
      <div className="flex items-center justify-between">
        <CardTitle>Health score</CardTitle>
        <Chip tone="outline">Illustrative</Chip>
      </div>
      <div className="flex items-end gap-6">
        <StatTile label="Overall" value="74" sub="/ 100" />
        <span className="mb-1 text-sm font-medium text-ember-dark">&uarr; 3.2 pts / 30d</span>
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-pewter">Cash-flow forecast</p>
        <svg viewBox="0 0 300 90" className="h-20 w-full" role="img" aria-label="Illustrative rising cash-flow forecast">
          <polygon
            points="0,60 30,55 60,62 90,48 120,52 150,38 180,42 210,28 240,32 270,18 300,22 300,90 0,90"
            fill="var(--color-mist)"
            opacity="0.35"
          />
          <polyline
            points="0,50 30,46 60,52 90,40 120,44 150,32 180,36 210,24 240,28 270,14 300,18"
            fill="none"
            stroke="var(--color-ember)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <p className="text-xs text-pewter">No shortfall projected in this horizon.</p>
    </Card>
  );
}

function IconGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

function IconChat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M4 5h16v11H9l-4 4V16H4V5z" strokeLinejoin="round" />
    </svg>
  );
}

function IconSliders(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M4 6h10M18 6h2M4 18h2M8 18h12M4 12h6M14 12h6" strokeLinecap="round" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </svg>
  );
}

function IconLayers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" />
      <path d="M3 13l9 5 9-5" strokeLinejoin="round" />
    </svg>
  );
}

function IconWallet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTrend(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
