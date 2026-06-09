from collections import defaultdict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from git import Repo as GitRepo, InvalidGitRepositoryError
from backend.database import get_session
from backend.models import Repo, GitCommit, Decision

router = APIRouter()


@router.get("/activity/{repo_id}")
def commit_activity(repo_id: int, session: Session = Depends(get_session)):
    """Commits grouped by month for the last 12 months."""
    commits = session.exec(select(GitCommit).where(GitCommit.repo_id == repo_id)).all()

    monthly: dict = defaultdict(lambda: {"total": 0, "fix": 0, "revert": 0, "significant": 0})
    for c in commits:
        key = c.date.strftime("%Y-%m")
        monthly[key]["total"] += 1
        if c.is_revert:
            monthly[key]["revert"] += 1
        if "fix" in c.tags:
            monthly[key]["fix"] += 1
        if "significant" in c.tags:
            monthly[key]["significant"] += 1

    return [{"month": k, **v} for k, v in sorted(monthly.items())[-12:]]


@router.get("/breakdown/{repo_id}")
def commit_breakdown(repo_id: int, session: Session = Depends(get_session)):
    """Commit type breakdown for pie chart."""
    commits = session.exec(select(GitCommit).where(GitCommit.repo_id == repo_id)).all()
    total = len(commits)
    if total == 0:
        return []

    fix = sum(1 for c in commits if "fix" in c.tags and not c.is_revert)
    revert = sum(1 for c in commits if c.is_revert)
    significant = sum(1 for c in commits if "significant" in c.tags and not c.is_revert)
    other = total - fix - revert - significant

    return [
        {"name": "Fix", "value": fix, "color": "#ef4444"},
        {"name": "Revert", "value": revert, "color": "#f97316"},
        {"name": "Refactor", "value": significant, "color": "#3b82f6"},
        {"name": "Other", "value": other, "color": "#374151"},
    ]


@router.get("/hotspots/{repo_id}")
def hotspot_files(repo_id: int, session: Session = Depends(get_session)):
    """Top files by churn — most frequently changed, weighted by fix/revert."""
    repo = session.get(Repo, repo_id)
    if not repo:
        raise HTTPException(status_code=404)

    try:
        git_repo = GitRepo(repo.local_path)
    except (InvalidGitRepositoryError, Exception):
        return []

    file_stats: dict = defaultdict(lambda: {"changes": 0, "fix_changes": 0, "revert_changes": 0})
    commits = session.exec(select(GitCommit).where(GitCommit.repo_id == repo_id)).all()
    commit_map = {c.hash: c for c in commits}

    for commit in git_repo.iter_commits(max_count=500):
        short = commit.hexsha[:8]
        meta = commit_map.get(short)
        for filepath in commit.stats.files:
            # Only track source files
            if any(filepath.endswith(ext) for ext in (".js", ".ts", ".py", ".go", ".java", ".rb", ".tsx", ".jsx")):
                file_stats[filepath]["changes"] += 1
                if meta and "fix" in meta.tags:
                    file_stats[filepath]["fix_changes"] += 1
                if meta and meta.is_revert:
                    file_stats[filepath]["revert_changes"] += 1

    # Risk score = changes + 2×fix_changes + 3×revert_changes
    scored = [
        {
            "file": f,
            "changes": s["changes"],
            "fix_changes": s["fix_changes"],
            "revert_changes": s["revert_changes"],
            "risk_score": s["changes"] + 2 * s["fix_changes"] + 3 * s["revert_changes"],
        }
        for f, s in file_stats.items()
    ]
    return sorted(scored, key=lambda x: -x["risk_score"])[:10]


@router.get("/decision-velocity/{repo_id}")
def decision_velocity(repo_id: int, session: Session = Depends(get_session)):
    """Decisions logged per month with outcome breakdown."""
    decisions = session.exec(select(Decision).where(Decision.repo_id == repo_id)).all()

    monthly: dict = defaultdict(lambda: {"good": 0, "regret": 0, "pending": 0})
    for d in decisions:
        key = d.created_at.strftime("%Y-%m")
        outcome = d.outcome or "pending"
        monthly[key][outcome] += 1

    return [{"month": k, **v} for k, v in sorted(monthly.items())]
