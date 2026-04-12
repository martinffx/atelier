# Fastify Plugin Architecture

Fastify plugins enable modular, testable dependency injection using the `fastify-plugin` wrapper.

## Core Concept

Plugins:
- Encapsulate related functionality (repos, services, auth, etc.)
- Use decorators to add properties to the Fastify instance
- Enable dependency injection through plugin registration order
- Support plugin-level scoping and encapsulation

## Basic Plugin

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'

// Define what the plugin adds to FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    config: {
      databaseUrl: string
      jwtSecret: string
    }
  }
}

const ConfigPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.decorate('config', {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
  })
}

// Wrap with fp() to prevent plugin encapsulation
export default fp(ConfigPlugin)
```

## Repository Plugin

Provide database access layer to the application:

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { UserRepo } from './repo/UserRepo'
import { PostRepo } from './repo/PostRepo'

// Extend FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    repo: Repos
  }
}

interface Repos {
  userRepo: UserRepo
  postRepo: PostRepo
}

interface RepoPluginOptions {
  db?: ReturnType<typeof drizzle>
  repos?: Partial<Repos>
}

const RepoPlugin: FastifyPluginAsync<RepoPluginOptions> = async (
  server: FastifyInstance,
  opts: RepoPluginOptions
) => {
  // Use provided db or create from config
  const db = opts.db ?? drizzle(server.config.databaseUrl, { schema })

  // Use provided repos or create new instances
  const repos: Repos = {
    userRepo: opts.repos?.userRepo ?? new UserRepo(db),
    postRepo: opts.repos?.postRepo ?? new PostRepo(db),
  }

  server.decorate('repo', repos)
}

export default fp(RepoPlugin)
```

## Service Plugin

Business logic layer that depends on repositories:

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { UserService } from './services/UserService'
import { PostService } from './services/PostService'

declare module 'fastify' {
  interface FastifyInstance {
    services: Services
  }
}

interface Services {
  userService: UserService
  postService: PostService
}

interface ServicePluginOptions {
  services?: Partial<Services>
}

const ServicePlugin: FastifyPluginAsync<ServicePluginOptions> = async (
  server: FastifyInstance,
  opts: ServicePluginOptions
) => {
  // Services depend on repos (registered by RepoPlugin)
  const services: Services = {
    userService: opts.services?.userService ?? new UserService(server.repo.userRepo),
    postService: opts.services?.postService ?? new PostService(server.repo.postRepo),
  }

  server.decorate('services', services)
}

export default fp(ServicePlugin)
```

## Router Plugin

HTTP routes that depend on services:

```typescript
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { userRoutes } from './routes/users'
import { postRoutes } from './routes/posts'

// Note: No fp() wrapper - routers should be encapsulated
const RouterPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Routes can access server.services.* and server.repo.*
  await server.register(userRoutes, { prefix: '/users' })
  await server.register(postRoutes, { prefix: '/posts' })
}

export default RouterPlugin
```

## Auth Plugin

Authentication and authorization middleware:

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    token: {
      userId: string
      role: string
      permissions: string[]
    }
  }

  interface FastifyInstance {
    hasPermissions: (required: string[]) => (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
  }
}

const AuthPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Register JWT plugin
  await server.register(jwt, {
    secret: server.config.jwtSecret,
  })

  // Add hasPermissions decorator
  server.decorate('hasPermissions', (requiredPermissions: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // JWT verification
      try {
        const payload = await request.jwtVerify()
        request.token = payload as typeof request.token
      } catch (error) {
        throw new UnauthorizedError('Invalid token')
      }

      // Permission check
      for (const permission of requiredPermissions) {
        if (!request.token.permissions.includes(permission)) {
          throw new ForbiddenError(`Missing permission: ${permission}`)
        }
      }
    }
  })
}

export default fp(AuthPlugin)
```

## Server Composition

Assemble plugins in dependency order:

```typescript
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import ConfigPlugin from './plugins/config'
import AuthPlugin from './plugins/auth'
import RepoPlugin from './plugins/repo'
import ServicePlugin from './plugins/service'
import RouterPlugin from './plugins/router'

export const buildServer = async (opts?: {
  repoPluginOpts?: RepoPluginOptions
  servicePluginOpts?: ServicePluginOptions
}) => {
  const server = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Register plugins in dependency order
  await server.register(ConfigPlugin)      // 1. Config (no dependencies)
  await server.register(AuthPlugin)        // 2. Auth (needs config)
  await server.register(RepoPlugin, opts?.repoPluginOpts)  // 3. Repos (needs config)
  await server.register(ServicePlugin, opts?.servicePluginOpts)  // 4. Services (needs repos)
  await server.register(RouterPlugin, { prefix: '/api' })  // 5. Routes (needs services)

  // Set global error handler
  server.setErrorHandler(globalErrorHandler)

  return server
}

// Start server
const server = await buildServer()
await server.listen({ port: 3000, host: '0.0.0.0' })
```

## Testable Plugin Structure

Enable dependency injection for testing:

```typescript
// test/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../src/server'
import type { FastifyInstance } from 'fastify'

describe('User API', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    // Mock repos for testing
    const mockUserRepo = {
      getById: async (id: string) => mockUser,
      create: async (entity: UserEntity) => entity,
    }

    server = await buildServer({
      repoPluginOpts: {
        repos: { userRepo: mockUserRepo as any },
      },
    })
  })

  afterAll(async () => {
    await server.close()
  })

  it('should create a user', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: { name: 'Alice', email: 'alice@example.com' },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
    })
  })
})
```

## Plugin with Lifecycle Hooks

Clean up resources on server shutdown:

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

const DatabasePlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Create connection pool
  const pool = new Pool({ connectionString: server.config.databaseUrl })
  const db = drizzle(pool)

  server.decorate('db', db)

  // Close pool on server shutdown
  server.addHook('onClose', async (instance) => {
    instance.log.info('Closing database connection pool')
    await pool.end()
  })
}

export default fp(DatabasePlugin)
```

## Guidelines

1. **Use `fp()` wrapper** - Wrap utility plugins to prevent scope encapsulation
2. **Don't wrap routers** - Route plugins should remain encapsulated
3. **Register in dependency order** - Config → Auth → Repos → Services → Routes
4. **Extend FastifyInstance** - Use `declare module 'fastify'` for type safety
5. **Accept options** - Allow dependency injection via plugin options for testing
6. **Use decorators** - Add functionality to server with `server.decorate()`
7. **Cleanup in onClose** - Use lifecycle hooks to close connections, timers, etc.
8. **Async registration** - Use `await server.register()` for proper initialization order
9. **Type plugin options** - Define interface for plugin configuration
10. **Mock in tests** - Pass mock implementations via plugin options for unit testing
