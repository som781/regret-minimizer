"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api, type Repo } from "@/lib/api";

type Activity = { month: string; total: number; fix: number; revert: number; significant: number };
type Breakdown = { name: string; value: number; color: string };
type Hotspot = { file: string; changes: number; fix_changes: number; revert_changes: number; risk_score: number };
type Velocity = { month: string; good: number; regret: number; pending: number };

const NAV = [["Ask", "/"], ["Timeline", "/timeline"], ["Insights", "/insights"], ["Analytics", "/analytics"]];

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
    Promise.all([
      api.getActivity(selected.id),
      api.getBreakdown(selected.id),
      api.getHotspots(selected.id),
      api.getDecisionVelocity(selected.id),
    ]).then(([a, b, h, v]) => {
      setActivity(a);
      setBreakdown(b.filter((x: Breakdown) => x.value > 0));
      setHotspots(h);
      setVelocity(v);
    }).finally(() => setLoading(false));
  }, [selected]);

  function ask(question: string) {
    router.push(`/?q=${encodeURIComponent(question)}`);
  }

  const maxRisk = hotspots[0]?.risk_score || 1;
  const totalCommits = activity.reduce((s, a) => s + a.total, 0);
  const totalFix = activity.reduce((s, a) => s + a.fix, 0);
  const totalRevert = activity.reduce((s, a) => s + a.revert, 0);
  const fixRate = totalCommits > 0 ? Math.round((totalFix / totalCommits) * 100) : 0;

  // Generate recommended actions from the data
  const actions: { label: string; question: string; severity: "high" | "medium" | "low" }[] = [];

  if (hotspots[0]) {
    actions.push({
      severity: hotspots[0].revert_changes > 0 ? "high" : "medium",
      label: `${hotspots[0].file} has the highest churn (${hotspots[0].changes} changes, ${hotspots[0].fix_changes} fixes)`,
      question: `${hotspots[0].file} has been changed ${hotspots[0].changes} times with ${hotspots[0].fix_changes} fix commits. Should we refactor or stabilize it?`,
    });
  }
  if (fixRate > 20) {
    actions.push({
      severity: "high",
      label: `${fixRate}% of commits are fixes — unusually high`,
      question: `${fixRate}% of our commits are bug fixes. What does the history say about where most bugs come from, and how do we reduce this?`,
    });
  }
  if (totalRevert > 3) {
    actions.push({
      severity: "medium",
      label: `${totalRevert} reverts in the last 12 months`,
      question: `We've had ${totalRevert} reverted commits. What patterns do those reverts share, and how do we stop repeating them?`,
    });
  }
  if (hotspots.length > 1) {
    actions.push({
      severity: "low",
      label: `${hotspots.length} files with high churn — consider ownership review`,
      question: `Our top hotspot files are ${hotspots.slice(0, 3).map(h => h.file).join(", ")}. Do these files have clear owners? Should we split or simplify them?`,
    });
  }

  const SEVERITY_STYLE = {
    high: "border-red-900 bg-red-950/30 text-red-400",
    medium: "border-yellow-900 bg-yellow-950/30 text-yellow-500",
    low: "border-[#222] text-[#888]",
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
            <Link key={href} href={href} className={`block text-xs px-3 py-2 rounded transition-colors ${href === "/analytics" ? "text-white bg-[#1a1a1a]" : "text-[#666] hover:text-white"}`}>
              {href === "/analytics" ? "◉" : "○"} {label}
            </Link>
          ))}
        </nav>
        {repos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[#666] uppercase tracking-widest">Repo</p>
            {repos.map((r) => (
              <button key={String(r.id)} onClick={() => setSelected(r)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selected?.id === r.id ? "bg-[#1a1a1a] text-white border border-[#333]" : "text-[#888] hover:text-white"}`}>
                {r.name}
              </button>
            ))}
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <p className="text-xs text-[#555] mt-1">Patterns from your git history — with actions.</p>
        </div>

        {loading ? (
          <p className="text-[#444] text-sm">Loading…</p>
        ) : !selected ? (
          <p className="text-[#444] text-sm">Connect a repo to see analytics.</p>
        ) : (
          <div className="space-y-8">

            {/* Recommended Actions */}
            {actions.length > 0 && (
              <Section title="Recommended Actions" subtitle="Based on your git history — click to investigate">
                <div className="space-y-2 mt-1">
                  {actions.map((a, i) => (
                    <div key={i} className={`flex items-start justify-between gap-4 border rounded px-4 py-3 ${SEVERITY_STYLE[a.severity]}`}>
                      <p className="text-sm leading-snug">{a.label}</p>
                      <button onClick={() => ask(a.question)}
                        className="shrink-0 text-xs px-3 py-1 rounded border border-current opacity-70 hover:opacity-100 transition-opacity whitespace-nowrap">
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
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activity} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                    <XAxis dataKey="month" tick={{ fill: "#555", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "#aaa" }} />
                    <Bar dataKey="total" name="Total" fill="#374151" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="fix" name="Fix" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="revert" name="Revert" fill="#f97316" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="significant" name="Refactor" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            <div className="grid grid-cols-2 gap-6">
              {breakdown.length > 0 && (
                <Section title="Commit Breakdown" subtitle="By type">
                  <div className="flex items-center justify-center">
                    <PieChart width={220} height={200}>
                      <Pie data={breakdown} cx={110} cy={90} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                        {breakdown.map((b) => <Cell key={b.name} fill={b.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6, fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#888" }} />
                    </PieChart>
                  </div>
                  {fixRate > 20 && (
                    <button onClick={() => ask(`${fixRate}% of our commits are bug fixes. What patterns explain this high fix rate?`)}
                      className="w-full mt-2 text-xs text-red-400 border border-red-900 rounded py-1.5 hover:bg-red-950 transition-colors">
                      ⚠ {fixRate}% fix rate — investigate →
                    </button>
                  )}
                </Section>
              )}

              {velocity.length > 0 ? (
                <Section title="Decision Velocity" subtitle="Decisions logged over time">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={velocity} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                      <XAxis dataKey="month" tick={{ fill: "#555", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#555", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="good" name="Good" stackId="a" fill="#22c55e" />
                      <Bar dataKey="regret" name="Regret" stackId="a" fill="#ef4444" />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill="#374151" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              ) : (
                <Section title="Decision Velocity" subtitle="Decisions logged over time">
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <p className="text-[#444] text-sm">No decisions logged yet.</p>
                    <Link href="/timeline" className="text-xs text-[#555] border border-[#222] rounded px-3 py-1.5 hover:border-[#444] transition-colors">
                      Start logging →
                    </Link>
                  </div>
                </Section>
              )}
            </div>

            {/* Hotspot files */}
            {hotspots.length > 0 && (
              <Section title="Hotspot Files" subtitle="Most risky files — weighted by fix and revert frequency">
                <div className="space-y-3 mt-2">
                  {hotspots.map((h) => (
                    <div key={h.file} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-3">
                        <span className="text-[#aaa] truncate font-mono">{h.file}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[#555]">{h.changes}ch · {h.fix_changes}fix · {h.revert_changes}rev</span>
                          <button
                            onClick={() => ask(`${h.file} has ${h.changes} changes, ${h.fix_changes} fix commits, and ${h.revert_changes} reverts. Is this a problem? What should we do about it?`)}
                            className="text-[#444] hover:text-white border border-[#222] hover:border-[#444] rounded px-2 py-0.5 transition-colors">
                            Ask →
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a] rounded overflow-hidden">
                        <div className="h-full rounded transition-all"
                          style={{
                            width: `${(h.risk_score / maxRisk) * 100}%`,
                            background: h.revert_changes > 0 ? "#f97316" : h.fix_changes > 2 ? "#ef4444" : "#3b82f6",
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1a1a1a] rounded-lg p-5 space-y-3">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-[#555] mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
