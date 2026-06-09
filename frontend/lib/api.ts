const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type Repo = { id: number; name: string; url: string; connected_at: string };
export type Decision = {
  id: number;
  title: string;
  description: string;
  reasoning: string;
  outcome: "good" | "regret" | "pending" | null;
  outcome_notes: string | null;
  created_at: string;
  repo_id: number | null;
};
export type Insights = {
  decisions: { total: number; good: number; regretted: number; pending: number };
  commits: { total: number; reverts: number; revert_rate: number; significant_changes: number; fix_commits: number };
  patterns: string[];
};

export const api = {
  async connectRepo(url: string, name?: string): Promise<{ repo: Repo; commits_parsed: number }> {
    const res = await fetch(`${BASE}/repos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listRepos(): Promise<Repo[]> {
    return fetch(`${BASE}/repos`).then((r) => r.json());
  },

  async logDecision(data: {
    repo_id?: number;
    title: string;
    description: string;
    reasoning: string;
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
};
