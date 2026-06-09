"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Insights, type Repo } from "@/lib/api";

export default function InsightsPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    api.listRepos().then((r) => {
      setRepos(r);
      if (r.length > 0) setSelectedRepo(r[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      api.getInsights(selectedRepo.id).then(setInsights);
    }
  }, [selectedRepo]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-[#1a1a1a] flex flex-col p-4 space-y-6">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white">regret-minimizer</h1>
          <p className="text-xs text-[#555] mt-0.5">your codebase remembers</p>
        </div>
        <nav className="space-y-1">
          <Link href="/" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">○ Ask</Link>
          <Link href="/timeline" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">○ Timeline</Link>
          <Link href="/insights" className="block text-xs text-white bg-[#1a1a1a] px-3 py-2 rounded">◉ Insights</Link>
          <Link href="/analytics" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">○ Analytics</Link>
        </nav>

        {repos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[#666] uppercase tracking-widest">Repo</p>
            {repos.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRepo(r)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedRepo?.id === r.id
                    ? "bg-[#1a1a1a] text-white border border-[#333]"
                    : "text-[#888] hover:text-white hover:bg-[#111]"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-white">Insights</h2>
            <p className="text-xs text-[#555] mt-1">Patterns detected from git history and logged decisions.</p>
          </div>

          {!insights ? (
            <p className="text-[#444] text-sm">
              {repos.length === 0 ? "Connect a repo to see insights." : "Loading…"}
            </p>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Commits" value={insights.commits.total} />
                <StatCard
                  label="Revert Rate"
                  value={`${insights.commits.revert_rate}%`}
                  warn={insights.commits.revert_rate > 5}
                />
                <StatCard label="Major Rewrites" value={insights.commits.significant_changes} />
                <StatCard
                  label="Fix Commits"
                  value={insights.commits.fix_commits}
                  warn={insights.commits.total > 0 && insights.commits.fix_commits / insights.commits.total > 0.2}
                />
                <StatCard label="Decisions Logged" value={insights.decisions.total} />
                <StatCard
                  label="Regret Rate"
                  value={
                    insights.decisions.total > 0
                      ? `${Math.round((insights.decisions.regretted / insights.decisions.total) * 100)}%`
                      : "—"
                  }
                  warn={insights.decisions.total > 0 && insights.decisions.regretted / insights.decisions.total > 0.3}
                />
              </div>

              {/* Decision breakdown */}
              {insights.decisions.total > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#666] uppercase tracking-widest">Decision Outcomes</p>
                  <div className="h-3 rounded overflow-hidden flex">
                    <div
                      className="bg-green-700"
                      style={{ width: `${(insights.decisions.good / insights.decisions.total) * 100}%` }}
                    />
                    <div
                      className="bg-red-800"
                      style={{ width: `${(insights.decisions.regretted / insights.decisions.total) * 100}%` }}
                    />
                    <div
                      className="bg-[#333]"
                      style={{ width: `${(insights.decisions.pending / insights.decisions.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-[#666]">
                    <span><span className="text-green-500">■</span> Good ({insights.decisions.good})</span>
                    <span><span className="text-red-500">■</span> Regret ({insights.decisions.regretted})</span>
                    <span><span className="text-[#555]">■</span> Pending ({insights.decisions.pending})</span>
                  </div>
                </div>
              )}

              {/* Patterns */}
              {insights.patterns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#666] uppercase tracking-widest">Detected Patterns</p>
                  <div className="space-y-2">
                    {insights.patterns.map((p, i) => (
                      <div key={i} className="flex gap-3 items-start bg-[#111] border border-[#1a1a1a] rounded px-4 py-3">
                        <span className="text-yellow-600 shrink-0 mt-0.5">⚠</span>
                        <p className="text-sm text-[#aaa] flex-1">{p}</p>
                        <button
                          onClick={() => router.push(`/?q=${encodeURIComponent(`${p} — what should we do about this?`)}`)}
                          className="shrink-0 text-xs text-[#555] border border-[#222] rounded px-2 py-0.5 hover:text-white hover:border-[#444] transition-colors whitespace-nowrap">
                          Ask →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.patterns.length === 0 && insights.decisions.total === 0 && (
                <p className="text-[#444] text-sm">
                  No patterns yet. Connect a repo and log decisions to start seeing patterns.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${warn ? "border-yellow-900 bg-yellow-950/20" : "border-[#1a1a1a]"}`}>
      <p className="text-xs text-[#666]">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? "text-yellow-500" : "text-white"}`}>{value}</p>
    </div>
  );
}
