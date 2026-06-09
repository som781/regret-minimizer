"use client";

import { useState, useRef, useEffect } from "react";
import { type Repo } from "@/lib/api";

interface Message {
  role: "user" | "agent";
  content: string;
  error?: boolean;
}

interface Props {
  selectedRepo: Repo | null;
  initialQuestion?: string;
}

const SUGGESTIONS = [
  "Should I rewrite the auth module?",
  "Is switching ORMs a good idea right now?",
  "We keep reverting the payment service — why?",
];

export default function ChatWindow({ selectedRepo, initialQuestion }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didAutoSubmit = useRef(false);

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-submit when arriving from ?q= link once repo is ready
  useEffect(() => {
    if (initialQuestion && selectedRepo && !didAutoSubmit.current && !streaming) {
      didAutoSubmit.current = true;
      send(initialQuestion);
    }
  }, [selectedRepo, initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setStreaming(true);
    setMessages((m) => [...m, { role: "agent", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, repoId: selectedRepo?.id }),
      });

      if (!res.ok || !res.body) {
        const status = res.status;
        const errMsg = status === 500
          ? "Server error — check that your OpenAI key is set."
          : status === 400
          ? "Bad request — is a repo connected?"
          : `Request failed (${status}).`;
        setMessages((m) => { const u = [...m]; u[u.length - 1] = { role: "agent", content: errMsg, error: true }; return u; });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((m) => {
          const u = [...m];
          u[u.length - 1] = { role: "agent", content: u[u.length - 1].content + chunk };
          return u;
        });
      }
    } catch {
      setMessages((m) => { const u = [...m]; u[u.length - 1] = { role: "agent", content: "Network error — is the backend running?", error: true }; return u; });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-20">
            <div className="text-center space-y-1">
              <p className="text-[#333] text-sm">Your codebase remembers so you don&apos;t have to.</p>
              {!selectedRepo && (
                <p className="text-[#2a2a2a] text-xs">← Connect a repo to get git-informed answers.</p>
              )}
            </div>
            {selectedRepo && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="w-full text-left text-sm text-[#444] border border-[#1a1a1a] rounded-lg px-4 py-2.5 hover:border-[#2e2e2e] hover:text-[#888] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "agent" && (
              <div className="flex flex-col gap-1 max-w-[75%]">
                <span className="text-[#3a3a3a] text-xs px-1 font-mono">agent</span>
                <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.error
                    ? "bg-red-950/40 border border-red-900 text-red-300"
                    : "bg-[#141414] border border-[#1e1e1e] text-[#d0d0d0]"
                }`}>
                  {msg.content}
                  {!msg.content && streaming && i === messages.length - 1 && (
                    <span className="inline-flex gap-0.5 items-center h-4">
                      <span className="w-1 h-1 rounded-full bg-[#444] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 rounded-full bg-[#444] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 rounded-full bg-[#444] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                  {msg.content && streaming && i === messages.length - 1 && (
                    <span className="animate-pulse ml-1 text-[#333]">▊</span>
                  )}
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="max-w-[75%] bg-white text-black rounded-xl px-4 py-3 text-sm leading-relaxed">
                {msg.content}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1e1e1e] px-4 py-3">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={selectedRepo ? "What decision are you about to make?" : "Connect a repo first…"}
            disabled={streaming || !selectedRepo}
            className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#333] disabled:opacity-40 transition-colors"
          />
          <button onClick={() => send()}
            disabled={streaming || !input.trim() || !selectedRepo}
            className="bg-white text-black px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#e8e8e8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
            {streaming ? (
              <span className="inline-flex gap-0.5 items-center">
                <span className="w-1 h-1 rounded-full bg-black animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-black animate-bounce" style={{ animationDelay: "100ms" }} />
                <span className="w-1 h-1 rounded-full bg-black animate-bounce" style={{ animationDelay: "200ms" }} />
              </span>
            ) : "Ask"}
          </button>
        </div>
        <p className="text-[#2a2a2a] text-xs mt-1.5 text-right">↵ Enter to send</p>
      </div>
    </div>
  );
}
