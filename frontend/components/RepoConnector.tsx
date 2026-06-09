"use client";

import { useRef } from "react";
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
  const [connecting, setConnecting] = React.useState(false);

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

  return (
    <div className="space-y-1 py-3">
      <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest px-2 mb-2">Repository</p>

      {loading ? (
        <div className="space-y-1.5 px-1">
          {[1, 2].map((i) => <div key={i} className="skeleton h-8 rounded-md" />)}
        </div>
      ) : (
        repos.map((r) => (
          <button key={String(r.id)} onClick={() => onRepoSelected(r)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 group ${
              selectedRepo?.id === r.id
                ? "bg-white/5 text-white"
                : "text-[#555] hover:text-[#ccc] hover:bg-white/[0.03]"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedRepo?.id === r.id ? "bg-green-500" : "bg-[#2a2a2a] group-hover:bg-[#444]"}`} />
            <span className="font-mono truncate text-xs">{r.name}</span>
          </button>
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

// Need React for useState
import React from "react";
