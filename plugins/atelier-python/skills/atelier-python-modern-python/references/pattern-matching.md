# Pattern Matching (Python 3.10+)

## Basic Patterns

```python
def handle_status(code: int):
    match code:
        case 200:
            return "OK"
        case 404:
            return "Not Found"
        case 500:
            return "Server Error"
        case _:
            return "Unknown"
```

## Or Patterns

```python
match status:
    case 200 | 201 | 204:
        return "Success"
    case 400 | 404:
        return "Client Error"
    case 500 | 502 | 503:
        return "Server Error"
```

## Structural Patterns

```python
def process_point(point):
    match point:
        case (0, 0):
            return "Origin"
        case (x, 0):
            return f"X-axis at {x}"
        case (0, y):
            return f"Y-axis at {y}"
        case (x, y):
            return f"Point at ({x}, {y})"
```

## Class Patterns

```python
from dataclasses import dataclass

@dataclass
class Circle:
    radius: float

@dataclass
class Rectangle:
    width: float
    height: float

def area(shape):
    match shape:
        case Circle(radius=r):
            return 3.14 * r * r
        case Rectangle(width=w, height=h):
            return w * h
        case _:
            raise ValueError("Unknown shape")
```

## Guards

```python
match point:
    case (x, y) if x == y:
        return "On diagonal"
    case (x, y) if x > y:
        return "Above diagonal"
    case (x, y):
        return "Below diagonal"
```

## Nested Patterns

```python
match event:
    case {"type": "click", "position": (x, y)}:
        handle_click(x, y)
    case {"type": "key", "key": key_code}:
        handle_key(key_code)
```
