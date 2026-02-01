# Layer Boundary Testing

Test at component boundaries, not internals. Each layer has specific test focus areas.

## What to Test at Each Layer

### Entity Layer
- ✅ Domain logic and validation
- ✅ Transformations (from_request, to_response, to_record)
- ✅ Business rules and calculated fields
- ❌ Simple getters/setters
- ❌ Python language features

### Repository Layer
- ✅ CRUD operations
- ✅ Query logic and filters
- ✅ Entity ↔ Record transformations
- ✅ Database constraints
- ❌ ORM framework code
- ❌ SQL generation

### Service Layer
- ✅ Business workflows and orchestration
- ✅ Error handling and validation
- ✅ Dependency coordination
- ✅ Complex logic
- ❌ Trivial delegation
- ❌ Single-line pass-throughs

### Router Layer
- ✅ Request validation and deserialization
- ✅ Response serialization
- ✅ Status codes and HTTP semantics
- ✅ Error response formatting
- ❌ Framework routing mechanics
- ❌ Dependency injection

## Entity Layer Examples

### Test Transformations

```python
from entities import Product
from decimal import Decimal
from uuid import uuid4

def test_product_from_request():
    """Test creation from request object"""
    request = CreateProductRequest(
        name="Widget",
        price=Decimal("9.99"),
        sku="SKU123"
    )

    product = Product.from_request(request)

    assert product.name == "Widget"
    assert product.price == Decimal("9.99")
    assert product.sku == "SKU123"
    assert isinstance(product.id, UUID)
    assert product.created_at is not None

def test_product_to_response():
    """Test transformation to API response"""
    product = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("9.99"),
        sku="SKU123",
        created_at=datetime.now(),
    )

    response = product.to_response()

    assert response.id == str(product.id)
    assert response.name == "Widget"
    assert response.price == 9.99  # Decimal → float

def test_product_to_record():
    """Test transformation to database record"""
    product = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("9.99"),
    )

    record = product.to_record()

    assert record.id == product.id
    assert record.name == "Widget"
    assert record.price == Decimal("9.99")
```

### Test Validation

```python
def test_product_validate_price():
    """Test price validation"""
    with pytest.raises(ValueError, match="Price must be positive"):
        Product(
            id=uuid4(),
            name="Widget",
            price=Decimal("-10"),
        )

def test_product_validate_name():
    """Test name is required"""
    with pytest.raises(ValueError, match="Name is required"):
        Product(
            id=uuid4(),
            name="",
            price=Decimal("9.99"),
        )
```

### Test Business Logic

```python
def test_product_apply_discount():
    """Test discount calculation"""
    product = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("100"),
    )

    discounted = product.apply_discount(Decimal("0.1"))

    assert discounted.price == Decimal("90")
    assert product.price == Decimal("100")  # Original unchanged

def test_product_tax_calculation():
    """Test tax on price"""
    product = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("100"),
    )

    tax = product.calculate_tax(Decimal("0.08"))

    assert tax == Decimal("8")
```

## Service Layer Examples

### Test Business Workflows

```python
from unittest.mock import Mock, call

def test_create_product_service():
    """Test service orchestration"""
    # Stub repository
    mock_repo = Mock()
    mock_repo.save.return_value = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("9.99"),
    )

    # Test service
    service = ProductService(repo=mock_repo)
    request = CreateProductRequest(name="Widget", price=Decimal("9.99"))

    result = service.create(request)

    # Verify repository was called
    mock_repo.save.assert_called_once()
    assert result.name == "Widget"

def test_apply_bulk_discount():
    """Test orchestration of complex business logic"""
    mock_repo = Mock()
    mock_repo.find_all.return_value = [
        Product(id=uuid4(), name="A", price=Decimal("100")),
        Product(id=uuid4(), name="B", price=Decimal("100")),
    ]
    mock_repo.save.return_value = None

    service = ProductService(repo=mock_repo)
    service.apply_bulk_discount(Decimal("0.1"))

    # Verify save called twice
    assert mock_repo.save.call_count == 2
```

### Test Error Handling

```python
def test_create_product_validation_error():
    """Test service error handling"""
    mock_repo = Mock()

    service = ProductService(repo=mock_repo)

    with pytest.raises(ValueError, match="Invalid price"):
        service.create(CreateProductRequest(
            name="Widget",
            price=Decimal("-10"),
        ))

    # Repository not called on validation error
    mock_repo.save.assert_not_called()
```

## Repository Layer Examples

### Test Data Access

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

def test_repository_save(test_db):
    """Test saving entity"""
    repo = ProductRepository(test_db)

    product = Product(
        id=uuid4(),
        name="Widget",
        price=Decimal("9.99"),
    )
    saved = repo.save(product)

    assert saved.id == product.id
    # Verify in database
    record = test_db.query(ProductRecord).filter_by(id=product.id).first()
    assert record is not None
    assert record.name == "Widget"

