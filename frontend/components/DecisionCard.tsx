"use client";

import { useState } from "react";
import { api, type Decision, CATEGORY_COLORS } from "@/lib/api";
import { useToast } from "@/components/Toast";

const OUTCOME_STYLES = {
  good: "text-green-500 border-green-900/60 bg-green-950/20",
  regret: "text-red-400 border-red-900/60 bg-red-950/20",
  pending: "text-[#666] border-[#2a2a2a] bg-[#141414]",
};

export default function DecisionCard({ decision, onUpdated }: { decision: Decision; onUpdated: () => void }) {
  const [updating, setUpdating] = useState(false);
  const toast = useToast();

  async function setOutcome(outcome: string) {
    setUpdating(true);
    try {
      await api.updateOutcome(decision.id, outcome);
      onUpdated();
      toast(outcome === "good" ? "Marked as good call." : "Marked as regret.", outcome === "good" ? "success" : "info");
    } catch {
      toast("Failed to update.", "error");
    } finally {
      setUpdating(false);
    }
  }

  const outcome = (decision.outcome ?? "pending") as keyof typeof OUTCOME_STYLES;

  return (
    <div className="border border-[#1e1e1e] bg-[#141414]/50 rounded-xl p-4 space-y-3 hover:border-[#252525] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-medium text-[#e8e8e8] leading-snug">{decision.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] text-[#3a3a3a]">
              {new Date(decision.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
            {decision.category && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[decision.category] ?? CATEGORY_COLORS.other}`}>
                {decision.category}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-md border shrink-0 ${OUTCOME_STYLES[outcome]}`}>
          {outcome}
        </span>
      </div>

      <p className="text-sm text-[#888] leading-relaxed">{decision.description}</p>

      {decision.reasoning && (
        <p className="text-xs text-[#444] border-l border-[#1e1e1e] pl-3 leading-relaxed">{decision.reasoning}</p>
      )}

      {decision.outcome_notes && (
        <p className="text-xs text-[#555] italic">{decision.outcome_notes}</p>
      )}

      {!decision.outcome && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => setOutcome("good")} disabled={updating}
            className="text-xs px-3 py-1.5 rounded-md border border-green-900/50 text-green-600 hover:bg-green-950/20 disabled:opacity-30 transition-colors">
            ✓ Good call
          </button>
          <button onClick={() => setOutcome("regret")} disabled={updating}
            className="text-xs px-3 py-1.5 rounded-md border border-red-900/50 text-red-500/80 hover:bg-red-950/20 disabled:opacity-30 transition-colors">
            ✗ Regret it
          </button>
        </div>
      )}
    </div>
  );
}
