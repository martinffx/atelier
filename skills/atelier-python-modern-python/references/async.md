# Async/Await Patterns

## Basic Async

```python
import asyncio

async def fetch_user(user_id: int) -> User:
    """Async function"""
    await asyncio.sleep(1)  # Simulate IO
    return User(id=user_id)

# Run async function
user = await fetch_user(1)

# Or from sync code
user = asyncio.run(fetch_user(1))
```

## Concurrent Execution

```python
async def process_all(user_ids: list[int]):
    """Process multiple users concurrently"""
    tasks = [fetch_user(id) for id in user_ids]
    users = await asyncio.gather(*tasks)
    return users
```

## Async Context Managers

```python
class AsyncDB:
    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *args):
        await self.disconnect()

async with AsyncDB() as db:
    result = await db.query(...)
```

## Async Iterators

```python
class AsyncRange:
    def __init__(self, n: int):
        self.n = n
        self.i = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.i >= self.n:
            raise StopAsyncIteration
        self.i += 1
        await asyncio.sleep(0.1)
        return self.i

async for i in AsyncRange(10):
    print(i)
```

## Error Handling

```python
async def safe_fetch(url: str):
    try:
        return await fetch_data(url)
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return None
```
