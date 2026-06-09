import re
from datetime import datetime
from typing import List
from git import Repo as GitRepo
from sqlmodel import Session, select
from backend.models import GitCommit

REVERT_RE = re.compile(r'\b(revert|rollback|undo)\b', re.IGNORECASE)
SIGNIFICANT_RE = re.compile(r'\b(refactor|rewrite|migrate|redesign|overhaul|rework|upgrade)\b', re.IGNORECASE)
FIX_RE = re.compile(r'\b(fix|bug|patch|hotfix|regression|broken)\b', re.IGNORECASE)


def parse_repo(repo_id: int, local_path: str, session: Session) -> int:
    git_repo = GitRepo(local_path)
    count = 0

    for commit in git_repo.iter_commits(max_count=500):
        msg = commit.message.strip()
        tags = []

        if REVERT_RE.search(msg):
            tags.append("revert")
        if SIGNIFICANT_RE.search(msg):
            tags.append("significant")
        if FIX_RE.search(msg):
            tags.append("fix")

        session.add(GitCommit(
            repo_id=repo_id,
            hash=commit.hexsha[:8],
            message=msg[:500],
            author=commit.author.name,
            date=datetime.fromtimestamp(commit.committed_date),
            files_changed=len(commit.stats.files),
            is_revert="revert" in tags,
            tags=",".join(tags),
        ))
        count += 1

    session.commit()
    return count


def search_commits(repo_id: int, keywords: str, session: Session) -> List[dict]:
    terms = keywords.lower().split()
    all_commits = session.exec(select(GitCommit).where(GitCommit.repo_id == repo_id)).all()

    results = []
    for c in all_commits:
        if any(t in c.message.lower() for t in terms):
            results.append({
                "hash": c.hash,
                "message": c.message.split("\n")[0][:200],
                "date": c.date.strftime("%Y-%m-%d"),
                "author": c.author,
                "is_revert": c.is_revert,
                "tags": c.tags,
                "files_changed": c.files_changed,
            })

    return results[:20]


def get_repo_summary(repo_id: int, session: Session) -> dict:
    commits = session.exec(select(GitCommit).where(GitCommit.repo_id == repo_id)).all()
    total = len(commits)
    if total == 0:
        return {"total_commits": 0, "revert_count": 0, "revert_rate": 0, "significant_changes": 0}

    reverts = sum(1 for c in commits if c.is_revert)
    significant = sum(1 for c in commits if "significant" in c.tags)
    author_counts: dict = {}
    for c in commits:
        author_counts[c.author] = author_counts.get(c.author, 0) + 1

    return {
        "total_commits": total,
        "revert_count": reverts,
        "revert_rate": round(reverts / total * 100, 1),
        "significant_changes": significant,
        "top_authors": sorted(author_counts.items(), key=lambda x: -x[1])[:5],
    }
