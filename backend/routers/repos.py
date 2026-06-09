import ipaddress
import socket
import tempfile
from urllib.parse import urlparse, urlunparse

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


def _resolve_and_validate(hostname: str) -> str:
    """Resolve hostname once, validate every address, return the first IP.

    Uses a single getaddrinfo call so the returned IP is guaranteed to be
    one that was actually checked — no TOCTOU window between validation
    and use.
    """
    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve hostname.")

    if not results:
        raise HTTPException(status_code=400, detail="No DNS results for hostname.")

    for *_, sockaddr in results:
        addr = ipaddress.ip_address(sockaddr[0])
        if _is_forbidden_address(addr):
            raise HTTPException(status_code=400, detail="Private/internal addresses are not allowed.")

    return results[0][4][0]  # reuse — do NOT call getaddrinfo again


def _safe_clone_url(url: str) -> str:
    """
    Validate url and return a version with the hostname replaced by its
    resolved IP so libgit2 cannot re-resolve to a different address later
    (DNS rebinding mitigation).
    """
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail="Only https:// URLs are allowed.")

    if not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL: no hostname.")

    # Reject git ext:: and similar protocol-injection strings
    if "::" in url:
        raise HTTPException(status_code=400, detail="Invalid URL.")

    resolved_ip = _resolve_and_validate(parsed.hostname)

    # Substitute resolved IP for hostname so clone uses the pinned address
    netloc = f"[{resolved_ip}]" if ":" in resolved_ip else resolved_ip
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"

    return urlunparse(parsed._replace(netloc=netloc))


class ConnectRepoRequest(BaseModel):
    url: str
    name: str = ""


@router.post("")
def connect_repo(req: ConnectRepoRequest, session: Session = Depends(get_session)):
    clone_url = _safe_clone_url(req.url)

    tmp_dir = tempfile.mkdtemp()
    try:
        GitRepo.clone_from(clone_url, tmp_dir, depth=200)
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
