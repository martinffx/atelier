# Mocking and Stubbing Strategies

Stub external dependencies to isolate units under test. Use at layer boundaries.

## unittest.mock Basics

### Mock Objects

```python
from unittest.mock import Mock

# Create mock
mock_repo = Mock()

# Configure return value
mock_repo.get.return_value = User(id=1, name="Alice")

# Call mock
user = mock_repo.get(1)

# Verify it was called
mock_repo.get.assert_called_once_with(1)
```

### MagicMock for Chaining

```python
from unittest.mock import MagicMock

# MagicMock supports method chaining
mock_db = MagicMock()
mock_db.query.return_value.filter.return_value.first.return_value = UserRecord()

# Chain calls work
user = mock_db.query(User).filter(User.id == 1).first()
assert user is not None
```

### patch Decorator

```python
from unittest.mock import patch

# Patch module-level dependency
@patch("my_module.DatabaseSession")
def test_with_patched_db(mock_db_class):
    """Patch is applied for duration of test"""
    mock_db_class.return_value = Mock()

    service = UserService()  # Gets patched DatabaseSession
    # Test code
```

### patch as Context Manager

```python
from unittest.mock import patch

def test_with_patch_context():
    """Patch applied only within context"""
    with patch("my_module.external_api_call") as mock_api:
        mock_api.return_value = {"status": "success"}

        result = process_data()

        assert result["status"] == "success"
```

### spec Parameter

```python
from unittest.mock import Mock

# Mock with spec restricts to real attributes
mock_repo = Mock(spec=UserRepository)

# This works (real method on UserRepository)
mock_repo.save()

# This fails with AttributeError (not real method)
with pytest.raises(AttributeError):
    mock_repo.invalid_method()
```

## Verification Methods

### assert_called_once

```python
mock_obj = Mock()

# Called exactly once
mock_obj.method()
mock_obj.method.assert_called_once()

# With arguments
mock_obj.method(42, "test")
mock_obj.method.assert_called_once_with(42, "test")
```

### assert_called

```python
mock_obj = Mock()

# Called at least once
mock_obj.method()
mock_obj.method()
mock_obj.method.assert_called()  # Passes
```

### assert_called_with

```python
mock_obj = Mock()

# Called with specific arguments
mock_obj.method(1, 2, 3)
mock_obj.method.assert_called_with(1, 2, 3)  # Passes

mock_obj.method.assert_called_with(1, 2)  # Fails - wrong args
```

### assert_not_called

```python
mock_obj = Mock()

# Never called
mock_obj.method.assert_not_called()  # Passes

mock_obj.method()
mock_obj.method.assert_not_called()  # Fails
```

### call_count

```python
mock_obj = Mock()

mock_obj.method()
mock_obj.method()
mock_obj.method()

assert mock_obj.method.call_count == 3
```

### Multiple Calls

```python
from unittest.mock import call

mock_obj = Mock()

mock_obj.method(1)
mock_obj.method(2)
mock_obj.method(3)

mock_obj.method.assert_has_calls([
    call(1),
    call(2),
    call(3),
])
```

## pytest-mock Integration

### mocker Fixture

```python
def test_with_mocker(mocker):
    """pytest-mock provides cleaner patching"""
    # Patch and get mock in one call
    mock_db = mocker.patch("my_module.get_db")
    mock_db.return_value = Mock()

    service = UserService()
    # Test code
```

### Compared to unittest.mock

```python
# unittest.mock (verbose)
@patch("my_module.get_db")
def test_with_patch(mock_db):
    mock_db.return_value = Mock()
    ...

# pytest-mock (cleaner)
def test_with_mocker(mocker):
    mock_db = mocker.patch("my_module.get_db")
    mock_db.return_value = Mock()
    ...
```

## Common Mocking Patterns

### Service with Mocked Repository

```python
def test_create_product_service():
    """Mock repository dependency"""
    # Create mock
    mock_repo = Mock(spec=ProductRepository)
    mock_repo.save.return_value = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("9.99"),
    )

    # Create service with mock
    service = ProductService(repo=mock_repo)

    # Call service
    request = CreateProductRequest(name="Widget", price=Decimal("9.99"))
    result = service.create(request)

    # Verify interactions
    mock_repo.save.assert_called_once()
    assert result.name == "Widget"
```

### Service with Mocked External API

```python
@patch("my_module.stripe.charge")
def test_process_payment(mock_stripe):
    """Mock external service call"""
    mock_stripe.return_value = {"status": "succeeded"}

    service = PaymentService()
    result = service.process_payment(Decimal("99.99"))

    mock_stripe.assert_called_once()
    assert result["status"] == "succeeded"
```

### Multiple Mocked Dependencies

