"use client";

import { useRef, useState } from "react";
import { api, type Repo } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Props {
  repos: Repo[];
  selectedRepo: Repo | null;
  onRepoSelected: (repo: Repo) => void;
  onRepoAdded: (repo: Repo) => void;
  loading?: boolean;
}

export default function RepoConnector({ repos, selectedRepo, onRepoSelected, onRepoAdded, loading }: Props) {
  const urlRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [connecting, setConnecting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  async function connect() {
    const url = urlRef.current?.value.trim();
    if (!url) return;
    setConnecting(true);
    try {
      const { repo, commits_parsed } = await api.connectRepo(url);
      onRepoAdded(repo);
      onRepoSelected(repo);
      if (urlRef.current) urlRef.current.value = "";
      toast(`Connected ${repo.name} — ${commits_parsed} commits parsed.`, "success");
    } catch (e: any) {
      if (e.message?.includes("409")) {
        const existing = repos.find((r) => r.url === url);
        if (existing) {
          onRepoSelected(existing);
          toast(`Switched to ${existing.name}.`, "info");
          if (urlRef.current) urlRef.current.value = "";
        }
      } else {
        toast("Failed to connect. Check the URL.", "error");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function refresh(repo: Repo, e: React.MouseEvent) {
    e.stopPropagation();
    setRefreshingId(repo.id);
    try {
      const { commits_parsed } = await api.refreshRepo(repo.id);
      toast(`${repo.name} refreshed — ${commits_parsed} commits.`, "success");
    } catch {
      toast(`Failed to refresh ${repo.name}.`, "error");
    } finally {
      setRefreshingId(null);
    }
  }

  return (
    <div className="space-y-1 py-3">
      <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest px-2 mb-2">Repository</p>

      {loading ? (
        <div className="space-y-1.5 px-1">
          {[1, 2].map((i) => <div key={i} className="skeleton h-8 rounded-md" />)}
        </div>
      ) : (
        repos.map((r) => (
          <div key={String(r.id)}
            className={`flex items-center gap-1 rounded-md transition-colors group ${
              selectedRepo?.id === r.id ? "bg-white/5" : "hover:bg-white/[0.03]"
            }`}>
            <button onClick={() => onRepoSelected(r)}
              className={`flex-1 text-left px-3 py-2 flex items-center gap-2 min-w-0 ${
                selectedRepo?.id === r.id ? "text-white" : "text-[#555] group-hover:text-[#ccc]"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                selectedRepo?.id === r.id ? "bg-green-500" : "bg-[#2a2a2a] group-hover:bg-[#444]"
              }`} />
              <span className="font-mono truncate text-xs">{r.name}</span>
            </button>
            {/* Refresh button — visible on hover or when refreshing */}
            <button
              onClick={(e) => refresh(r, e)}
              disabled={refreshingId === r.id}
              title="Pull latest commits"
              className="opacity-0 group-hover:opacity-100 shrink-0 pr-2 text-[#444] hover:text-[#888] disabled:opacity-30 transition-all">
              <svg
                className={`w-3 h-3 ${refreshingId === r.id ? "animate-spin" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        ))
      )}

      <div className="pt-2 space-y-1.5 px-1">
        <input ref={urlRef} onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="github.com/org/repo"
          className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-md px-3 py-2 text-xs text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] transition-colors font-mono" />
        <button onClick={connect} disabled={connecting}
          className="w-full py-2 rounded-md text-xs font-medium transition-colors border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444] disabled:opacity-40">
          {connecting ? "Cloning…" : "+ Connect repo"}
        </button>
      </div>
    </div>
  );
}
