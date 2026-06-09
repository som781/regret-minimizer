"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Decision } from "@/lib/api";
import DecisionCard from "@/components/DecisionCard";

type Filter = "all" | "good" | "regret" | "pending";

export default function TimelinePage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  function load() {
    api.listDecisions().then(setDecisions);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === "all"
    ? decisions
    : decisions.filter((d) => (d.outcome ?? "pending") === filter);

  const counts = {
    all: decisions.length,
    good: decisions.filter((d) => d.outcome === "good").length,
    regret: decisions.filter((d) => d.outcome === "regret").length,
    pending: decisions.filter((d) => !d.outcome).length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-[#1a1a1a] flex flex-col p-4 space-y-6">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white">regret-minimizer</h1>
          <p className="text-xs text-[#555] mt-0.5">your codebase remembers</p>
        </div>
        <nav className="space-y-1">
          <Link href="/" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">
            ○ Ask
          </Link>
          <Link href="/timeline" className="block text-xs text-white bg-[#1a1a1a] px-3 py-2 rounded">
            ◉ Timeline
          </Link>
          <Link href="/insights" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">
            ○ Insights
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Decision Timeline</h2>
            <p className="text-xs text-[#555] mt-1">Every decision logged, and what came of it.</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(["all", "good", "regret", "pending"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  filter === f
                    ? "border-white text-white bg-[#1a1a1a]"
                    : "border-[#222] text-[#666] hover:text-white hover:border-[#444]"
                }`}
              >
                {f} <span className="text-[#444]">({counts[f]})</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#444] text-sm">
              {decisions.length === 0
                ? "No decisions logged yet. Use the sidebar to log your first one."
                : "No decisions match this filter."}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => (
                <DecisionCard key={d.id} decision={d} onUpdated={load} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
