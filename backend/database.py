from sqlmodel import create_engine, SQLModel, Session

engine = create_engine("sqlite:///./regret_minimizer.db")


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
