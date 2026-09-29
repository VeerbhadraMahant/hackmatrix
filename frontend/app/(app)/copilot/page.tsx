"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/hooks";
import { getOfflineOnly, setOfflineOnly } from "@/lib/user";
import type { AnswerContract } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AnswerContractView } from "@/components/AnswerContractView";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Can I afford a ₹60,000 phone next month?",
  "Why is my health score low?",
  "What is the best strategy to eliminate credit card debt?",
  "Is there a projected cash deficit in the next 90 days?",
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

  // Switching persona via the NavShell switcher resets conversation
  const [lastUserId, setLastUserId] = useState(userId);
  if (userId !== lastUserId) {
    setLastUserId(userId);
    setTurns([]);
    setError(null);
    setInput("");
  }

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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.04]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink">
              Financial Copilot
            </h1>
            <span className="flex h-2 w-2 rounded-full bg-ember animate-pulse" />
          </div>
          <p className="mt-1 text-xs sm:text-sm text-graphite">
            Grounded in your real transactions. Delivers clear, verifiable 3-lane answers.
          </p>
        </div>

        {/* Offline Mode Toggle */}
        <label className="flex shrink-0 items-center gap-2 rounded-full border border-black/[0.08] bg-fog/80 px-3 py-1.5 text-xs text-graphite shadow-sm cursor-pointer hover:bg-fog transition-colors">
          <input
            type="checkbox"
            defaultChecked={getOfflineOnly()}
            onChange={(e) => setOfflineOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-black/20 accent-ember cursor-pointer"
          />
          <span className="font-medium">Offline Rule-Engine Only</span>
        </label>
      </div>

      {/* Suggested Starter Prompts */}
      {turns.length === 0 && (
        <div className="flex flex-col gap-3 py-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-pewter">
            Suggested Inquiries for {userId.replace("demo-", "")}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="flex items-center justify-between text-left p-3.5 rounded-chip border border-black/[0.08] bg-white hover:bg-fog hover:border-black/[0.14] text-xs font-medium text-ink transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-[0.99] group"
              >
                <span>{p}</span>
                <span className="text-pewter group-hover:text-ember group-hover:translate-x-0.5 transition-all">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      <div className="flex flex-col gap-6 min-h-[300px]">
        <AnimatePresence initial={false}>
          {turns.map((t, i) =>
            t.role === "user" ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="ml-auto max-w-[85%] sm:max-w-[75%] flex flex-col items-end"
              >
                <div className="rounded-2xl rounded-br-sm bg-ink text-white px-4 py-3 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                  {t.message}
                </div>
                <span className="text-[10px] text-pewter mt-1 px-1">You</span>
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1.5 w-full"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ember text-white text-[11px] font-bold shadow-sm">
                    F
                  </div>
                  <span className="text-xs font-semibold text-ink">FinPilot Copilot</span>
                  <span className="text-[10px] text-pewter">Three-lane verified answer</span>
                </div>
                <Card className="p-5 sm:p-7 shadow-sm">
                  {t.answer && <AnswerContractView answer={t.answer} />}
                </Card>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Loading Indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-chip border border-black/[0.06] bg-fog/60 self-start"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ember text-white text-[11px] font-bold animate-pulse">
              F
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-graphite">
                Analyzing transactions & cash-flow models...
              </span>
              <span className="flex gap-1 ml-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ember animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-ember animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-ember animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          </motion.div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-chip border border-rose-200 bg-rose-50/60 text-xs text-rose-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>Could not reach copilot: {error}</span>
          </div>
        )}
      </div>

      {/* Floating Query Input Bar */}
      <div className="sticky bottom-4 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm">
        <form
          className="flex items-center gap-2 p-1.5 rounded-2xl border border-black/[0.1] bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about spending, debts, forecast gaps, or affordability..."
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-ink outline-none placeholder:text-pewter"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold shrink-0"
          >
            Ask Copilot
          </Button>
        </form>
        <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-pewter">
          <span>Every number is grounded in your actual database records</span>
          <span>Press Enter ↵ to send</span>
        </div>
      </div>
    </div>
  );
}
