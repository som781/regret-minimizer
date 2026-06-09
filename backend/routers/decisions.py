from datetime import datetime
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_, func
from pydantic import BaseModel
from backend.database import get_session
from backend.models import Decision

router = APIRouter()


class CreateDecisionRequest(BaseModel):
    repo_id: Optional[int] = None
    title: str
    description: str
    reasoning: str
    category: Optional[str] = None


class UpdateOutcomeRequest(BaseModel):
    outcome: Literal["good", "regret", "pending"]
    outcome_notes: Optional[str] = None


@router.post("")
def log_decision(req: CreateDecisionRequest, session: Session = Depends(get_session)):
    decision = Decision(**req.dict())
    session.add(decision)
    session.commit()
    session.refresh(decision)
    return decision


@router.get("")
def list_decisions(repo_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(Decision)
    if repo_id:
        query = query.where(Decision.repo_id == repo_id)
    return session.exec(query.order_by(Decision.created_at.desc())).all()


@router.get("/search")
def search_decisions(q: str = Query(...), session: Session = Depends(get_session)):
    q_lower = q.lower()
    rows = session.exec(
        select(Decision).where(
            or_(
                func.lower(Decision.title).contains(q_lower),
                func.lower(Decision.description).contains(q_lower),
            )
        )
    ).all()
    return rows


@router.patch("/{decision_id}/outcome")
def update_outcome(
    decision_id: int,
    req: UpdateOutcomeRequest,
    session: Session = Depends(get_session),
):
    decision = session.get(Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404)
    decision.outcome = req.outcome
    decision.outcome_notes = req.outcome_notes
    decision.resolved_at = datetime.utcnow()
    session.commit()
    session.refresh(decision)
    return decision
