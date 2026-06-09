from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import create_db_and_tables
from backend.routers import repos, git, decisions, insights, analytics

app = FastAPI(title="Regret Minimizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(repos.router, prefix="/repos", tags=["repos"])
app.include_router(git.router, prefix="/git", tags=["git"])
app.include_router(decisions.router, prefix="/decisions", tags=["decisions"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@app.get("/health")
def health():
    return {"status": "ok"}
