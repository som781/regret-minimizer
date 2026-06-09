"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Repo } from "@/lib/api";
import Layout from "@/components/Layout";
import RepoConnector from "@/components/RepoConnector";
import DecisionLogger from "@/components/DecisionLogger";
import ChatWindow from "@/components/ChatWindow";

function HomeInner() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? undefined;

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [reposLoading, setReposLoading] = useState(true);
  const [loggedCount, setLoggedCount] = useState(0);

  useEffect(() => {
    api.listRepos().then((r) => {
      setRepos(r);
      if (r.length > 0) setSelectedRepo(r[0]);
    }).finally(() => setReposLoading(false));
  }, []);

  const sidebar = (
    <>
      <RepoConnector
        repos={repos}
        selectedRepo={selectedRepo}
        loading={reposLoading}
        onRepoSelected={setSelectedRepo}
        onRepoAdded={(r) => setRepos((prev) => [...prev, r])}
      />
      <DecisionLogger selectedRepo={selectedRepo} onLogged={() => setLoggedCount((c) => c + 1)} />
    </>
  );

  return (
    <Layout active="ask" sidebar={sidebar}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedRepo && (
          <div className="border-b border-[#1e1e1e] px-5 py-2.5 flex items-center justify-between">
            <span className="text-xs text-[#3a3a3a] font-mono">{selectedRepo.name}</span>
            {loggedCount > 0 && (
              <span className="text-[10px] text-[#2e2e2e]">
                {loggedCount} decision{loggedCount !== 1 ? "s" : ""} logged
              </span>
            )}
          </div>
        )}
        <ChatWindow selectedRepo={selectedRepo} initialQuestion={initialQuestion} />
      </div>
    </Layout>
  );
}

export default function Home() {
  return <Suspense><HomeInner /></Suspense>;
}