def test_repository_find_by_id(test_db):
    """Test retrieving entity by ID"""
    repo = ProductRepository(test_db)
    product_id = uuid4()

    # Create record
    test_db.add(ProductRecord(
        id=product_id,
        name="Widget",
        price=Decimal("9.99"),
    ))
    test_db.commit()

    # Find entity
    found = repo.find_by_id(product_id)

    assert found is not None
    assert found.id == product_id
    assert found.name == "Widget"

def test_repository_delete(test_db):
    """Test deleting entity"""
    repo = ProductRepository(test_db)
    product_id = uuid4()

    # Create record
    test_db.add(ProductRecord(id=product_id, name="Widget"))
    test_db.commit()

    # Delete
    repo.delete(product_id)

    # Verify deleted
    assert test_db.query(ProductRecord).filter_by(id=product_id).first() is None
```

### Test Query Logic

```python
def test_repository_find_by_name(test_db):
    """Test complex query"""
    repo = ProductRepository(test_db)

    # Insert test data
    test_db.add_all([
        ProductRecord(id=uuid4(), name="Widget A", price=Decimal("10")),
        ProductRecord(id=uuid4(), name="Widget B", price=Decimal("20")),
        ProductRecord(id=uuid4(), name="Gadget", price=Decimal("15")),
    ])
    test_db.commit()

    # Query
    results = repo.find_by_name("Widget")

    assert len(results) == 2
    assert all("Widget" in p.name for p in results)

def test_repository_find_expensive_products(test_db):
    """Test filtering"""
    repo = ProductRepository(test_db)

    test_db.add_all([
        ProductRecord(id=uuid4(), name="A", price=Decimal("10")),
        ProductRecord(id=uuid4(), name="B", price=Decimal("100")),
        ProductRecord(id=uuid4(), name="C", price=Decimal("200")),
    ])
    test_db.commit()

    results = repo.find_by_price_above(Decimal("50"))

    assert len(results) == 2
```

## Router Layer Examples

### Test HTTP Endpoints

```python
from fastapi.testclient import TestClient

def test_create_product_endpoint():
    """Test POST endpoint"""
    client = TestClient(app)

    response = client.post(
        "/products",
        json={"name": "Widget", "price": 9.99},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget"
    assert data["price"] == 9.99
    assert "id" in data

def test_get_product_endpoint(test_db):
    """Test GET endpoint"""
    client = TestClient(app)

    # Create product
    create_response = client.post(
        "/products",
        json={"name": "Widget", "price": 9.99},
    )
    product_id = create_response.json()["id"]

    # Get product
    response = client.get(f"/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["id"] == product_id

def test_update_product_endpoint():
    """Test PUT endpoint"""
    client = TestClient(app)

    # Create
    create_resp = client.post(
        "/products",
        json={"name": "Widget", "price": 9.99},
    )
    product_id = create_resp.json()["id"]

    # Update
    response = client.put(
        f"/products/{product_id}",
        json={"name": "Updated Widget", "price": 19.99},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Widget"
```

### Test Error Responses

```python
def test_get_nonexistent_product():
    """Test 404 response"""
    client = TestClient(app)

    response = client.get(f"/products/{uuid4()}")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_invalid_request_body():
    """Test 422 validation error"""
    client = TestClient(app)

    response = client.post(
        "/products",
        json={"name": "Widget"},  # Missing price
    )

    assert response.status_code == 422
```

## Testing Anti-Patterns to Avoid

### Don't Test Everything

```python
# BAD: Testing simple getters
def test_get_name():
    product = Product(id=uuid4(), name="Widget")
    assert product.name == "Widget"  # Trivial

# GOOD: Test meaningful business logic
def test_apply_discount_calculates_correctly():
    product = Product(id=uuid4(), price=Decimal("100"))
    discounted = product.apply_discount(Decimal("0.1"))
    assert discounted.price == Decimal("90")
```

### Don't Test Framework Code

```python
# BAD: Testing SQLAlchemy internals
def test_sqlalchemy_session():
    session = SessionLocal()
    assert session is not None  # Framework concern

# GOOD: Test your query logic
def test_find_by_price_returns_products():
    repo = ProductRepository(test_db)
    results = repo.find_by_price_above(Decimal("50"))
    assert all(p.price > 50 for p in results)
```

### Don't Over-Mock

```python
# BAD: Mocking too much
def test_service():
    mock_repo = Mock()
    mock_entity = Mock()
    mock_response = Mock()
    # Multiple layers of mocks make test fragile

# GOOD: Real objects, stubbed boundaries
def test_service(test_db):
    repo = ProductRepository(test_db)  # Real
    service = ProductService(repo)      # Real
    result = service.create(request)    # One boundary tested
```
