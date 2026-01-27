# Contributing to OLYMPUS

Thank you for your interest in contributing to OLYMPUS! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming environment for all contributors.

## Getting Started

1. **Fork the repository** - Create your own fork of the project
2. **Clone your fork** - `git clone https://github.com/YOUR_USERNAME/olympus-2.0.git`
3. **Set up development environment** - Follow the [README](README.md) for setup instructions
4. **Create a branch** - `git checkout -b feature/your-feature-name`

## Development Workflow

### Before You Start

- Check existing [issues](../../issues) for similar work
- For major changes, open an issue first to discuss
- Ensure your development environment is set up correctly

### Making Changes

1. **Write clean code**
   - Follow existing code patterns and style
   - Use TypeScript for all new code
   - Add appropriate types (avoid `any` when possible)

2. **Test your changes**
   ```bash
   # Run type checking
   npm run type-check

   # Run linter
   npm run lint

   # Run unit tests
   npm run test

   # Run E2E tests (if applicable)
   npm run test:e2e
   ```

3. **Document your changes**
   - Add JSDoc comments for new functions
   - Update README if adding new features
   - Add inline comments for complex logic

### Commit Guidelines

We follow conventional commits:

```
type(scope): description

[optional body]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(auth): add magic link authentication
fix(billing): resolve subscription cancellation issue
docs(readme): update installation instructions
```

### Pull Request Process

1. **Update your branch** - Rebase on latest main
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks**
   ```bash
   npm run test:full
   ```

3. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes were made and why
   - Include screenshots for UI changes

4. **Address review feedback**
   - Respond to all comments
   - Make requested changes
   - Re-request review when ready

## Code Style Guide

### TypeScript

```typescript
// Use explicit types
function processData(input: string): ProcessedData {
  // ...
}

// Use interfaces for objects
interface UserConfig {
  id: string;
  settings: Settings;
}

// Use async/await over promises
async function fetchData(): Promise<Data> {
  const response = await fetch('/api/data');
  return response.json();
}
```

### React Components

```typescript
// Use functional components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### File Organization

- Place components in `src/components/`
- Place hooks in `src/hooks/`
- Place utilities in `src/lib/`
- Place types in `src/types/`

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Screenshots or error logs if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / motivation
- Proposed implementation (optional)
- Mockups or examples (if applicable)

## Questions?

- Open a [discussion](../../discussions) for general questions
- Check existing documentation in `/docs`
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to OLYMPUS!
