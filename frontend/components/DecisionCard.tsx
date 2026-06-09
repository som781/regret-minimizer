"use client";

import { useState } from "react";
import { api, type Decision } from "@/lib/api";

const OUTCOME_STYLES = {
  good: "text-green-400 border-green-900 bg-green-950",
  regret: "text-red-400 border-red-900 bg-red-950",
  pending: "text-yellow-500 border-yellow-900 bg-yellow-950",
};

interface Props {
  decision: Decision;
  onUpdated: () => void;
}

export default function DecisionCard({ decision, onUpdated }: Props) {
  const [updating, setUpdating] = useState(false);

  async function setOutcome(outcome: string) {
    setUpdating(true);
    try {
      await api.updateOutcome(decision.id, outcome);
      onUpdated();
    } finally {
      setUpdating(false);
    }
  }

  const outcome = (decision.outcome ?? "pending") as keyof typeof OUTCOME_STYLES;
  const style = OUTCOME_STYLES[outcome] || OUTCOME_STYLES.pending;

  return (
    <div className="border border-[#1a1a1a] rounded-lg p-4 space-y-3 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">{decision.title}</p>
          <p className="text-xs text-[#666] mt-0.5">
            {new Date(decision.created_at).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border ${style} shrink-0`}>
          {outcome}
        </span>
      </div>

      <p className="text-sm text-[#aaa]">{decision.description}</p>

      {decision.reasoning && (
        <p className="text-xs text-[#666] border-l-2 border-[#222] pl-3">{decision.reasoning}</p>
      )}

      {decision.outcome_notes && (
        <p className="text-xs text-[#888] italic">{decision.outcome_notes}</p>
      )}

      {!decision.outcome && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setOutcome("good")}
            disabled={updating}
            className="text-xs px-3 py-1 rounded border border-green-900 text-green-500 hover:bg-green-950 transition-colors disabled:opacity-40"
          >
            ✓ Good call
          </button>
          <button
            onClick={() => setOutcome("regret")}
            disabled={updating}
            className="text-xs px-3 py-1 rounded border border-red-900 text-red-500 hover:bg-red-950 transition-colors disabled:opacity-40"
          >
            ✗ Regret it
          </button>
        </div>
      )}
    </div>
  );
}
