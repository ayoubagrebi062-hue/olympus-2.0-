# OLYMPUS Codebase Q&A System

An AI-powered system for asking questions about the OLYMPUS codebase.

## Overview

This system:
1. Indexes all source files into vector embeddings
2. Uses semantic search to find relevant code for any question
3. Optionally uses Claude AI to synthesize answers

## Usage

### Index the Codebase

First, index the codebase (run from project root):

```bash
npm run qa:index
```

This will:
- Find all TypeScript/JavaScript files in `src/`
- Split them into logical chunks (functions, classes, components)
- Create embeddings and store them for search

### Ask Questions

Single question:

```bash
npm run qa "How does the build system work?"
npm run qa "Where is authentication handled?"
npm run qa "What does the AIRouter do?"
```

Interactive mode:

```bash
npm run qa:ask
```

### Special Commands (Interactive Mode)

- `explain <component>` - Get detailed explanation of a component
- `impact <target>` - Analyze what would break if something changed
- `find <concept>` - Find where something is implemented
- `exit` or `quit` - Exit the program

## Configuration

### With Qdrant (Recommended)

For persistent indexing, run Qdrant:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

Set environment variable:
```
QDRANT_URL=http://localhost:6333
```

### With AI Answers

For AI-synthesized answers, set your Anthropic API key:

```
ANTHROPIC_API_KEY=your_key_here
```

Without this, the system will show relevant code snippets without synthesis.

## How It Works

### Code Chunking

Files are split into logical chunks:
- Functions (regular and arrow)
- Classes
- React components
- Interfaces and types

Each chunk includes:
- File path
- Line numbers
- Content
- Type (function, class, component, etc.)

### Embedding

Text is converted to vectors using:
- Tokenization (including camelCase/snake_case splitting)
- TF-IDF-like weighting
- Hash-based dimension mapping

In production, use a proper embedding model like OpenAI's text-embedding-3-small.

### Search

Queries are embedded and compared against indexed chunks using cosine similarity.
Top matches are returned with relevance scores.

### Answer Generation

With AI:
- Relevant code is provided as context
- Claude generates a comprehensive answer
- References specific files and line numbers

Without AI:
- Shows top matching code snippets
- Includes relevance scores and locations

## Files

```
scripts/codebase-qa/
├── index-codebase.ts    # Index the codebase
├── ask.ts               # CLI for asking questions
├── lib/
│   ├── chunker.ts       # Split code into chunks
│   ├── embedder.ts      # Create and store embeddings
│   └── qa-engine.ts     # Q&A logic
└── README.md            # This file
```

## Limitations

- Simple hash-based embeddings (use real embedding model in production)
- Large files may be split imperfectly
- Best for TypeScript/JavaScript codebases
- AI answers require API key and have cost

## Examples

```bash
# Find authentication code
npm run qa "How is user authentication implemented?"

# Understand a component
npm run qa "explain AIRouter"

# Check impact of changes
npm run qa "impact UserService"

# Find specific implementation
npm run qa "find error handling"
```
