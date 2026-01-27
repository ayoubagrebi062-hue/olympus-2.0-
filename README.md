# OLYMPUS 2.0

> AI-Powered SaaS Builder Platform - Build complete SaaS applications from natural language prompts

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

OLYMPUS is an AI-powered platform that transforms natural language descriptions into fully functional SaaS applications. Using a multi-agent architecture with specialized AI agents, OLYMPUS handles everything from frontend design to backend APIs, database schemas, and deployment.

## Features

- **Multi-Agent AI System** - Specialized agents for frontend, backend, design, database, and more
- **AI Output Validation** - Quality gates ensure generated code meets standards
- **Multi-Tenant Architecture** - Isolated workspaces for teams with role-based access
- **Real-time Build Progress** - Watch your application being built in real-time
- **One-Click Deployments** - Deploy to production with automatic SSL and CDN
- **Stripe Integration** - Built-in billing with usage-based pricing
- **GraphRAG Memory** - AI learns from your preferences and past builds

## Tech Stack

| Category         | Technologies                           |
| ---------------- | -------------------------------------- |
| **Framework**    | Next.js 14 (App Router)                |
| **Language**     | TypeScript                             |
| **Styling**      | Tailwind CSS                           |
| **Database**     | Supabase (PostgreSQL)                  |
| **Auth**         | Supabase Auth                          |
| **AI Providers** | Anthropic Claude, OpenAI, Groq, Ollama |
| **Vector DB**    | Qdrant                                 |
| **Graph DB**     | Neo4j                                  |
| **Cache**        | Redis / Upstash                        |
| **Payments**     | Stripe                                 |
| **Testing**      | Vitest, Playwright                     |

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for local databases)
- Supabase account
- Stripe account (for billing features)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd olympus-2.0

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

## Environment Variables

See [.env.example](.env.example) for all available environment variables with descriptions.

### Required Variables

| Variable                        | Description               |
| ------------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key |
| `STRIPE_SECRET_KEY`             | Stripe secret key         |
| `STRIPE_WEBHOOK_SECRET`         | Stripe webhook secret     |

### AI Provider Keys (at least one required)

| Variable            | Description               |
| ------------------- | ------------------------- |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key  |
| `OPENAI_API_KEY`    | OpenAI API key            |
| `GROQ_API_KEY`      | Groq API key              |
| `OLLAMA_BASE_URL`   | Ollama local instance URL |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/         # Login page
│   │   ├── signup/        # Signup page
│   │   └── ...
│   ├── (dashboard)/       # Protected dashboard
│   │   ├── dashboard/     # Main dashboard
│   │   ├── projects/      # Projects management
│   │   ├── builds/        # Build monitoring
│   │   ├── deployments/   # Deployment management
│   │   └── settings/      # User settings
│   └── api/               # API routes
│       ├── ai/            # AI endpoints
│       ├── auth/          # Auth endpoints
│       ├── billing/       # Billing endpoints
│       ├── builds/        # Build endpoints
│       ├── deployments/   # Deployment endpoints
│       ├── projects/      # Project endpoints
│       └── ...
├── components/            # React components
│   ├── auth/             # Auth components
│   ├── billing/          # Billing components
│   ├── realtime/         # Real-time components
│   └── storage/          # Storage components
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries
│   ├── agents/           # AI agent system
│   ├── api/              # API utilities
│   ├── auth/             # Auth utilities
│   ├── billing/          # Billing logic
│   ├── db/               # Database clients
│   ├── quality/          # Quality validation
│   └── ...
└── types/                # TypeScript types
```

## Available Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server                 |
| `npm run build`      | Build for production                     |
| `npm run start`      | Start production server                  |
| `npm run lint`       | Run ESLint                               |
| `npm run type-check` | Run TypeScript compiler check            |
| `npm run test`       | Run unit tests                           |
| `npm run test:e2e`   | Run end-to-end tests                     |
| `npm run test:full`  | Run all checks (type-check, lint, build) |

## Architecture

OLYMPUS uses a multi-agent architecture where specialized AI agents collaborate:

```
                    ┌─────────────────┐
                    │   Orchestrator  │
                    │    (Executor)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌───────▼───────┐
│   Frontend    │    │    Backend    │    │    Design     │
│     Agent     │    │     Agent     │    │     Agent     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Quality Gates  │
                    │  (Validation)   │
                    └─────────────────┘
```

## API Documentation

Full API documentation is available at:

- **OpenAPI Spec**: `/api/openapi` (when running)
- **Generated Docs**: [docs/generated/API.generated.md](docs/generated/API.generated.md)

## Documentation

| Document                                                     | Description                  |
| ------------------------------------------------------------ | ---------------------------- |
| [API Documentation](docs/generated/API.generated.md)         | Full API reference           |
| [Billing Guide](docs/BILLING.md)                             | Billing system documentation |
| [User Acceptance Criteria](docs/USER-ACCEPTANCE-CRITERIA.md) | UAC for features             |
| [Architecture Decisions](docs/adr/)                          | ADR documents                |

## Testing

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all checks
npm run test:full
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Run `npm run lint` before committing
- Add tests for new features

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with AI by OLYMPUS Team
