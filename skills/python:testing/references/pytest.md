# pytest Configuration and Patterns

## Configuration (pyproject.toml)

### Basic Setup

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "-ra",                # Show summary of all test outcomes
    "--strict-markers",   # Fail on unknown markers
    "--strict-config",    # Fail on invalid config
    "-v",                 # Verbose output
]
```

### With Coverage

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "-ra",
    "--strict-markers",
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-report=html",
    "--cov-fail-under=80",
]
```

### Markers

```toml
[tool.pytest.ini_options]
markers = [
    "unit: unit tests (no I/O)",
    "integration: integration tests (with I/O)",
    "slow: slow tests (takes >1s)",
    "db: database tests",
]
```

## Fixtures

### Database Session

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def test_db():
    """In-memory test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
```

### Application Client

```python
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def test_client():
    """FastAPI test client"""
    return TestClient(app)
```

### Auto-Use Fixtures for Setup/Teardown

```python
@pytest.fixture(autouse=True)
def reset_db(test_db):
    """Reset database before each test"""
    Base.metadata.drop_all(bind=test_db.bind)
    Base.metadata.create_all(bind=test_db.bind)
```

### Fixture Scope

```python
@pytest.fixture(scope="function")  # Default: per test
def data():
    ...

@pytest.fixture(scope="module")    # Per test file
def client():
    ...

@pytest.fixture(scope="session")   # For entire test run
def config():
    ...
```

### Parametrized Fixtures

```python
@pytest.fixture(params=[
    {"name": "Alice", "age": 25},
    {"name": "Bob", "age": 30},
    {"name": "Charlie", "age": 35},
])
def user_data(request):
    """Fixture provides multiple inputs"""
    return request.param

def test_user_creation(user_data):
    """Runs 3 times with different data"""
    user = User(**user_data)
    assert user.name is not None
```

### Fixture Dependencies

```python
@pytest.fixture
def test_db():
    """Database fixture"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

@pytest.fixture
def user_repository(test_db):
    """Repository depends on database"""
    return UserRepository(test_db)

def test_repository_save(user_repository):
    """Test uses repository (which uses database)"""
    user = User(id=1, name="Alice")
    user_repository.save(user)
    assert user_repository.get(1) is not None
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run specific file
pytest tests/test_entities.py

# Run specific test
pytest tests/test_entities.py::test_user_creation

# Run with pattern
pytest tests/test_*.py

# Verbose output
pytest -v

# Very verbose (shows parameters)
pytest -vv
```

### Filtering Tests

```bash
# Stop on first failure
pytest -x

# Stop after N failures
pytest --maxfail=3

# Show print statements
pytest -s

# Show local variables on failure
pytest -l

# Show durations of slowest tests
pytest --durations=10
```

### Markers

```bash
# Run only unit tests
pytest -m unit

# Skip slow tests
pytest -m "not slow"

# Run integration tests
pytest -m integration

# Run tests matching pattern
pytest -m "unit or integration"
```

### Coverage

```bash
# Generate coverage report
pytest --cov=src

# Show missing lines
pytest --cov=src --cov-report=term-missing

# Generate HTML report
pytest --cov=src --cov-report=html
# Open htmlcov/index.html in browser

# Fail if below threshold
pytest --cov=src --cov-fail-under=80
```

## Parametrize

### Multiple Inputs

```python
@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
    (4, 8),
])
def test_double(input, expected):
    assert double(input) == expected
```

### Multiple Parameters

```python
@pytest.mark.parametrize("x,y,expected", [
    (1, 2, 3),
    (2, 3, 5),
    (5, 5, 10),
])
def test_add(x, y, expected):
    assert add(x, y) == expected
```

### Parametrize Multiple Test Values

```python
@pytest.mark.parametrize("value", [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
])
def test_valid_email(value):
    assert is_valid_email(value)
```

### Combining Parametrize

```python
@pytest.mark.parametrize("user_type", ["admin", "user", "guest"])
@pytest.mark.parametrize("resource", ["posts", "comments", "users"])
def test_permissions(user_type, resource):
    """Tests all combinations (3×3 = 9 tests)"""
    has_access = check_access(user_type, resource)
    assert has_access is not None
