import ipaddress
import shutil
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


def _is_forbidden_address(addr: "ipaddress.IPv4Address | ipaddress.IPv6Address") -> bool:
    # Unmap IPv4-in-IPv6 (e.g. ::ffff:192.168.1.1) before checking
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    return (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    )


def _validate_url(url: str) -> None:
    """SSRF guard: validate scheme and resolve hostname to block private ranges.

    We validate at DNS-resolution time but clone with the original hostname so
    TLS certificates (bound to the hostname, not the IP) continue to work.
    The residual DNS-rebinding window is accepted as a pragmatic trade-off for
    a developer tool targeting public hosting services.
    """
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail="Only https:// URLs are allowed.")

    if not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL: no hostname.")

    # Reject git ext:: and similar protocol-injection strings
    if "::" in url:
        raise HTTPException(status_code=400, detail="Invalid URL.")

    try:
        results = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve hostname.")

    if not results:
        raise HTTPException(status_code=400, detail="No DNS results for hostname.")

    for *_, sockaddr in results:
        addr = ipaddress.ip_address(sockaddr[0])
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            addr = addr.ipv4_mapped
        if _is_forbidden_address(addr):
            raise HTTPException(status_code=400, detail="Private/internal addresses are not allowed.")


class ConnectRepoRequest(BaseModel):
    url: str
    name: str = ""


@router.post("")
def connect_repo(req: ConnectRepoRequest, session: Session = Depends(get_session)):
    _validate_url(req.url)

    existing = session.exec(select(Repo).where(Repo.url == req.url)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Repo already connected.")

    tmp_dir = tempfile.mkdtemp()
    try:
        GitRepo.clone_from(req.url, tmp_dir, depth=200)
    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Failed to clone: {e}")

    name = req.name or req.url.rstrip("/").split("/")[-1].replace(".git", "")
    repo = Repo(name=name, url=req.url, local_path=tmp_dir)
    session.add(repo)
    session.commit()
    session.refresh(repo)

    try:
        commits_parsed = parse_repo(repo.id, tmp_dir, session)
    except Exception as e:
        session.delete(repo)
        session.commit()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse repo: {e}")

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
