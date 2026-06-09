"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Decision, CATEGORIES, CATEGORY_COLORS } from "@/lib/api";
import DecisionCard from "@/components/DecisionCard";

type Filter = "all" | "good" | "regret" | "pending";

const NAV = [["Ask", "/"], ["Timeline", "/timeline"], ["Insights", "/insights"], ["Analytics", "/analytics"]];

export default function TimelinePage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  function load() { api.listDecisions().then(setDecisions); }
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
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-[#1a1a1a] flex flex-col p-4 space-y-6">
        <div>
          <h1 className="text-sm font-semibold text-white">regret-minimizer</h1>
          <p className="text-xs text-[#555] mt-0.5">your codebase remembers</p>
        </div>
        <nav className="space-y-1">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className={`block text-xs px-3 py-2 rounded transition-colors ${href === "/timeline" ? "text-white bg-[#1a1a1a]" : "text-[#666] hover:text-white"}`}>
              {href === "/timeline" ? "◉" : "○"} {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin p-8">
        <div className="max-w-2xl mx-auto space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Decision Timeline</h2>
            <p className="text-xs text-[#555] mt-1">Every decision logged, and what came of it.</p>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
          />

          {/* Outcome filter */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "good", "regret", "pending"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${filter === f ? "border-white text-white bg-[#1a1a1a]" : "border-[#222] text-[#666] hover:text-white hover:border-[#444]"}`}>
                {f} <span className="text-[#444]">({counts[f]})</span>
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCategory("")}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${!category ? "border-white text-white" : "border-[#222] text-[#555] hover:border-[#444]"}`}>
              all categories
            </button>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(category === cat ? "" : cat)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${category === cat ? CATEGORY_COLORS[cat] : "border-[#222] text-[#555] hover:border-[#444]"}`}>
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#444] text-sm">
              {decisions.length === 0 ? "No decisions logged yet." : "No decisions match this filter."}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => <DecisionCard key={d.id} decision={d} onUpdated={load} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
