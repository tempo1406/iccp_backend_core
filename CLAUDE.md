# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ICCP (Internal Consulting Chatbot Platform) is a multi-tenant SaaS backend built with NestJS. It enables businesses to deploy RAG-based internal chatbots with full RBAC, document management, project management, and subscription billing. Each tenant (organization) has complete data isolation.

## Commands

```bash
# Development
npm run start:dev          # Hot-reload dev server
npm run build              # Compile TypeScript to dist/
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting

# Testing
npm run test               # Unit tests (Jest)
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # End-to-end tests (test/ directory)

# Database
npm run migration:generate -- --name=MigrationName   # Generate from entity changes
npm run migration:run      # Apply pending migrations
npm run migration:revert   # Revert last migration
npm run seed:dev           # Seed development data

# Docker
npm run docker:dev         # Start dev stack (postgres:5433, redis, app)
npm run docker:prod        # Start production stack with nginx

# NestJS CLI shortcuts (from note.md)
nest g gu guard/name-guard          # Generate guard
nest g resource name-resource       # Generate full module resource
```

## Architecture

### Module Pattern
Each feature module in `src/modules/` follows this structure:
- `*.module.ts` — NestJS module declaration
- `*.controller.ts` — HTTP endpoints
- `*.service.ts` — Business logic
- `entities/*.entity.ts` — TypeORM entities
- `dto/` — Request/response DTOs validated with class-validator

### Path Aliases (tsconfig.json)
| Alias | Resolves to |
|-------|-------------|
| `@modules/*` | `src/modules/*` |
| `@common/*` | `src/common/*` |
| `@configs/*` | `src/configs/*` |
| `@guards/*` | `src/guards/*` |
| `@decorators/*` | `src/common/decorators/*` |
| `@database/*` | `src/database/*` |
| `@utils/*` | `src/utils/*` |
| `@enums/*` | `src/common/enums/*` |
| `@types/*` | `src/common/types/*` |

### Key Architectural Concepts

**Multi-tenancy:** All data is scoped to organizations. Guards and decorators enforce organization/project context on every request.

**RBAC:** Two-level permission system — system-level roles (`SystemRole` enum in `src/common/enums/`) and organization/project-scoped roles managed by the `rbac` module. Custom guards in `src/guards/` enforce both.

**Authentication:** JWT-based with access + refresh tokens. Passport strategies in `src/modules/auth/`. The `@Public()` decorator in `src/common/decorators/` bypasses the global JWT guard. `@GetUser()` extracts the authenticated user from the request.

**Transactions:** Uses `typeorm-transactional` for ACID compliance — wrap service methods with `@Transactional()`.

**Events:** `EventEmitterModule` drives async side effects (e.g., notifications after document upload). Listen in services with `@OnEvent()`.

**WebSocket:** `src/modules/websocket/` contains the Socket.io gateway with its own auth guard. Real-time notifications are pushed here.

**Swagger:** Auto-generated from decorators via `@nestjs/swagger` plugin (configured in `nest-cli.json`). Access at `http://localhost:<port>/api-docs`.

### Environment
- Development: `.env.dev`
- Production: `.env.prod`
- See `.env.example` for all required variables (DB, Redis, JWT, Mail, ImageKit, OTP settings)

### Database Migrations
Migrations live in two directories:
- `src/database/migrations/schemas/` — schema-level migrations
- `src/database/migrations/tables/` — table-level migrations

Migrations run automatically on startup via `entrypoint.sh` in the Docker prod setup.

### Deployment
CI/CD via `.github/workflows/deploy.yml` — push to `develop` triggers SSH deploy to VPS, rebuilds Docker image, runs migrations, restarts NGINX.
