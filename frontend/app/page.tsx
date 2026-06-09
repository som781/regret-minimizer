"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Repo } from "@/lib/api";
import RepoConnector from "@/components/RepoConnector";
import DecisionLogger from "@/components/DecisionLogger";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [loggedCount, setLoggedCount] = useState(0);

  useEffect(() => {
    api.listRepos().then((r) => {
      setRepos(r);
      if (r.length > 0) setSelectedRepo(r[0]);
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-[#1a1a1a] flex flex-col p-4 space-y-6 overflow-y-auto scrollbar-thin">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white">regret-minimizer</h1>
          <p className="text-xs text-[#555] mt-0.5">your codebase remembers</p>
        </div>

        <nav className="space-y-1">
          <Link href="/" className="block text-xs text-white bg-[#1a1a1a] px-3 py-2 rounded">
            ◉ Ask
          </Link>
          <Link href="/timeline" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">
            ○ Timeline
          </Link>
          <Link href="/insights" className="block text-xs text-[#666] hover:text-white px-3 py-2 rounded transition-colors">
            ○ Insights
          </Link>
        </nav>

        <RepoConnector
          repos={repos}
          selectedRepo={selectedRepo}
          onRepoSelected={setSelectedRepo}
          onRepoAdded={(r) => setRepos((prev) => [...prev, r])}
        />

        <DecisionLogger
          selectedRepo={selectedRepo}
          onLogged={() => setLoggedCount((c) => c + 1)}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {selectedRepo && (
          <div className="border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-[#555]">{selectedRepo.name}</span>
            {loggedCount > 0 && (
              <span className="text-xs text-[#444]">
                {loggedCount} decision{loggedCount !== 1 ? "s" : ""} logged this session
              </span>
            )}
          </div>
        )}
        <ChatWindow selectedRepo={selectedRepo} />
      </main>
    </div>
  );
}
