import pytest
from app.database.session import Base, engine


@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
    if "sqlite" in str(engine.url):
        Base.metadata.create_all(bind=engine)
        yield
        Base.metadata.drop_all(bind=engine)
    else:
        yield
