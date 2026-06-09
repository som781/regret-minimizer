"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Repo } from "@/lib/api";
import { useToast } from "@/components/Toast";

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
  const toast = useToast();

  useEffect(() => { inputRef.current?.focus(); }, []);

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
        const errMsg = res.status === 500
          ? "Server error — check that your OpenAI key is set."
          : res.status === 400
          ? "Bad request — is a repo connected?"
          : `Request failed (${res.status}).`;
        setMessages((m) => { const u = [...m]; u[u.length - 1] = { role: "agent", content: errMsg, error: true }; return u; });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setMessages((m) => {
          const u = [...m];
          u[u.length - 1] = { role: "agent", content: u[u.length - 1].content + decoder.decode(value) };
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

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    toast("Copied to clipboard.", "info");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-20">
            <p className="text-[#2a2a2a] text-sm">Your codebase remembers so you don&apos;t have to.</p>
            {selectedRepo && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="w-full text-left text-sm text-[#3a3a3a] border border-[#1a1a1a] rounded-lg px-4 py-2.5 hover:border-[#252525] hover:text-[#666] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {!selectedRepo && (
              <p className="text-[#222] text-xs">← Connect a repo to get started.</p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "agent" && (
              <div className="flex flex-col gap-1.5 max-w-[80%] min-w-0">
                <span className="text-[#2e2e2e] text-[10px] px-1 font-mono uppercase tracking-widest">agent</span>
                <div className={`rounded-xl px-5 py-4 text-sm ${
                  msg.error
                    ? "bg-red-950/30 border border-red-900/60 text-red-400"
                    : "bg-[#141414] border border-[#1e1e1e]"
                }`}>
                  {!msg.content && streaming && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1 items-center h-5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#333] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#333] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#333] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    <>
                      <div className="prose prose-sm prose-invert max-w-none
                        prose-headings:text-[#e8e8e8] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0
                        prose-h3:text-[13px] prose-h3:uppercase prose-h3:tracking-wide prose-h3:text-[#888]
                        prose-p:text-[#c0c0c0] prose-p:leading-relaxed prose-p:mb-3
                        prose-strong:text-[#e8e8e8] prose-strong:font-semibold
                        prose-ul:text-[#c0c0c0] prose-ul:space-y-1 prose-ul:pl-4
                        prose-ol:text-[#c0c0c0] prose-ol:space-y-2 prose-ol:pl-4
                        prose-li:leading-relaxed
                        prose-code:text-[#a78bfa] prose-code:bg-[#1a1a2e] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                        prose-blockquote:border-l-2 prose-blockquote:border-[#2a2a2a] prose-blockquote:pl-3 prose-blockquote:text-[#666] prose-blockquote:not-italic">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.content && streaming && i === messages.length - 1 && (
                        <span className="animate-pulse text-[#333] text-xs ml-0.5">▊</span>
                      )}
                    </>
                  )}
                </div>
                {/* Post-response actions */}
                {msg.content && !streaming && i === messages.length - 1 && !msg.error && (
                  <div className="flex gap-2 px-1">
                    <button onClick={() => copyMessage(msg.content)}
                      className="text-[10px] text-[#2e2e2e] hover:text-[#666] transition-colors">
                      Copy
                    </button>
                    <span className="text-[#1e1e1e]">·</span>
                    <button onClick={() => {
                      const q = messages.find((m, idx) => idx === i - 1)?.content ?? "";
                      setInput(`Follow up: ${q}`);
                      inputRef.current?.focus();
                    }}
                      className="text-[10px] text-[#2e2e2e] hover:text-[#666] transition-colors">
                      Follow up
                    </button>
                  </div>
                )}
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
          <input ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={selectedRepo ? "What decision are you about to make?" : "Connect a repo first…"}
            disabled={streaming || !selectedRepo}
            className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#2a2a2a] focus:outline-none focus:border-[#2e2e2e] disabled:opacity-40 transition-colors" />
          <button onClick={() => send()} disabled={streaming || !input.trim() || !selectedRepo}
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
        <p className="text-[#1e1e1e] text-[10px] mt-1.5 text-right">↵ Enter to send</p>
      </div>
    </div>
  );
}
