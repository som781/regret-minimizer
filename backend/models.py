from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Repo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    url: str
    local_path: str
    connected_at: datetime = Field(default_factory=datetime.utcnow)


class GitCommit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    repo_id: int = Field(foreign_key="repo.id")
    hash: str
    message: str
    author: str
    date: datetime
    files_changed: int
    is_revert: bool = False
    tags: str = ""  # comma-separated: revert, significant, fix


class Decision(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    repo_id: Optional[int] = Field(default=None, foreign_key="repo.id")
    title: str
    description: str
    reasoning: str
    outcome: Optional[str] = None  # good | regret | pending
    outcome_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
