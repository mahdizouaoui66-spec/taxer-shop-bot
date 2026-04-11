# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Discord Bot (`@workspace/bot`)

- **Library**: Discord.js v14
- **Location**: `bot/index.js`
- **Token**: Stored in `TOKEN` environment secret
- **Features**:
  - Welcome message in `#welcome` channel on member join (embed with avatar, username, account creation date)
  - Auto-response in `#feedbacks` channel when a user is mentioned
  - Ticket system: `!ticket` creates private channel, `!fermer` closes it after 5 seconds
- **Embed color**: `#7b2fff`
- **Required Discord intents**: Guilds, GuildMembers, GuildMessages, MessageContent
- **Required Discord server setup**: `#welcome` channel, `#feedbacks` channel, `Support` role

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
