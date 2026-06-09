import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const AGENT_DIR = path.join(process.cwd(), "..", "agent");

export async function POST(req: NextRequest) {
  const { message, repoId } = await req.json();

  const [gitResults, decisionResults, summary] = await Promise.all([
    fetch(`${BACKEND}/git/search?repo_id=${repoId}&q=${encodeURIComponent(message)}`)
      .then((r) => r.json())
      .catch(() => []),
    fetch(`${BACKEND}/decisions/search?q=${encodeURIComponent(message)}`)
      .then((r) => r.json())
      .catch(() => []),
    fetch(`${BACKEND}/git/summary/${repoId}`)
      .then((r) => r.json())
      .catch(() => null),
  ]);

  const context = buildContext(gitResults, decisionResults, summary);
  const systemPrompt = loadSystemPrompt();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        // Use gitagent SDK with custom tools
        const { query, tool } = await import("@open-gitagent/gitagent");

        const searchGit = tool(
          "search_git_history",
          "Search git history for commits related to a technical decision",
          {
            properties: { keywords: { type: "string", description: "Keywords to search" } },
            required: ["keywords"],
          },
          async (args: { keywords: string }) => {
            const res = await fetch(
              `${BACKEND}/git/search?repo_id=${repoId}&q=${encodeURIComponent(args.keywords)}`
            );
            const data = await res.json();
            return { text: JSON.stringify(data) };
          }
        );

        const getDecisions = tool(
          "get_past_decisions",
          "Retrieve past logged decisions from memory",
          {
            properties: { query: { type: "string", description: "Search query" } },
            required: ["query"],
          },
          async (args: { query: string }) => {
            const res = await fetch(
              `${BACKEND}/decisions/search?q=${encodeURIComponent(args.query)}`
            );
            const data = await res.json();
            return { text: JSON.stringify(data) };
          }
        );

        const prompt = `${context}\n\nDecision question: ${message}`;

        for await (const msg of query({
          prompt,
          dir: AGENT_DIR,
          model: "openai:gpt-4o",
          systemPromptSuffix: systemPrompt,
          tools: [searchGit, getDecisions],
          maxTurns: 5,
        })) {
          if (msg.type === "delta" && msg.content) {
            controller.enqueue(enc.encode(msg.content));
          }
        }
      } catch (err) {
        controller.enqueue(enc.encode(`Error: ${err}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function loadSystemPrompt(): string {
  try {
    const soul = fs.readFileSync(path.join(AGENT_DIR, "SOUL.md"), "utf-8");
    const rules = fs.readFileSync(path.join(AGENT_DIR, "RULES.md"), "utf-8");
    return `${soul}\n\n${rules}`;
  } catch {
    return "";
  }
}

function buildContext(gitResults: any[], decisions: any[], summary: any): string {
  const parts: string[] = ["## Context from this repository\n"];

  if (summary?.total_commits) {
    parts.push(
      `Repository stats: ${summary.total_commits} commits, ` +
        `${summary.revert_rate}% revert rate, ` +
        `${summary.significant_changes} major refactors.`
    );
  }

  if (gitResults.length > 0) {
    parts.push(
      "\n### Relevant commits:\n" +
        gitResults
          .map(
            (c: any) =>
              `- [${c.date}] ${c.hash}: ${c.message}${c.is_revert ? " ⚠️ REVERT" : ""}`
          )
          .join("\n")
    );
  }

  if (decisions.length > 0) {
    parts.push(
      "\n### Past logged decisions:\n" +
        decisions
          .map(
            (d: any) =>
              `- [${d.created_at?.split("T")[0]}] ${d.title}: ${d.description} → outcome: ${d.outcome ?? "pending"}${d.outcome_notes ? ` (${d.outcome_notes})` : ""}`
          )
          .join("\n")
    );
  }

  if (parts.length === 1) {
    parts.push("No relevant history found yet for this query.");
  }

  return parts.join("\n");
}
