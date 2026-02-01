# MSW (Mock Service Worker) Patterns

Comprehensive guide to mocking HTTP requests at the network level using MSW with Vitest.

## Installation and Setup

### Dependencies

```bash
bun add -d msw
```

### Basic Server Setup

```typescript
// tests/setup.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { beforeAll, afterEach, afterAll } from 'vitest'

// Define default handlers
export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])
  }),
]

// Create server instance
export const server = setupServer(...handlers)

// Setup lifecycle hooks
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
})
```

## REST API Handlers

### HTTP Methods

```typescript
import { http, HttpResponse } from 'msw'

const handlers = [
  // GET
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: '1', name: 'Alice' }])
  }),

  // POST
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: '123', ...body },
      { status: 201 }
    )
  }),

  // PUT
  http.put('/api/users/:id', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: params.id, ...body })
  }),

  // PATCH
  http.patch('/api/users/:id', async ({ params, request }) => {
    const updates = await request.json()
    return HttpResponse.json({ id: params.id, ...updates })
  }),

  // DELETE
  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

### Path Parameters

```typescript
// Single parameter
http.get('/api/users/:id', ({ params }) => {
  const { id } = params
  return HttpResponse.json({ id, name: 'Alice' })
})

// Multiple parameters
http.get('/api/orgs/:orgId/repos/:repoId', ({ params }) => {
  const { orgId, repoId } = params
  return HttpResponse.json({
    org: orgId,
    repo: repoId,
    name: 'my-repo',
  })
})

// Wildcard
http.get('/api/files/*', ({ params }) => {
  const path = params[0] // matches everything after /files/
  return HttpResponse.json({ path })
})
```

### Query Parameters

```typescript
http.get('/api/users', ({ request }) => {
  const url = new URL(request.url)
  const page = url.searchParams.get('page') || '1'
  const limit = url.searchParams.get('limit') || '10'

  return HttpResponse.json({
    data: users.slice(
      (parseInt(page) - 1) * parseInt(limit),
      parseInt(page) * parseInt(limit)
    ),
    page: parseInt(page),
    total: users.length,
  })
})
```

### Request Headers

```typescript
http.get('/api/protected', ({ request }) => {
  const auth = request.headers.get('Authorization')

  if (!auth || !auth.startsWith('Bearer ')) {
    return new HttpResponse(null, {
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  const token = auth.substring(7)
  if (token !== 'valid-token') {
    return new HttpResponse(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 403 }
    )
  }

  return HttpResponse.json({ message: 'Access granted' })
})
```

### Request Body

```typescript
// JSON body
http.post('/api/users', async ({ request }) => {
  const body = await request.json()

  if (!body.email) {
    return HttpResponse.json(
      { error: 'Email required' },
      { status: 400 }
    )
  }

  return HttpResponse.json({ id: '123', ...body }, { status: 201 })
})

// Form data
http.post('/api/upload', async ({ request }) => {
  const formData = await request.formData()
  const file = formData.get('file')

  return HttpResponse.json({
    filename: file?.name,
    size: file?.size,
  })
})

// Text body
http.post('/api/webhook', async ({ request }) => {
  const body = await request.text()
  return new HttpResponse(null, { status: 200 })
})
```

## Response Types

### JSON Response

```typescript
http.get('/api/users', () => {
  return HttpResponse.json(
    { id: '1', name: 'Alice' },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'value',
      },
    }
  )
})
```

### Text Response

```typescript
http.get('/api/health', () => {
  return new HttpResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
})
```

### Binary Response

```typescript
http.get('/api/download', () => {
  const buffer = new ArrayBuffer(8)
  return new HttpResponse(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="file.bin"',
    },
  })
})
```

### Empty Response

```typescript
http.delete('/api/users/:id', () => {
  return new HttpResponse(null, { status: 204 })
})
```

## Error Responses

### HTTP Errors

```typescript
// 404 Not Found
http.get('/api/users/:id', ({ params }) => {
  return HttpResponse.json(
    { error: 'User not found' },
    { status: 404 }
  )
})

// 400 Bad Request
http.post('/api/users', async ({ request }) => {
  const body = await request.json()

  if (!body.email) {
    return HttpResponse.json(
      { error: 'Email is required', field: 'email' },
      { status: 400 }
    )
  }

  return HttpResponse.json(body)
})

// 500 Internal Server Error
http.get('/api/data', () => {
  return HttpResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
})
```

### Network Errors

```typescript
import { HttpResponse } from 'msw'

// Network error (connection failed)
http.get('/api/users', () => {
  return HttpResponse.error()
})

// Timeout (no response)
http.get('/api/slow', async () => {
  await new Promise(() => {}) // Never resolves
})
```

### Conditional Errors

```typescript
let failureCount = 0

