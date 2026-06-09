"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api, type Repo } from "@/lib/api";
import Layout from "@/components/Layout";

type Activity = { month: string; total: number; fix: number; revert: number; significant: number };
type Breakdown = { name: string; value: number; color: string };
type Hotspot = { file: string; changes: number; fix_changes: number; revert_changes: number; risk_score: number };
type Velocity = { month: string; good: number; regret: number; pending: number };

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

const TOOLTIP_STYLE = { contentStyle: { background: "#141414", border: "1px solid #1e1e1e", borderRadius: 8, fontSize: 11 }, labelStyle: { color: "#666" } };

export default function AnalyticsPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Repo | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [velocity, setVelocity] = useState<Velocity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listRepos().then((r) => { setRepos(r); if (r.length > 0) setSelected(r[0]); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([api.getActivity(selected.id), api.getBreakdown(selected.id), api.getHotspots(selected.id), api.getDecisionVelocity(selected.id)])
      .then(([a, b, h, v]) => { setActivity(a); setBreakdown(b.filter((x: Breakdown) => x.value > 0)); setHotspots(h); setVelocity(v); })
      .finally(() => setLoading(false));
  }, [selected]);

  function ask(q: string) { router.push(`/?q=${encodeURIComponent(q)}`); }

  const totalCommits = activity.reduce((s, a) => s + a.total, 0);
  const totalFix = activity.reduce((s, a) => s + a.fix, 0);
  const totalRevert = activity.reduce((s, a) => s + a.revert, 0);
  const fixRate = totalCommits > 0 ? Math.round((totalFix / totalCommits) * 100) : 0;
  const maxRisk = hotspots[0]?.risk_score || 1;

  const actions: { label: string; question: string; severity: "high" | "medium" | "low" }[] = [];
  if (hotspots[0]) actions.push({ severity: hotspots[0].revert_changes > 0 ? "high" : "medium", label: `${hotspots[0].file} has highest churn (${hotspots[0].changes} changes, ${hotspots[0].fix_changes} fixes)`, question: `${hotspots[0].file} has been changed ${hotspots[0].changes} times with ${hotspots[0].fix_changes} fix commits. Should we refactor or stabilize it?` });
  if (fixRate > 20) actions.push({ severity: "high", label: `${fixRate}% of commits are fixes — unusually high`, question: `${fixRate}% of our commits are bug fixes. What patterns explain this and how do we reduce it?` });
  if (totalRevert > 3) actions.push({ severity: "medium", label: `${totalRevert} reverts in the last 12 months`, question: `We've had ${totalRevert} reverted commits. What do they have in common and how do we prevent them?` });
  if (hotspots.length > 1) actions.push({ severity: "low", label: `${hotspots.length} high-churn files — consider ownership review`, question: `Our top hotspot files are ${hotspots.slice(0, 3).map(h => h.file).join(", ")}. Do these files need refactoring or clearer ownership?` });

  const SEVERITY = { high: "border-red-900/60 bg-red-950/20 text-red-400", medium: "border-yellow-900/60 bg-yellow-950/20 text-yellow-500", low: "border-[#1e1e1e] text-[#555]" };

  return (
    <Layout active="analytics" sidebar={<RepoSelector repos={repos} selected={selected} onSelect={setSelected} />}>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Analytics</h2>
            <p className="text-xs text-[#444] mt-0.5">Patterns from your git history — with actions.</p>
          </div>

          {!selected && <p className="text-[#2e2e2e] text-sm">Connect a repo to see analytics.</p>}

          {loading && (
            <div className="space-y-4">
              <div className="skeleton h-64 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <div className="skeleton h-52 rounded-xl" />
                <div className="skeleton h-52 rounded-xl" />
              </div>
              <div className="skeleton h-64 rounded-xl" />
            </div>
          )}

          {!loading && selected && (
            <div className="space-y-5">

              {/* Recommended actions */}
              {actions.length > 0 && (
                <Section title="Recommended Actions" subtitle="Derived from your git history — click to investigate">
                  <div className="space-y-2">
                    {actions.map((a, i) => (
                      <div key={i} className={`flex items-start justify-between gap-4 border rounded-lg px-4 py-3 ${SEVERITY[a.severity]}`}>
                        <p className="text-sm leading-snug">{a.label}</p>
                        <button onClick={() => ask(a.question)}
                          className="shrink-0 text-[10px] px-3 py-1.5 rounded border border-current opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap">
                          Ask agent →
                        </button>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Commit activity */}
              {activity.length > 0 && (
                <Section title="Commit Activity" subtitle="Last 12 months by type">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={activity} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                      <XAxis dataKey="month" tick={{ fill: "#3a3a3a", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#3a3a3a", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="total" name="Total" fill="#252525" radius={[2,2,0,0]} />
                      <Bar dataKey="fix" name="Fix" fill="#7f1d1d" radius={[2,2,0,0]} />
                      <Bar dataKey="revert" name="Revert" fill="#9a3412" radius={[2,2,0,0]} />
                      <Bar dataKey="significant" name="Refactor" fill="#1e3a5f" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              )}

              <div className="grid grid-cols-2 gap-5">
                {breakdown.length > 0 && (
                  <Section title="Commit Breakdown" subtitle="By type">
                    <div className="flex justify-center">
                      <PieChart width={200} height={180}>
                        <Pie data={breakdown} cx={100} cy={80} innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
                          {breakdown.map((b) => <Cell key={b.name} fill={b.color} opacity={0.8} />)}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: "#555" }} />
                      </PieChart>
                    </div>
                    {fixRate > 20 && (
                      <button onClick={() => ask(`${fixRate}% of our commits are bug fixes. What patterns explain this?`)}
                        className="w-full mt-1 text-xs text-red-500/70 border border-red-900/40 rounded-lg py-1.5 hover:bg-red-950/20 transition-colors">
                        ⚠ {fixRate}% fix rate — investigate →
                      </button>
                    )}
                  </Section>
                )}

                <Section title="Decision Velocity" subtitle="Decisions logged over time">
                  {velocity.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={velocity} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                        <XAxis dataKey="month" tick={{ fill: "#3a3a3a", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#3a3a3a", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey="good" name="Good" stackId="a" fill="#14532d" />
                        <Bar dataKey="regret" name="Regret" stackId="a" fill="#7f1d1d" />
                        <Bar dataKey="pending" name="Pending" stackId="a" fill="#252525" radius={[2,2,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                      <p className="text-[#2a2a2a] text-sm">No decisions yet.</p>
                      <button onClick={() => router.push("/")}
                        className="text-[10px] text-[#3a3a3a] border border-[#1e1e1e] rounded-md px-3 py-1.5 hover:border-[#2a2a2a] hover:text-[#666] transition-colors">
                        Start logging →
                      </button>
                    </div>
                  )}
                </Section>
              </div>

              {/* Hotspot files */}
              {hotspots.length > 0 && (
                <Section title="Hotspot Files" subtitle="Risk score = changes + 2×fixes + 3×reverts">
                  <div className="space-y-3 mt-1">
                    {hotspots.map((h) => (
                      <div key={h.file} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-[#666] truncate font-mono">{h.file}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-[#2e2e2e]">{h.changes}ch · {h.fix_changes}fix · {h.revert_changes}rev</span>
                            <button onClick={() => ask(`${h.file} has ${h.changes} changes and ${h.fix_changes} fixes. Is it a risk? What should we do?`)}
                              className="text-[10px] text-[#2e2e2e] border border-[#1e1e1e] rounded px-2 py-0.5 hover:text-[#888] hover:border-[#2e2e2e] transition-colors">
                              Ask →
                            </button>
                          </div>
                        </div>
                        <div className="h-1 bg-[#141414] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${(h.risk_score / maxRisk) * 100}%`, background: h.revert_changes > 0 ? "#9a3412" : h.fix_changes > 2 ? "#7f1d1d" : "#1e3a5f" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1e1e1e] bg-[#141414]/50 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-[10px] text-[#3a3a3a] mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