```python
def test_complex_workflow(mocker):
    """Multiple mocks in one test"""
    mock_repo = mocker.patch("my_module.repository")
    mock_api = mocker.patch("my_module.external_api")
    mock_logger = mocker.patch("my_module.logger")

    mock_repo.get.return_value = {"id": 1}
    mock_api.call.return_value = {"result": "ok"}

    service = ComplexService()
    result = service.do_something(1)

    mock_repo.get.assert_called_once_with(1)
    mock_api.call.assert_called_once()
    mock_logger.info.assert_called()
```

### Side Effects for Complex Behavior

```python
def test_with_side_effect():
    """Mock returns different values on each call"""
    mock_obj = Mock()

    # Return different values
    mock_obj.method.side_effect = [1, 2, 3]

    assert mock_obj.method() == 1
    assert mock_obj.method() == 2
    assert mock_obj.method() == 3

def test_with_side_effect_exception():
    """Mock raises exception"""
    mock_obj = Mock()

    # Raise exception on call
    mock_obj.method.side_effect = ValueError("Test error")

    with pytest.raises(ValueError, match="Test error"):
        mock_obj.method()
```

### Partial Mocking with spec_set

```python
class UserRepository:
    def get(self, id):
        ...

    def save(self, user):
        ...

# spec_set prevents adding new attributes
mock_repo = Mock(spec_set=UserRepository)

mock_repo.get.return_value = User(id=1)

# This works
mock_repo.get(1)

# This fails - not on UserRepository
with pytest.raises(AttributeError):
    mock_repo.new_method()
```

## Fixture-Based Mocking

### Reusable Mock Fixtures

```python
import pytest
from unittest.mock import Mock

@pytest.fixture
def mock_repository():
    """Mock repository fixture"""
    mock = Mock(spec=UserRepository)
    mock.save.return_value = None
    mock.get.return_value = User(id=1, name="Test")
    return mock

@pytest.fixture
def mock_external_api():
    """Mock external API fixture"""
    mock = Mock()
    mock.call.return_value = {"status": "success"}
    return mock

def test_service_with_fixtures(mock_repository, mock_external_api):
    """Use mocked dependencies"""
    service = UserService(
        repo=mock_repository,
        api=mock_external_api,
    )

    result = service.create_user({"name": "Alice"})

    mock_repository.save.assert_called_once()
    assert result is not None
```

## Testing with Real vs Mock Objects

### When to Mock

```python
# GOOD: Mock external service
@patch("requests.post")
def test_send_notification(mock_post):
    """Don't actually call HTTP endpoints"""
    mock_post.return_value = Mock(status_code=200)

    service = NotificationService()
    result = service.send_email("test@example.com")

    assert result is True
```

### When to Use Real Objects

```python
# GOOD: Use real database for repository tests
def test_repository_save(test_db):
    """Test actual database behavior"""
    repo = UserRepository(test_db)
    user = User(id=1, name="Alice")

    repo.save(user)

    # Verify in database
    assert test_db.query(UserRecord).count() == 1
```

### Hybrid: Real + Mock

```python
def test_service_orchestration(test_db, mocker):
    """Real repository, mocked external API"""
    # Real database
    repo = UserRepository(test_db)

    # Mocked external API
    mock_api = mocker.patch("my_module.send_email")

    # Test service orchestration
    service = UserService(repo=repo, api=mock_api)
    result = service.create_and_notify({"name": "Alice"})

    # Both called
    assert test_db.query(UserRecord).count() == 1
    mock_api.assert_called_once()
```

## Anti-Patterns to Avoid

### Over-Mocking

```python
# BAD: Mocking everything
def test_service():
    mock_repo = Mock()
    mock_entity = Mock()
    mock_response = Mock()
    # Test is now testing mocks, not code

# GOOD: Mock at boundaries, use real objects internally
def test_service(test_db):
    repo = UserRepository(test_db)  # Real
    service = UserService(repo)      # Real
    result = service.get_user(1)     # Test actual behavior
```

### Tautological Mocks

```python
# BAD: Mock returns what we programmed it to return
def test_something():
    mock = Mock()
    mock.method.return_value = 42
    assert mock.method() == 42  # Always passes, tests nothing

# GOOD: Test real logic
def test_something():
    obj = RealObject()
    result = obj.calculate()
    assert result == expected
```

### Mock Drift

```python
# BAD: Mock doesn't match reality
class RealService:
    def process(self, data):
        return data.upper()

def test_service():
    mock_service = Mock()
    mock_service.process.return_value = "WRONG"  # Not what real does

    # Test passes but would fail with real service

# GOOD: Mock matches real behavior or test with real
def test_service():
    service = RealService()
    result = service.process("test")
    assert result == "TEST"
```
