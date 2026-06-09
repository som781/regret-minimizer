from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import Decision, GitCommit

router = APIRouter()


@router.get("/{repo_id}")
def get_insights(repo_id: int, session: Session = Depends(get_session)):
    decisions = session.exec(select(Decision).where(Decision.repo_id == repo_id)).all()
    commits = session.exec(select(GitCommit).where(GitCommit.repo_id == repo_id)).all()

    total = len(decisions)
    good = regretted = 0
    for d in decisions:
        if d.outcome == "good":
            good += 1
        elif d.outcome == "regret":
            regretted += 1
    pending = total - good - regretted

    total_commits = len(commits)
    revert_count = significant = fix_count = 0
    for c in commits:
        if c.is_revert:
            revert_count += 1
        if "significant" in c.tags:
            significant += 1
        if "fix" in c.tags:
            fix_count += 1

    patterns = []
    if total > 0 and regretted / total > 0.3:
        patterns.append(f"{regretted} of {total} decisions were regretted — revisit your decision criteria.")
    if total_commits > 0 and revert_count / total_commits > 0.05:
        patterns.append(f"{revert_count} reverts in {total_commits} commits ({round(revert_count/total_commits*100,1)}%) — above healthy threshold.")
    if significant > 5:
        patterns.append(f"{significant} major rewrites/refactors detected — this codebase changes direction often.")
    if total_commits > 0 and fix_count / total_commits > 0.2:
        patterns.append(f"{fix_count} fix commits ({round(fix_count/total_commits*100,1)}%) — high bug rate suggests rushed decisions.")

    return {
        "decisions": {"total": total, "good": good, "regretted": regretted, "pending": pending},
        "commits": {
            "total": total_commits,
            "reverts": revert_count,
            "revert_rate": round(revert_count / total_commits * 100, 1) if total_commits else 0,
            "significant_changes": significant,
            "fix_commits": fix_count,
        },
        "patterns": patterns,
    }