http.get('/api/flaky', () => {
  failureCount++

  // Fail first 2 times, then succeed
  if (failureCount <= 2) {
    return HttpResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    )
  }

  return HttpResponse.json({ data: 'success' })
})
```

## Response Delays

### Fixed Delay

```typescript
import { delay, http, HttpResponse } from 'msw'

http.get('/api/slow', async () => {
  await delay(2000) // 2 second delay
  return HttpResponse.json({ data: 'delayed response' })
})
```

### Random Delay

```typescript
http.get('/api/variable', async () => {
  const delayMs = Math.random() * 1000 // 0-1 second
  await delay(delayMs)
  return HttpResponse.json({ data: 'response' })
})
```

### Realistic Network Delays

```typescript
const handlers = [
  http.get('/api/users', async () => {
    await delay('real') // Use realistic network latency
    return HttpResponse.json(users)
  }),
]
```

### Test Loading States

```typescript
it('shows loading spinner', async () => {
  server.use(
    http.get('/api/users', async () => {
      await delay(1000)
      return HttpResponse.json(users)
    })
  )

  render(<UserList />)

  // Verify loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument()

  // Wait for data
  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
```

## Per-Test Overrides

### Runtime Handler Override

```typescript
import { server } from './tests/setup'
import { http, HttpResponse } from 'msw'

it('handles user not found', async () => {
  // Override for this test only
  server.use(
    http.get('/api/users/:id', ({ params }) => {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    })
  )

  const result = await fetchUser('999')
  expect(result.error).toBe('User not found')
})

// Handler automatically resets after test (via afterEach hook)
```

### Multiple Overrides

```typescript
it('handles multiple error scenarios', async () => {
  server.use(
    // Override user endpoint
    http.get('/api/users/:id', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }),

    // Override posts endpoint
    http.get('/api/posts', () => {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
    })
  )

  // Test both scenarios
  await expect(fetchUser('1')).rejects.toThrow()
  await expect(fetchPosts()).rejects.toThrow()
})
```

### One-Time Override

```typescript
it('simulates temporary outage', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.error(), { once: true })
  )

  // First call fails
  await expect(fetchUsers()).rejects.toThrow()

  // Second call uses default handler (succeeds)
  const users = await fetchUsers()
  expect(users).toHaveLength(2)
})
```

## TypeScript Integration

### Typed Request Bodies

```typescript
interface CreateUserRequest {
  name: string
  email: string
  age?: number
}

interface User extends CreateUserRequest {
  id: string
}

http.post<never, CreateUserRequest, User>('/api/users', async ({ request }) => {
  const body = await request.json()

  // body is typed as CreateUserRequest
  const user: User = {
    id: crypto.randomUUID(),
    ...body,
  }

  return HttpResponse.json(user, { status: 201 })
})
```

### Typed Path Parameters

```typescript
interface UserParams {
  id: string
}

http.get<UserParams>('/api/users/:id', ({ params }) => {
  // params.id is typed as string
  return HttpResponse.json({
    id: params.id,
    name: 'Alice',
  })
})
```

### Type-Safe Responses

```typescript
interface ApiResponse<T> {
  data: T
  meta: {
    page: number
    total: number
  }
}

http.get('/api/users', (): HttpResponse<ApiResponse<User[]>> => {
  return HttpResponse.json({
    data: users,
    meta: { page: 1, total: users.length },
  })
})
```

## GraphQL Handlers

### Basic GraphQL Setup

```typescript
import { graphql, HttpResponse } from 'msw'

const handlers = [
  graphql.query('GetUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: {
          id: variables.id,
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    })
  }),

  graphql.mutation('CreateUser', async ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: {
          id: '123',
          name: variables.name,
          email: variables.email,
        },
      },
    })
  }),
]
```

### GraphQL Errors

```typescript
graphql.query('GetUser', ({ variables }) => {
  return HttpResponse.json({
    errors: [
      {
        message: 'User not found',
        extensions: { code: 'NOT_FOUND' },
      },
    ],
  })
})
```

### Multiple GraphQL Endpoints

```typescript
const handlers = [
  // Main API
  graphql.query('GetUser', () => { /* ... */ }),

  // Admin API
  graphql.link('https://admin.example.com/graphql').query('GetStats', () => {
    return HttpResponse.json({ data: { stats: {} } })
  }),
]
```

## Advanced Patterns

### Stateful Handlers

```typescript
let users: User[] = []

