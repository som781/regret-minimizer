"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Decision, CATEGORIES, CATEGORY_COLORS } from "@/lib/api";
import Layout from "@/components/Layout";
import DecisionCard from "@/components/DecisionCard";

type Filter = "all" | "good" | "regret" | "pending";

export default function TimelinePage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    api.listDecisions().then(setDecisions).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const filtered = decisions.filter((d) => {
    const matchOutcome = filter === "all" || (d.outcome ?? "pending") === filter;
    const matchCategory = !category || d.category === category;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    return matchOutcome && matchCategory && matchSearch;
  });

  const counts = {
    all: decisions.length,
    good: decisions.filter((d) => d.outcome === "good").length,
    regret: decisions.filter((d) => d.outcome === "regret").length,
    pending: decisions.filter((d) => !d.outcome).length,
  };

  return (
    <Layout active="timeline">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white">Decision Timeline</h2>
            <p className="text-xs text-[#444] mt-0.5">Every decision logged, and what came of it.</p>
          </div>

          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm placeholder-[#2e2e2e] focus:outline-none focus:border-[#2e2e2e] transition-colors" />

          {/* Outcome filter */}
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "good", "regret", "pending"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filter === f ? "border-[#444] text-white bg-white/5" : "border-[#1e1e1e] text-[#444] hover:text-[#888] hover:border-[#2a2a2a]"}`}>
                {f} <span className="opacity-40">({counts[f]})</span>
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCategory("")}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${!category ? "border-[#444] text-white" : "border-[#1e1e1e] text-[#3a3a3a] hover:border-[#2a2a2a]"}`}>
              all
            </button>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(category === cat ? "" : cat)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${category === cat ? CATEGORY_COLORS[cat] : "border-[#1e1e1e] text-[#3a3a3a] hover:border-[#2a2a2a]"}`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-[#2e2e2e] text-sm">
                {decisions.length === 0 ? "No decisions logged yet." : "No decisions match this filter."}
              </p>
              {decisions.length === 0 && (
                <button onClick={() => router.push("/")}
                  className="text-xs text-[#444] border border-[#1e1e1e] rounded-md px-3 py-1.5 hover:border-[#2e2e2e] hover:text-[#888] transition-colors">
                  Ask the agent to get started →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => <DecisionCard key={d.id} decision={d} onUpdated={load} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
