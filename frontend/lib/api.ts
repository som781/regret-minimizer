const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type Repo = { id: number; name: string; url: string; connected_at: string };
export type Decision = {
  id: number;
  title: string;
  description: string;
  reasoning: string;
  outcome: "good" | "regret" | "pending" | null;
  outcome_notes: string | null;
  category: string | null;
  created_at: string;
  repo_id: number | null;
};
export type Insights = {
  decisions: { total: number; good: number; regretted: number; pending: number };
  commits: { total: number; reverts: number; revert_rate: number; significant_changes: number; fix_commits: number };
  patterns: string[];
};

export const CATEGORIES = ["architecture", "dependency", "refactor", "performance", "security", "other"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_COLORS: Record<string, string> = {
  architecture: "text-blue-400 border-blue-900 bg-blue-950",
  dependency: "text-purple-400 border-purple-900 bg-purple-950",
  refactor: "text-cyan-400 border-cyan-900 bg-cyan-950",
  performance: "text-yellow-400 border-yellow-900 bg-yellow-950",
  security: "text-red-400 border-red-900 bg-red-950",
  other: "text-[#666] border-[#333] bg-[#111]",
};

export const api = {
  async connectRepo(url: string, name?: string): Promise<{ repo: Repo; commits_parsed: number }> {
    const res = await fetch(`${BASE}/repos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },

  async listRepos(): Promise<Repo[]> {
    return fetch(`${BASE}/repos`).then((r) => r.json());
  },

  async refreshRepo(id: number): Promise<{ repo: Repo; commits_parsed: number }> {
    const res = await fetch(`${BASE}/repos/${id}/refresh`, { method: "POST" });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },

  async logDecision(data: {
    repo_id?: number;
    title: string;
    description: string;
    reasoning: string;
    category?: string;
  }): Promise<Decision> {
    const res = await fetch(`${BASE}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async listDecisions(repo_id?: number): Promise<Decision[]> {
    const url = repo_id ? `${BASE}/decisions?repo_id=${repo_id}` : `${BASE}/decisions`;
    return fetch(url).then((r) => r.json());
  },

  async updateOutcome(id: number, outcome: string, notes?: string): Promise<Decision> {
    const res = await fetch(`${BASE}/decisions/${id}/outcome`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, outcome_notes: notes }),
    });
    return res.json();
  },

  async getInsights(repo_id: number): Promise<Insights> {
    return fetch(`${BASE}/insights/${repo_id}`).then((r) => r.json());
  },

  async getActivity(repo_id: number) {
    return fetch(`${BASE}/analytics/activity/${repo_id}`).then((r) => r.json());
  },

  async getBreakdown(repo_id: number) {
    return fetch(`${BASE}/analytics/breakdown/${repo_id}`).then((r) => r.json());
  },

  async getHotspots(repo_id: number) {
    return fetch(`${BASE}/analytics/hotspots/${repo_id}`).then((r) => r.json());
  },

  async getDecisionVelocity(repo_id: number) {
    return fetch(`${BASE}/analytics/decision-velocity/${repo_id}`).then((r) => r.json());
  },
};
