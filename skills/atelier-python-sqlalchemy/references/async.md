# Async SQLAlchemy

## Setup

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

## Async Queries

```python
from sqlalchemy import select

async def get_users():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.is_active == True)
        result = await session.execute(stmt)
        return result.scalars().all()

async def create_user(user_data):
    async with AsyncSessionLocal() as session:
        user = User(**user_data)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
```

## FastAPI Integration

```python
from fastapi import Depends

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@app.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    stmt = select(User)
    result = await db.execute(stmt)
    return result.scalars().all()
```