```

## Markers

### Built-in Markers

```python
@pytest.mark.skip
def test_not_ready():
    """Skip this test"""
    ...

@pytest.mark.skip(reason="Not implemented yet")
def test_future():
    """Skip with reason"""
    ...

@pytest.mark.skipif(sys.version_info < (3, 10), reason="Requires 3.10+")
def test_new_syntax():
    """Skip conditionally"""
    ...

@pytest.mark.xfail
def test_known_bug():
    """Mark as expected to fail"""
    ...
```

### Custom Markers

```python
@pytest.mark.unit
def test_entity():
    ...

@pytest.mark.integration
def test_with_database():
    ...

@pytest.mark.slow
def test_expensive_computation():
    ...

@pytest.mark.db
def test_with_db():
    ...
```

## Test Organization

### Structure by Layer

```
tests/
├── unit/
│   ├── test_entities.py         # Entity tests
│   ├── test_services.py         # Service tests (mocked)
│   └── test_value_objects.py    # Value object tests
├── integration/
│   ├── test_repositories.py     # Repository tests (with DB)
│   └── test_endpoints.py        # Router tests (with client)
└── fixtures.py                  # Shared fixtures
```

### conftest.py for Shared Fixtures

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

@pytest.fixture
def test_db():
    """Shared database fixture"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_client():
    """Shared test client"""
    return TestClient(app)

# tests/test_entities.py
def test_product_creation(test_db):
    """Uses fixture from conftest.py"""
    ...
```

### Naming Conventions

```python
# File names
test_entities.py       # Tests for entities module
test_create_product.py # Tests for specific feature

# Test class (optional grouping)
class TestProduct:
    def test_creation(self):
        ...

    def test_validation(self):
        ...

# Test function names
def test_product_creation():        # What is tested
def test_product_with_discount():   # Behavior variant
def test_product_raises_on_invalid_price():  # Error case
```

## Assertions and Context

### assert with Message

```python
def test_with_message():
    result = calculate()
    assert result == 42, f"Expected 42 but got {result}"
```

### pytest.raises

```python
def test_raises_error():
    with pytest.raises(ValueError):
        invalid_operation()

def test_raises_with_match():
    with pytest.raises(ValueError, match="Invalid price"):
        Product(price=-10)

def test_raises_with_check():
    with pytest.raises(ValueError) as exc_info:
        invalid_operation()
    assert "specific message" in str(exc_info.value)
```

### pytest.approx for Floats

```python
def test_float_calculation():
    result = expensive_calculation()
    # Avoid exact equality with floats
    assert result == pytest.approx(3.14159, abs=0.0001)
```

### Comparing Collections

```python
def test_lists():
    result = get_items()
    assert result == [1, 2, 3]
    assert 2 in result
    assert len(result) == 3

def test_dicts():
    result = get_data()
    assert result == {"name": "Alice", "age": 25}
    assert result["name"] == "Alice"
    assert "email" not in result
```

## Debugging Failed Tests

### Print Debugging

```bash
# Show print statements
pytest -s

# Show print + traceback
pytest -s -vv

# Show local variables
pytest -l

# Full diff for collections
pytest -vv --tb=short
```

### Using pdb

```python
def test_with_debugger():
    result = complex_operation()
    # Drop into debugger on failure
    import pdb; pdb.set_trace()
    assert result == expected
```

### Test Reports

```bash
# Generate JUnit XML (for CI)
pytest --junit-xml=report.xml

# Generate JSON report
pytest --json-report --json-report-file=report.json

# Generate HTML report
pytest --html=report.html
```

## Performance Optimization

### Profile Test Execution

```bash
# Show slowest tests
pytest --durations=10

# Show all tests sorted by duration
pytest --durations=0
```

### Parallelize Tests

```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel (use N workers)
pytest -n auto
pytest -n 4
```

### Fixture Optimization

```python
# SLOW: Creates database for every test
@pytest.fixture(scope="function")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    ...

# FAST: Creates once per session (if tests don't modify schema)
@pytest.fixture(scope="session")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    ...
```
