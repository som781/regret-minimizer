"use client";

import { useState } from "react";
import { api, type Repo } from "@/lib/api";

interface Props {
  repos: Repo[];
  selectedRepo: Repo | null;
  onRepoSelected: (repo: Repo) => void;
  onRepoAdded: (repo: Repo) => void;
}

export default function RepoConnector({ repos, selectedRepo, onRepoSelected, onRepoAdded }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { repo, commits_parsed } = await api.connectRepo(url.trim());
      onRepoAdded(repo);
      onRepoSelected(repo);
      setUrl("");
      alert(`Connected! Parsed ${commits_parsed} commits.`);
    } catch (e: any) {
      setError("Failed to connect. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#666] uppercase tracking-widest">Repository</p>

      {repos.map((r) => (
        <button
          key={r.id}
          onClick={() => onRepoSelected(r)}
          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
            selectedRepo?.id === r.id
              ? "bg-[#1a1a1a] text-white border border-[#333]"
              : "text-[#888] hover:text-white hover:bg-[#111]"
          }`}
        >
          <span className="text-[#555] mr-1">→</span> {r.name}
        </button>
      ))}

      <div className="pt-2 space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="github.com/org/repo"
          className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={connect}
          disabled={loading || !url.trim()}
          className="w-full bg-white text-black text-sm font-medium py-2 rounded hover:bg-[#e5e5e5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Cloning…" : "+ Connect Repo"}
        </button>
      </div>
    </div>
  );
}
