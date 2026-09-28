"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/hooks";
import type { AnswerContract } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AnswerContractView } from "@/components/AnswerContractView";

const EXAMPLE_PROMPTS = [
  "Can I afford a ₹60,000 phone next month?",
  "Why is my score low?",
  "What should I do about my credit card?",
];

interface Turn {
  role: "user" | "assistant";
  message: string;
  answer?: AnswerContract;
}

export default function CopilotPage() {
  const userId = useUserId();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(message: string) {
    if (!message.trim() || loading) return;
    setError(null);
    setInput("");
    setTurns((t) => [...t, { role: "user", message }]);
    setLoading(true);
    try {
      const answer = await api.chat(message, userId);
      setTurns((t) => [...t, { role: "assistant", message, answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Copilot</h1>
        <p className="mt-1 text-sm text-graphite">
          Ask about your finances. Every answer separates what&apos;s observed, predicted, and recommended.
        </p>
      </div>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((p) => (
            <Button key={p} variant="secondary" size="sm" onClick={() => send(p)}>
              {p}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-auto max-w-[80%] rounded-surface bg-fog px-4 py-2 text-sm text-ink">
              {t.message}
            </div>
          ) : (
            <Card key={i}>{t.answer && <AnswerContractView answer={t.answer} />}</Card>
          )
        )}
        {loading && <p className="text-sm text-pewter">Thinking...</p>}
        {error && <p className="text-sm text-ink">Could not reach the copilot: {error}</p>}
      </div>

      <form
        className="sticky bottom-0 flex gap-2 border-t border-mist bg-paper pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          className="flex-1 rounded-chip border border-mist px-4 py-2 text-sm outline-none focus:border-ink"
        />
        <Button type="submit" variant="primary" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
