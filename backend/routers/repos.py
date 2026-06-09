import ipaddress
import socket
import tempfile
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from git import Repo as GitRepo
from backend.database import get_session
from backend.models import Repo
from backend.services.git_service import parse_repo

router = APIRouter()

_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def _validate_repo_url(url: str) -> None:
    parsed = urlparse(url)

    if parsed.scheme not in ("https",):
        raise HTTPException(status_code=400, detail="Only https:// URLs are allowed.")

    if not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL: no hostname.")

    # Reject git ext:: and similar protocol-injection patterns
    if "::" in url:
        raise HTTPException(status_code=400, detail="Invalid URL.")

    # Resolve hostname and block private/loopback/link-local addresses (SSRF guard)
    try:
        results = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve hostname.")

    for *_, sockaddr in results:
        addr = ipaddress.ip_address(sockaddr[0])
        if any(addr in net for net in _PRIVATE_NETWORKS):
            raise HTTPException(status_code=400, detail="Private/internal addresses are not allowed.")


class ConnectRepoRequest(BaseModel):
    url: str
    name: str = ""


@router.post("")
def connect_repo(req: ConnectRepoRequest, session: Session = Depends(get_session)):
    _validate_repo_url(req.url)

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
