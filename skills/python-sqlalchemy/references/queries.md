# SQLAlchemy Queries

## Select Queries (2.0 Style)

```python
from sqlalchemy import select

# All records
stmt = select(User)
users = session.execute(stmt).scalars().all()

# With filter
stmt = select(User).where(User.is_active == True)
users = session.execute(stmt).scalars().all()

# Get one
stmt = select(User).where(User.id == 1)
user = session.execute(stmt).scalar_one()

# Get by ID
user = session.get(User, 1)
```

## Joins

```python
stmt = select(User, Order).join(Order, User.id == Order.user_id)
results = session.execute(stmt).all()

# With filter
stmt = select(User).join(User.orders).where(Order.total > 100)
users = session.execute(stmt).scalars().all()
```

## Aggregation

```python
from sqlalchemy import func

# Count
count = session.query(User).count()

# Sum
total = session.query(func.sum(Order.total)).scalar()

# Group by
stmt = select(User.id, func.count(Order.id)).join(Order).group_by(User.id)
results = session.execute(stmt).all()
```

## Pagination

```python
# Offset/limit
stmt = select(User).offset(skip).limit(limit)
users = session.execute(stmt).scalars().all()
```