const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json(users)
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    const user = { id: crypto.randomUUID(), ...body }
    users.push(user)
    return HttpResponse.json(user, { status: 201 })
  }),

  http.delete('/api/users/:id', ({ params }) => {
    users = users.filter(u => u.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]

// Reset state between tests
beforeEach(() => {
  users = []
})
```

### Paginated Responses

```typescript
http.get('/api/users', ({ request }) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')

  const start = (page - 1) * limit
  const end = start + limit

  return HttpResponse.json({
    data: allUsers.slice(start, end),
    pagination: {
      page,
      limit,
      total: allUsers.length,
      pages: Math.ceil(allUsers.length / limit),
    },
  })
})
```

### File Upload Handling

```typescript
http.post('/api/upload', async ({ request }) => {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return HttpResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    )
  }

  if (file.size > 1024 * 1024 * 5) { // 5MB
    return HttpResponse.json(
      { error: 'File too large' },
      { status: 413 }
    )
  }

  return HttpResponse.json({
    id: crypto.randomUUID(),
    filename: file.name,
    size: file.size,
    type: file.type,
  })
})
```

### Conditional Responses

```typescript
http.get('/api/users/:id', ({ params, request }) => {
  const userId = params.id
  const auth = request.headers.get('Authorization')

  // Not authenticated
  if (!auth) {
    return new HttpResponse(null, { status: 401 })
  }

  // User not found
  const user = users.find(u => u.id === userId)
  if (!user) {
    return HttpResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  // Success
  return HttpResponse.json(user)
})
```

## Testing Patterns

### Testing Error Handling

```typescript
it('handles network errors', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.error())
  )

  await expect(fetchUsers()).rejects.toThrow('Network error')
})

it('handles 404 responses', async () => {
  server.use(
    http.get('/api/users/:id', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    })
  )

  await expect(fetchUser('999')).rejects.toThrow('User not found')
})
```

### Testing Retry Logic

```typescript
it('retries failed requests', async () => {
  let attempts = 0

  server.use(
    http.get('/api/users', () => {
      attempts++
      if (attempts < 3) {
        return HttpResponse.json(
          { error: 'Service unavailable' },
          { status: 503 }
        )
      }
      return HttpResponse.json(users)
    })
  )

  const result = await fetchUsersWithRetry()

  expect(attempts).toBe(3)
  expect(result).toEqual(users)
})
```

### Testing Optimistic Updates

```typescript
it('handles optimistic update failure', async () => {
  server.use(
    http.put('/api/users/:id', () => {
      return HttpResponse.json(
        { error: 'Update failed' },
        { status: 500 }
      )
    })
  )

  render(<UserProfile userId="123" />)

  // Make optimistic update
  fireEvent.click(screen.getByText('Update Name'))

  // Should show optimistic state
  expect(screen.getByText('New Name')).toBeInTheDocument()

  // Wait for error and rollback
  await waitFor(() => {
    expect(screen.getByText('Old Name')).toBeInTheDocument()
    expect(screen.getByText('Update failed')).toBeInTheDocument()
  })
})
```

## Guidelines

1. **Setup once, override per-test** - Define default handlers in setup file, override in individual tests
2. **Reset handlers between tests** - Use `server.resetHandlers()` in `afterEach` hook
3. **Use realistic delays** - Test loading states with `delay()` function
4. **Type your handlers** - Use TypeScript generics for request/response types
5. **Mock at network level** - Better than mocking fetch directly, works with any HTTP client
6. **Test error scenarios** - Use MSW to simulate network errors, timeouts, HTTP errors
7. **Keep handlers simple** - Complex logic should be tested separately, not in mock handlers
8. **Use stateful handlers sparingly** - Can make tests interdependent, prefer isolated state
9. **Fail on unhandled requests** - Use `onUnhandledRequest: 'error'` to catch missing mocks
10. **Group related handlers** - Organize handlers by feature or API domain
11. **Document conditional behavior** - Add comments when handlers have complex logic
12. **Test pagination separately** - Create dedicated handlers for pagination edge cases

## Common Pitfalls

### Missing Handler Resets

```typescript
// BAD - handlers persist across tests
afterEach(() => {
  // Forgot to reset handlers
})

// GOOD - reset after each test
afterEach(() => {
  server.resetHandlers()
})
```

### Over-Mocking

```typescript
// BAD - mocking too much detail
http.get('/api/users', () => {
  return HttpResponse.json({
    data: users,
    meta: { timestamp: Date.now(), version: '1.0', ... },
    debug: { queryTime: 123, ... },
  })
})

// GOOD - mock only what tests need
http.get('/api/users', () => {
  return HttpResponse.json(users)
})
```

### Forgetting async/await

```typescript
// BAD - not awaiting request.json()
http.post('/api/users', ({ request }) => {
  const body = request.json() // Missing await!
  return HttpResponse.json(body)
})

// GOOD - await async operations
http.post('/api/users', async ({ request }) => {
  const body = await request.json()
  return HttpResponse.json(body)
})
```

### Not Handling Headers

```typescript
// BAD - ignoring auth headers in tests
http.get('/api/protected', () => {
  return HttpResponse.json({ data: 'secret' })
})

// GOOD - verify auth in mock
http.get('/api/protected', ({ request }) => {
  const auth = request.headers.get('Authorization')
  if (!auth) {
    return new HttpResponse(null, { status: 401 })
  }
  return HttpResponse.json({ data: 'secret' })
})
```
