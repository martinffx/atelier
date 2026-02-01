# Advanced Type Hints

## Generics

```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self):
        self.items: list[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()

stack: Stack[int] = Stack()
stack.push(1)
```

## Protocol

```python
from typing import Protocol

class Comparable(Protocol):
    def __lt__(self, other: object) -> bool:
        ...

def sort_items(items: list[Comparable]) -> list[Comparable]:
    return sorted(items)
```

## TypedDict

```python
from typing import TypedDict

class UserDict(TypedDict):
    id: int
    name: str
    email: str

def create_user(data: UserDict) -> User:
    return User(
        id=data["id"],
        name=data["name"],
        email=data["email"],
    )
```

## Literal

```python
from typing import Literal

Status = Literal["pending", "active", "inactive"]

def set_status(status: Status) -> None:
    ...

set_status("pending")  # OK
set_status("invalid")  # Type error
```

## ParamSpec

```python
from typing import Callable, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

def with_logging(func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper
```

## Self (Python 3.11+)

```python
from typing import Self

class Builder:
    def with_name(self, name: str) -> Self:
        self.name = name
        return self

    def build(self) -> Product:
        return Product(self.name)
```
