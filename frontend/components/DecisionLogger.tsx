"use client";

import { useState, useRef, useEffect } from "react";
import { api, type Repo, CATEGORIES, CATEGORY_COLORS } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Props {
  selectedRepo: Repo | null;
  onLogged: () => void;
}

export default function DecisionLogger({ selectedRepo, onLogged }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", reasoning: "", category: "" });
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Auto-focus title when panel opens
  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  async function save() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      await api.logDecision({
        repo_id: selectedRepo?.id,
        title: form.title,
        description: form.description,
        reasoning: form.reasoning,
        category: form.category || undefined,
      });
      setForm({ title: "", description: "", reasoning: "", category: "" });
      setOpen(false);
      onLogged();
      toast("Decision logged.", "success");
    } catch {
      toast("Failed to save decision.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-3 border-t border-[#1e1e1e] px-1">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-[#444] hover:text-[#888] hover:bg-white/[0.02] transition-colors group">
        <span>Log a decision</span>
        <span className={`transition-transform duration-150 ${open ? "rotate-90" : ""} text-[#2e2e2e] group-hover:text-[#555]`}>›</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 px-1">
          <input ref={titleRef} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What did you decide?"
            className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-md px-3 py-2 text-xs text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] transition-colors" />
          <textarea value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the decision…"
            rows={2}
            className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-md px-3 py-2 text-xs text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] resize-none transition-colors" />
          <textarea value={form.reasoning}
            onChange={(e) => setForm({ ...form, reasoning: e.target.value })}
            placeholder="Why? (reasoning)"
            rows={2}
            className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-md px-3 py-2 text-xs text-white placeholder-[#2e2e2e] focus:outline-none focus:border-[#333] resize-none transition-colors" />

          {/* Category */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setForm({ ...form, category: form.category === cat ? "" : cat })}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  form.category === cat ? CATEGORY_COLORS[cat] : "text-[#3a3a3a] border-[#1e1e1e] hover:border-[#333]"
                }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <button onClick={save} disabled={saving || !form.title.trim()}
              className="flex-1 py-1.5 rounded-md text-xs font-medium bg-white text-black hover:bg-[#e8e8e8] disabled:opacity-30 transition-colors">
              {saving ? "Saving…" : "Log it"}
            </button>
            <button onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs text-[#444] border border-[#1e1e1e] hover:border-[#333] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
