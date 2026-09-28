import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    title: "One consolidated view",
    body: "Accounts, recurring obligations, debts, and a cash-flow forecast in a single screen -- no more piecing it together from five apps.",
  },
  {
    title: "Ask anything",
    body: "A copilot that answers in plain language, grounded in your actual transactions -- not generic financial advice.",
  },
  {
    title: "See the impact, not just the advice",
    body: "Every recommendation shows a before -> after: what changes, by how much, and over what horizon.",
  },
  {
    title: "Facts vs predictions vs recommendations, always labeled",
    body: "Observed data, forward-looking estimates, and suggested actions never blur into one confident-sounding paragraph.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-4 py-16 sm:px-8 sm:py-24">
        <h1 className="font-display max-w-2xl text-4xl leading-tight text-ink sm:text-6xl">
          Your financial health, explained -- not just reported.
        </h1>
        <p className="max-w-xl text-lg text-graphite">
          FinPilot reads your transactions, forecasts your cash flow, and tells you what to do about it --
          with every claim labeled as observed, predicted, or recommended.
        </p>
        <Link href="/dashboard">
          <Button variant="primary" size="md" className="px-6 py-3 text-base">
            Open demo
          </Button>
        </Link>
      </section>

      <section className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-4 py-16 sm:grid-cols-2 sm:px-8">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <h2 className="text-base font-semibold text-ink">{f.title}</h2>
            <p className="mt-2 text-sm text-graphite">{f.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-8">
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
    </div>
  );
}
