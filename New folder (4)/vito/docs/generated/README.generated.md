# olympus-2.0

> AI-powered SaaS builder platform

## Features

- Multi-agent AI system
- AI output validation
- REST API endpoints

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Neo4j
- MongoDB
- Redis
- Qdrant
- Supabase
- Anthropic Claude
- OpenAI
- Stripe
- Vitest
- Playwright

## Project Structure

```
src/
├── app
│   ├── (auth)
│   │   ├── callback
│   │   ├── forgot-password
│   │   ├── invitation
│   │   ├── layout.tsx
│   │   ├── login
│   │   ├── reset-password
│   │   ├── signup
│   │   └── verify-email
│   ├── (dashboard)
│   │   ├── builds
│   │   ├── dashboard
│   │   ├── deployments
│   │   ├── layout.tsx
│   │   ├── projects
│   │   └── settings
│   ├── api
│   │   ├── ai
│   │   ├── auth
│   │   ├── billing
│   │   ├── builds
│   │   ├── deployments
│   │   ├── health
│   │   ├── invitations
│   │   ├── jobs
│   │   ├── notifications
│   │   ├── openapi
│   │   ├── projects
│   │   ├── storage
│   │   └── tenants
│   ├── auth
│   │   └── callback
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── share
│       └── [shareId]
├── components
│   ├── auth
│   │   ├── AuthContext.ts
│   │   ├── AuthProvider.tsx
│   │   ├── AuthProviderActions.ts
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── index.ts
│   │   ├── InviteMemberModal.tsx
│   │   ├── LoginForm.tsx
│   │   ├── MagicLinkForm.tsx
│   │   ├── OAuthButtons.tsx
│   │   ├── PasswordStrengthMeter.tsx
│   │   ├── PendingInvitations.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── RoleSelector.tsx
│   │   ├── SignupForm.tsx
│   │   ├── TeamManagement.tsx
│   │   └── TeamMemberRow.tsx
│   ├── billing
│   │   ├── index.ts
│   │   ├── InvoiceList.tsx
│   │   ├── PaymentMethod.tsx
│   │   ├── PlanCard.tsx
│   │   ├── PricingTable.tsx
│   │   ├── SubscriptionCard.tsx
│   │   ├── TrialBanner.tsx
│   │   ├── UpgradePrompt.tsx
│   │   └── UsageBar.tsx
│   ├── context
│   │   ├── ContextViewer.tsx
│   │   └── index.ts
│   ├── quality
│   │   ├── index.ts
│   │   └── QualityReport.tsx
│   ├── realtime
│   │   ├── BuildProgress.tsx
│   │   ├── CollaboratorAvatars.tsx
│   │   ├── index.ts
│   │   ├── JobQueue.tsx
│   │   └── NotificationBell.tsx
│   └── storage
│       ├── FileGallery.tsx
│       ├── FilePreview.tsx
│       ├── FileThumbnail.tsx
│       ├── FileUploader.tsx
│       ├── ImagePicker.tsx
│       ├── index.ts
│       ├── ResumableUploader.tsx
│       └── StorageUsage.tsx
├── hooks
│   ├── billing.ts
│   ├── realtime
│   │   ├── index.ts
│   │   ├── useBuildProgress.ts
│   │   ├── useCollaboration.ts
│   │   ├── useJobs.ts
│   │   ├── useNotifications.ts
│   │   ├── useRealtime.ts
│   │   └── useSSE.ts
│   ├── storage
│   │   ├── index.ts
│   │   ├── useFilePreview.ts
│   │   ├── useFiles.ts
│   │   ├── useImageOptimizer.ts
│   │   ├── useStorageUsage.ts
│   │   └── useUpload.ts
│   ├── use-feature.ts
│   ├── use-subscription.ts
│   └── use-usage.ts
├── lib
│   ├── agents
│   │   ├── context
│   │   ├── embeddings
│   │   ├── executor
│   │   ├── index.ts
│   │   ├── orchestrator
│   │   ├── providers
│   │   ├── registry
│   │   ├── services
│   │   ├── tools
│   │   └── types
│   ├── api
│   │   ├── cache
│   │   ├── client
│   │   ├── context.ts
│   │   ├── errors
│   │   ├── filters.ts
│   │   ├── index.ts
│   │   ├── middleware
│   │   ├── openapi.ts
│   │   ├── query.ts
│   │   ├── rate-limit
│   │   ├── rate-limit.ts
│   │   ├── realtime-hooks.ts
│   │   ├── realtime.ts
│   │   ├── responses.ts
│   │   ├── schemas
│   │   ├── search.ts
│   │   ├── sse.ts
│   │   └── types
│   ├── auth
│   │   ├── api
│   │   ├── clients
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   ├── hooks
│   │   ├── index.ts
│   │   ├── middleware
│   │   ├── permissions.ts
│   │   ├── security
│   │   ├── server
│   │   └── types.ts
│   ├── billing
│   │   ├── checkout.ts
│   │   ├── constants
│   │   ├── customer.ts
│   │   ├── emails
│   │   ├── errors.ts
│   │   ├── features.ts
│   │   ├── index.ts
│   │   ├── limits.ts
│   │   ├── stripe.ts
│   │   ├── subscriptions
│   │   ├── trials.ts
│   │   ├── types
│   │   ├── usage-reporter.ts
│   │   ├── usage.ts
│   │   └── webhooks
│   ├── db
│   │   ├── index.ts
│   │   ├── mongodb.ts
│   │   ├── neo4j.ts
│   │   ├── qdrant.ts
│   │   └── redis.ts
│   ├── jobs
│   │   ├── handlers.ts
│   │   ├── index.ts
│   │   ├── job-handler.ts
│   │   └── queue-service.ts
│   ├── preview
│   │   ├── components
│   │   ├── editor
│   │   ├── hooks
│   │   ├── index.ts
│   │   ├── PreviewLayout.tsx
│   │   ├── sandpack
│   │   ├── share
│   │   └── types
│   ├── quality
│   │   ├── build-verifier.ts
│   │   ├── code-validator.ts
│   │   ├── index.ts
│   │   ├── orchestrator.ts
│   │   ├── security-scanner.ts
│   │   └── types.ts
│   ├── realtime
│   │   ├── build-realtime.ts
│   │   ├── constants.ts
│   │   ├── index.ts
│   │   ├── notification-realtime.ts
│   │   ├── project-realtime.ts
│   │   ├── realtime-service.ts
│   │   ├── sse-service.ts
│   │   └── types.ts
│   ├── realtime-module.ts
│   ├── storage
│   │   ├── cdn-config.ts
│   │   ├── cleanup-service.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   ├── file-service.ts
│   │   ├── image-processor.ts
│   │   ├── index.ts
│   │   ├── supabase-client.ts
│   │   ├── types.ts
│   │   ├── upload-service.ts
│   │   ├── usage-service.ts
│   │   └── validation.ts
│   ├── storage-module.ts
│   ├── supabase
│   │   └── service.ts
│   ├── utils
│   │   └── index.ts
│   └── validation
│       ├── index.ts
│       ├── output-validator.ts
│       ├── types.ts
│       ├── validators
│       └── __tests__
└── types
    └── database.types.ts

```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for databases)

