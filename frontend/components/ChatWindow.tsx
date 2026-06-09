"use client";

import { useState, useRef, useEffect } from "react";
import { type Repo } from "@/lib/api";

interface Message {
  role: "user" | "agent";
  content: string;
}

interface Props {
  selectedRepo: Repo | null;
}

export default function ChatWindow({ selectedRepo }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreaming(true);

    setMessages((m) => [...m, { role: "agent", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, repoId: selectedRepo?.id ?? 1 }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((m) => {
          const updated = [...m];
          updated[updated.length - 1] = {
            role: "agent",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages((m) => {
        const updated = [...m];
        updated[updated.length - 1] = { role: "agent", content: "Error reaching agent." };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 p-6">
        {messages.length === 0 && (
          <div className="text-center mt-20 space-y-2">
            <p className="text-[#444] text-sm">Your codebase remembers so you don&apos;t have to.</p>
            <p className="text-[#333] text-xs">Ask about a decision you&apos;re about to make.</p>
            <div className="mt-6 space-y-2 text-xs text-[#333]">
              {[
                "Should I rewrite the auth module?",
                "Is switching ORMs a good idea right now?",
                "We keep reverting the payment service — why?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block mx-auto text-[#555] hover:text-white transition-colors"
                >
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-white text-black"
                  : "bg-[#111] border border-[#1f1f1f] text-[#e5e5e5]"
              }`}
            >
              {msg.role === "agent" && (
                <span className="text-[#555] text-xs block mb-1">agent</span>
              )}
              {msg.content}
              {msg.role === "agent" && streaming && i === messages.length - 1 && (
                <span className="animate-pulse ml-1 text-[#555]">▊</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1a1a1a] p-4">
        {!selectedRepo && (
          <p className="text-xs text-[#555] mb-2 text-center">Connect a repo to get git-informed answers.</p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="What decision are you about to make?"
            disabled={streaming}
            className="flex-1 bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="bg-white text-black px-5 py-3 rounded text-sm font-medium hover:bg-[#e5e5e5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {streaming ? "…" : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
