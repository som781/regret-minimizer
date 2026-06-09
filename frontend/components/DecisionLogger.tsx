"use client";

import { useState } from "react";
import { api, type Repo, CATEGORIES, CATEGORY_COLORS } from "@/lib/api";

interface Props {
  selectedRepo: Repo | null;
  onLogged: () => void;
}

export default function DecisionLogger({ selectedRepo, onLogged }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", reasoning: "", category: "" });
  const [saving, setSaving] = useState(false);

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-[#1a1a1a] pt-4 mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs text-[#666] uppercase tracking-widest hover:text-white transition-colors"
      >
        {open ? "▾" : "▸"} Log a decision
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Decision title"
            className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What did you decide?"
            rows={2}
            className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] resize-none"
          />
          <textarea
            value={form.reasoning}
            onChange={(e) => setForm({ ...form, reasoning: e.target.value })}
            placeholder="Why? (reasoning)"
            rows={2}
            className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] resize-none"
          />

          {/* Category picker */}
          <div className="flex flex-wrap gap-1 pt-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: form.category === cat ? "" : cat })}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  form.category === cat
                    ? CATEGORY_COLORS[cat]
                    : "text-[#555] border-[#222] hover:border-[#444]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={save}
            disabled={saving || !form.title.trim()}
            className="w-full bg-[#1a1a1a] border border-[#333] text-sm py-2 rounded hover:border-[#555] disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Log it →"}
          </button>
        </div>
      )}
    </div>
  );
}
