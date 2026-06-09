import tempfile
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from git import Repo as GitRepo
from backend.database import get_session
from backend.models import Repo
from backend.services.git_service import parse_repo

router = APIRouter()


class ConnectRepoRequest(BaseModel):
    url: str
    name: str = ""


@router.post("")
def connect_repo(req: ConnectRepoRequest, session: Session = Depends(get_session)):
    tmp_dir = tempfile.mkdtemp()
    try:
        GitRepo.clone_from(req.url, tmp_dir, depth=200)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to clone: {e}")

    name = req.name or req.url.rstrip("/").split("/")[-1].replace(".git", "")
    repo = Repo(name=name, url=req.url, local_path=tmp_dir)
    session.add(repo)
    session.commit()
    session.refresh(repo)

    commits_parsed = parse_repo(repo.id, tmp_dir, session)
    return {"repo": repo, "commits_parsed": commits_parsed}


@router.get("")
def list_repos(session: Session = Depends(get_session)):
    return session.exec(select(Repo)).all()


@router.get("/{repo_id}")
def get_repo(repo_id: int, session: Session = Depends(get_session)):
    repo = session.get(Repo, repo_id)
    if not repo:
        raise HTTPException(status_code=404)
    return repo
