"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Insights, type Repo } from "@/lib/api";
import Layout from "@/components/Layout";

function RepoSelector({ repos, selected, onSelect }: { repos: Repo[]; selected: Repo | null; onSelect: (r: Repo) => void }) {
  if (!repos.length) return null;
  return (
    <div className="space-y-1 py-3 px-1">
      <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest px-1 mb-2">Repo</p>
      {repos.map((r) => (
        <button key={String(r.id)} onClick={() => onSelect(r)}
          className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${selected?.id === r.id ? "bg-white/5 text-white" : "text-[#555] hover:text-[#ccc] hover:bg-white/[0.03]"}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected?.id === r.id ? "bg-green-500" : "bg-[#2a2a2a]"}`} />
          {r.name}
        </button>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.listRepos().then((r) => { setRepos(r); if (r.length > 0) setSelectedRepo(r[0]); });
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    setLoading(true); setError(false);
    api.getInsights(selectedRepo.id)
      .then(setInsights)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [selectedRepo]);

  return (
    <Layout active="insights" sidebar={<RepoSelector repos={repos} selected={selectedRepo} onSelect={setSelectedRepo} />}>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Insights</h2>
            <p className="text-xs text-[#444] mt-0.5">Patterns detected from git history and logged decisions.</p>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          )}

          {error && (
            <div className="text-center py-16 space-y-3">
              <p className="text-[#444] text-sm">Could not load insights.</p>
              <button onClick={() => selectedRepo && api.getInsights(selectedRepo.id).then(setInsights)}
                className="text-xs text-[#444] border border-[#1e1e1e] rounded-md px-3 py-1.5 hover:border-[#2e2e2e] transition-colors">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && !insights && (
            <p className="text-[#2e2e2e] text-sm">Connect a repo to see insights.</p>
          )}

          {!loading && !error && insights && (
            <>
              {/* Stat grid */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Commits" value={insights.commits.total} />
                <StatCard label="Revert rate" value={`${insights.commits.revert_rate}%`} warn={insights.commits.revert_rate > 5} />
                <StatCard label="Major rewrites" value={insights.commits.significant_changes} />
                <StatCard label="Fix commits" value={insights.commits.fix_commits}
                  warn={insights.commits.total > 0 && insights.commits.fix_commits / insights.commits.total > 0.2} />
                <StatCard label="Decisions" value={insights.decisions.total} />
                <StatCard label="Regret rate"
                  value={insights.decisions.total > 0 ? `${Math.round((insights.decisions.regretted / insights.decisions.total) * 100)}%` : "—"}
                  warn={insights.decisions.total > 0 && insights.decisions.regretted / insights.decisions.total > 0.3} />
              </div>

              {/* Decision outcomes bar */}
              {insights.decisions.total > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest">Decision outcomes</p>
                  <div className="h-2 rounded-full overflow-hidden flex gap-px bg-[#1a1a1a]">
                    <div className="bg-green-700 rounded-l-full" style={{ width: `${(insights.decisions.good / insights.decisions.total) * 100}%` }} />
                    <div className="bg-red-800" style={{ width: `${(insights.decisions.regretted / insights.decisions.total) * 100}%` }} />
                    <div className="bg-[#2a2a2a] rounded-r-full flex-1" />
                  </div>
                  <div className="flex gap-4 text-[10px] text-[#3a3a3a]">
                    <span><span className="text-green-600">■</span> Good ({insights.decisions.good})</span>
                    <span><span className="text-red-700">■</span> Regret ({insights.decisions.regretted})</span>
                    <span><span className="text-[#333]">■</span> Pending ({insights.decisions.pending})</span>
                  </div>
                </div>
              )}

              {/* Patterns */}
              {insights.patterns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest">Detected patterns</p>
                  <div className="space-y-2">
                    {insights.patterns.map((p, i) => (
                      <div key={i} className="flex gap-3 items-start bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3">
                        <span className="text-yellow-600/70 shrink-0 mt-0.5 text-xs">⚠</span>
                        <p className="text-sm text-[#888] flex-1 leading-relaxed">{p}</p>
                        <button onClick={() => router.push(`/?q=${encodeURIComponent(p + " — what should we do about this?")}`)}
                          className="shrink-0 text-[10px] text-[#333] border border-[#1e1e1e] rounded px-2 py-1 hover:text-[#888] hover:border-[#2e2e2e] transition-colors whitespace-nowrap">
                          Ask →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.patterns.length === 0 && insights.decisions.total === 0 && (
                <div className="text-center py-12 space-y-3">
                  <p className="text-[#2e2e2e] text-sm">No patterns yet.</p>
                  <button onClick={() => router.push("/")}
                    className="text-xs text-[#3a3a3a] border border-[#1e1e1e] rounded-md px-3 py-1.5 hover:border-[#2e2e2e] hover:text-[#666] transition-colors">
                    Log decisions to start seeing patterns →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`border rounded-xl p-4 space-y-1 ${warn ? "border-yellow-900/50 bg-yellow-950/10" : "border-[#1e1e1e] bg-[#141414]"}`}>
      <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-semibold font-mono ${warn ? "text-yellow-500" : "text-white"}`}>{value}</p>
    </div>
  );
}
