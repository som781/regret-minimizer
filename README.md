# Regret Minimizer

> Your codebase remembers so you don't have to.

A git-native decision intelligence tool built with [GitAgent](https://github.com/open-gitagent/gitagent).

Before you make a technical decision, ask the agent. It mines your git history and every decision you've ever logged — and tells you the truth about what patterns it sees.

---

## What it does

- **Ask** — Describe a decision you're about to make. The agent searches your commit history, reverts, and past logged decisions to give you a data-driven answer.
- **Log** — Record decisions as you make them (what, why). Update the outcome later.
- **Timeline** — See every logged decision and whether it worked out.
- **Insights** — Patterns detected from your git history: revert rate, refactor frequency, fix commit ratio.

---

## Architecture

```
regret-minimizer/
├── backend/        # FastAPI — git parsing, decisions CRUD, insights
├── agent/          # GitAgent config — SOUL.md, RULES.md, memory/
└── frontend/       # Next.js — chat UI, timeline, insights dashboard
```

The agent's identity lives in `agent/SOUL.md` and `agent/RULES.md` — version-controlled personality.  
Logged decisions land in `agent/memory/decisions/` — a git-committed decision journal.

### How the chat works

1. User asks a question
2. Next.js API route gathers context from FastAPI (relevant commits + past decisions)
3. GitAgent SDK runs the agent with two custom tools: `search_git_history` and `get_past_decisions`
4. Response streams back to the UI

---

## Stack

| Layer | Tech |
|---|---|
| Agent | [GitAgent](https://github.com/open-gitagent/gitagent) SDK |
| Backend | FastAPI + SQLite + GitPython |
| Frontend | Next.js 14 + Tailwind CSS |
| LLM | Anthropic Claude (via GitAgent) |

---

## Running locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo flow

1. Connect a GitHub repo (paste URL in sidebar)
2. Ask: *"Should I rewrite the auth module?"*
3. See the agent surface relevant commits, reverts, and past decisions
4. Log the decision you make → it lands in `agent/memory/`
5. Check Timeline and Insights for patterns over time