### Installation

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

### Environment Variables

Create a `.env.local` file with:

```env
# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# Databases
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

MONGODB_URI=mongodb://localhost:27017/olympus

REDIS_URL=redis://localhost:6379

QDRANT_URL=http://localhost:6333

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Ollama (for local inference)
OLLAMA_BASE_URL=http://localhost:11434
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:chunk` - npm run type-check && npm run lint
- `npm run test:full` - Run all checks (type-check, lint, build)
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run test:e2e:headed` - Run E2E tests in headed mode
- `npm run test:e2e:debug` - Debug E2E tests
- `npm run test:e2e:report` - playwright show-report tests/e2e/playwright-report
- `npm run check:circular` - madge --circular --extensions ts,tsx src/

## Architecture

OLYMPUS uses a multi-agent architecture where specialized AI agents collaborate to build SaaS applications:

```
                    ┌─────────────┐
                    │   Executor  │
                    │  (Orchestr) │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Frontend  │ │   Backend   │ │   Design    │
    │    Agent    │ │    Agent    │ │    Agent    │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Type checking
npm run type-check
```

## Documentation

- [User Acceptance Criteria](docs/USER-ACCEPTANCE-CRITERIA.md)
- [Architecture Decisions](docs/adr/)
- [API Documentation](docs/generated/API.generated.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*This README was auto-generated on 2026-01-12*
