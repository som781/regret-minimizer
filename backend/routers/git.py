from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from backend.database import get_session
from backend.services.git_service import search_commits, get_repo_summary

router = APIRouter()


@router.get("/search")
def search_git_history(
    repo_id: int,
    q: str = Query(...),
    session: Session = Depends(get_session),
):
    return search_commits(repo_id, q, session)


@router.get("/summary/{repo_id}")
def repo_summary(repo_id: int, session: Session = Depends(get_session)):
    return get_repo_summary(repo_id, session)
