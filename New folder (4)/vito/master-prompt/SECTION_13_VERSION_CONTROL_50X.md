# SECTION 13: THE VERSION CONTROL SYSTEM - 50X EDITION
## The Complete Git Mastery Guide for World-Class Development

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ██╗   ██╗███████╗██████╗ ███████╗██╗ ██████╗ ███╗   ██╗                    ║
║  ██║   ██║██╔════╝██╔══██╗██╔════╝██║██╔═══██╗████╗  ██║                    ║
║  ██║   ██║█████╗  ██████╔╝███████╗██║██║   ██║██╔██╗ ██║                    ║
║  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║██║   ██║██║╚██╗██║                    ║
║   ╚████╔╝ ███████╗██║  ██║███████║██║╚██████╔╝██║ ╚████║                    ║
║    ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝                    ║
║                                                                              ║
║   ██████╗ ██████╗ ███╗   ██╗████████╗██████╗  ██████╗ ██╗                   ║
║  ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔═══██╗██║                   ║
║  ██║     ██║   ██║██╔██╗ ██║   ██║   ██████╔╝██║   ██║██║                   ║
║  ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██╗██║   ██║██║                   ║
║  ╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╔╝███████╗              ║
║   ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝              ║
║                                                                              ║
║                    THE 50X VERSION CONTROL BIBLE                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Document Type:** 50X Enhanced Section Guide
**Section:** 13 of 22
**Topic:** Version Control System
**Version:** 50X-1.0
**Status:** ACTIVE
**Original Lines:** 48 lines
**50X Lines:** 4000+ lines
**Enhancement Factor:** 83X

---

# TABLE OF CONTENTS

1. [The Philosophy of Version Control](#part-i-the-philosophy-of-version-control)
2. [Git Internals Deep Dive](#part-ii-git-internals-deep-dive)
3. [The Ultimate Branching Strategies](#part-iii-the-ultimate-branching-strategies)
4. [Commit Excellence Protocol](#part-iv-commit-excellence-protocol)
5. [Pull Request Mastery](#part-v-pull-request-mastery)
6. [Code Review Excellence](#part-vi-code-review-excellence)
7. [CI/CD Integration Patterns](#part-vii-cicd-integration-patterns)
8. [Monorepo Management](#part-viii-monorepo-management)
9. [Git Hooks & Automation](#part-ix-git-hooks--automation)
10. [Security & Compliance](#part-x-security--compliance)
11. [Release Management](#part-xi-release-management)
12. [Recovery & Disaster Management](#part-xii-recovery--disaster-management)
13. [Performance Optimization](#part-xiii-performance-optimization)
14. [AI-Assisted Version Control](#part-xiv-ai-assisted-version-control)
15. [Team Collaboration Patterns](#part-xv-team-collaboration-patterns)
16. [Platform-Specific Integrations](#part-xvi-platform-specific-integrations)
17. [The Complete Command Reference](#part-xvii-the-complete-command-reference)

---

# PART I: THE PHILOSOPHY OF VERSION CONTROL

---

## 1.1 Why Version Control is Non-Negotiable

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  THE FOUNDATION OF PROFESSIONAL DEVELOPMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Version control is NOT optional. It is the FOUNDATION upon which           │
│  all professional software development is built.                            │
│                                                                             │
│  Without version control, you have:                                         │
│  ✗ No history - Changes lost forever                                        │
│  ✗ No collaboration - Team chaos                                            │
│  ✗ No rollback - Mistakes are permanent                                     │
│  ✗ No accountability - Who broke what?                                      │
│  ✗ No automation - Manual everything                                        │
│                                                                             │
│  With version control, you have:                                            │
│  ✓ Complete history - Every change recorded                                 │
│  ✓ Seamless collaboration - Team harmony                                    │
│  ✓ Instant rollback - Mistakes reversible                                   │
│  ✓ Full accountability - Blame tracking                                     │
│  ✓ Automation ready - CI/CD pipelines                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 The Three Pillars of Version Control Mastery

### Pillar 1: HISTORY
Everything that ever happened, preserved forever.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HISTORY PILLAR                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT IT PROVIDES:                                                          │
│  ─────────────────                                                          │
│  • Complete audit trail of all changes                                      │
│  • Who made what change and when                                            │
│  • Why changes were made (commit messages)                                  │
│  • Ability to view any point in time                                        │
│  • Compare any two versions                                                 │
│                                                                             │
│  WHY IT MATTERS:                                                            │
│  ─────────────────                                                          │
│  • Debug by understanding what changed                                      │
│  • Compliance and regulatory requirements                                   │
│  • Onboarding new team members                                              │
│  • Understanding architectural decisions                                     │
│  • Legal protection and documentation                                       │
│                                                                             │
│  BEST PRACTICES:                                                            │
│  ─────────────────                                                          │
│  • Atomic commits (one logical change per commit)                           │
│  • Meaningful commit messages                                               │
│  • Regular commits (at least daily)                                         │
│  • Never rewrite public history                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pillar 2: BRANCHES
Parallel universes for your code.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BRANCHES PILLAR                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT IT PROVIDES:                                                          │
│  ─────────────────                                                          │
│  • Isolated development environments                                        │
│  • Parallel feature development                                             │
│  • Safe experimentation                                                     │
│  • Release management                                                       │
│  • Hotfix capabilities                                                      │
│                                                                             │
│  BRANCHING MODELS:                                                          │
│  ─────────────────                                                          │
│                                                                             │
│  main ──●───────●───────●───────●───────●──→ (production)                  │
│          \     / \     /                                                    │
│           \   /   \   /                                                     │
│  feature   ●─●     ●─●                    (feature branches)               │
│                     \                                                       │
│  hotfix              ●──●                 (emergency fixes)                │
│                                                                             │
│  BEST PRACTICES:                                                            │
│  ─────────────────                                                          │
│  • Short-lived feature branches (< 1 week)                                  │
│  • Branch from latest main                                                  │
│  • Merge frequently to avoid conflicts                                      │
│  • Delete merged branches                                                   │
│  • Protect main branch                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pillar 3: COLLABORATION
Many hands building one system.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COLLABORATION PILLAR                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT IT PROVIDES:                                                          │
│  ─────────────────                                                          │
│  • Multiple developers, one codebase                                        │
│  • Code review workflows                                                    │
│  • Conflict resolution                                                      │
│  • Knowledge sharing                                                        │
│  • Quality gates                                                            │
│                                                                             │
│  COLLABORATION FLOW:                                                        │
│  ─────────────────                                                          │
│                                                                             │
│  Developer A    Developer B    Developer C                                  │
│       │              │              │                                       │
│       ●─────────────────────────────●  ← All start from main               │
│       │              │              │                                       │
│       ▼              ▼              ▼                                       │
│    [Work]        [Work]        [Work]    ← Independent work                │
│       │              │              │                                       │
│       ▼              ▼              ▼                                       │
│     [PR]          [PR]          [PR]     ← Pull requests                   │
│       │              │              │                                       │
│       ▼              ▼              ▼                                       │
│   [Review]      [Review]      [Review]   ← Code review                     │
│       │              │              │                                       │
│       └──────────────┴──────────────┘                                       │
│                      │                                                      │
│                      ▼                                                      │
│                   [main]               ← Merged code                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Git vs Other Version Control Systems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VERSION CONTROL COMPARISON                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYSTEM         │ TYPE         │ SPEED    │ BRANCHING │ INDUSTRY USE       │
│  ───────────────┼──────────────┼──────────┼───────────┼─────────────────── │
│  Git            │ Distributed  │ ★★★★★    │ ★★★★★     │ 95%+ of projects   │
│  SVN            │ Centralized  │ ★★☆☆☆    │ ★★☆☆☆     │ Legacy systems     │
│  Mercurial      │ Distributed  │ ★★★★☆    │ ★★★☆☆     │ Rare (Facebook)    │
│  Perforce       │ Centralized  │ ★★★★☆    │ ★★★☆☆     │ Game dev, large    │
│  TFS/Azure      │ Centralized  │ ★★★☆☆    │ ★★★☆☆     │ Microsoft shops    │
│                                                                             │
│  WHY GIT WON:                                                               │
│  ─────────────                                                              │
│  1. Distributed - Work offline, full history locally                        │
│  2. Speed - Operations are instant (local)                                  │
│  3. Branching - Cheap and fast branches                                     │
│  4. GitHub/GitLab - Ecosystem dominance                                     │
│  5. Community - Documentation, tools, support                               │
│                                                                             │
│  VERDICT: Use Git. No exceptions for new projects.                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART II: GIT INTERNALS DEEP DIVE

---

## 2.1 The Git Object Model

Understanding Git internals makes you 10X more effective.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GIT OBJECT TYPES                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Git stores everything as OBJECTS in .git/objects/                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  BLOB (Binary Large Object)                                         │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  • Contains file contents                                           │   │
│  │  • No filename, no metadata                                         │   │
│  │  • Identified by SHA-1 hash of contents                             │   │
│  │                                                                      │   │
│  │  blob 14b5c ← "Hello World\n"                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  TREE                                                               │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  • Directory listing                                                │   │
│  │  • Contains blob references and other trees                         │   │
│  │  • Stores filenames and permissions                                 │   │
│  │                                                                      │   │
│  │  tree 5b1d3                                                         │   │
│  │    ├── 100644 blob 14b5c README.md                                  │   │
│  │    ├── 100644 blob 8fa3c index.ts                                   │   │
│  │    └── 040000 tree 2c6b1 src/                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  COMMIT                                                             │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  • Points to a tree (snapshot)                                      │   │
│  │  • Points to parent commit(s)                                       │   │
│  │  • Contains author, committer, message                              │   │
│  │                                                                      │   │
│  │  commit a3f7c                                                       │   │
│  │    tree 5b1d3                                                       │   │
│  │    parent 9e8b2                                                     │   │
│  │    author Ayoub <ayoub@example.com>                                 │   │
│  │    committer Ayoub <ayoub@example.com>                              │   │
│  │    message "Add authentication"                                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  TAG                                                                │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  • Points to a commit                                               │   │
│  │  • Annotated tags include message                                   │   │
│  │  • Used for releases                                                │   │
│  │                                                                      │   │
│  │  tag v1.0.0                                                         │   │
│  │    object a3f7c (commit)                                            │   │
│  │    tagger Ayoub <ayoub@example.com>                                 │   │
│  │    message "Release 1.0.0"                                          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 The Three Trees of Git

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  THE THREE TREES                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Git manages three "trees" (collections of files):                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │    WORKING DIRECTORY        STAGING AREA           REPOSITORY       │   │
│  │    (Working Tree)           (Index)                (HEAD)           │   │
│  │                                                                      │   │
│  │    ┌───────────┐           ┌───────────┐         ┌───────────┐     │   │
│  │    │           │           │           │         │           │     │   │
│  │    │  Your     │  git add  │  Ready to │ commit  │  Permanent│     │   │
│  │    │  Files    │ ────────► │  Commit   │ ──────► │  History  │     │   │
│  │    │           │           │           │         │           │     │   │
│  │    └───────────┘           └───────────┘         └───────────┘     │   │
│  │                                                                      │   │
│  │    What you see            What goes in          What's saved      │   │
│  │    and edit                next commit           forever           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  COMMANDS BETWEEN TREES:                                                    │
│  ─────────────────────────                                                  │
│                                                                             │
│  git add <file>           Working → Staging                                 │
│  git commit               Staging → Repository                              │
│  git checkout -- <file>   Repository → Working (discard changes)            │
│  git reset HEAD <file>    Staging → Working (unstage)                       │
│  git reset --hard HEAD    Repository → Staging + Working (reset all)        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Understanding References

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GIT REFERENCES (REFS)                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  References are pointers to commits. Stored in .git/refs/                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  .git/                                                              │   │
│  │  ├── HEAD                 ← Points to current branch                │   │
│  │  ├── refs/                                                          │   │
│  │  │   ├── heads/           ← Local branches                          │   │
│  │  │   │   ├── main         ← Points to latest main commit            │   │
│  │  │   │   ├── develop      ← Points to latest develop commit         │   │
│  │  │   │   └── feature/auth ← Points to feature branch                │   │
│  │  │   ├── remotes/         ← Remote tracking branches                │   │
│  │  │   │   └── origin/                                                │   │
│  │  │   │       ├── main                                               │   │
│  │  │   │       └── develop                                            │   │
│  │  │   └── tags/            ← Tag references                          │   │
│  │  │       ├── v1.0.0                                                 │   │
│  │  │       └── v1.1.0                                                 │   │
│  │  └── stash                ← Stash reference                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SPECIAL REFERENCES:                                                        │
│  ───────────────────                                                        │
│                                                                             │
│  HEAD          Current branch/commit you're on                              │
│  HEAD~1        Parent of HEAD                                               │
│  HEAD~2        Grandparent of HEAD                                          │
│  HEAD^         First parent (same as HEAD~1 for linear history)             │
│  HEAD^2        Second parent (for merge commits)                            │
│  @{-1}         Previous branch you were on                                  │
│  main@{yesterday}  Where main was yesterday                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.4 The .git Directory Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMPLETE .git DIRECTORY                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  .git/                                                                      │
│  │                                                                          │
│  ├── config                  # Repository-specific config                   │
│  │   └── [remote "origin"]   # Remote URLs, branches                        │
│  │                                                                          │
│  ├── description             # Used by GitWeb (rarely used)                 │
│  │                                                                          │
│  ├── HEAD                    # Current branch reference                     │
│  │   └── ref: refs/heads/main                                               │
│  │                                                                          │
│  ├── hooks/                  # Client/server-side scripts                   │
│  │   ├── pre-commit.sample                                                  │
│  │   ├── pre-push.sample                                                    │
│  │   ├── commit-msg.sample                                                  │
│  │   └── post-merge.sample                                                  │
│  │                                                                          │
│  ├── index                   # Staging area (binary file)                   │
│  │                                                                          │
│  ├── info/                                                                  │
│  │   └── exclude             # Local .gitignore (not committed)             │
│  │                                                                          │
│  ├── logs/                   # Reflog - history of ref changes              │
│  │   ├── HEAD                # Where HEAD has been                          │
│  │   └── refs/               # Where each ref has been                      │
│  │                                                                          │
│  ├── objects/                # Object database                              │
│  │   ├── pack/               # Packed objects (compressed)                  │
│  │   ├── info/                                                              │
│  │   └── [2-char hex dirs]/  # Loose objects                                │
│  │       └── [38-char hash]  # Object file                                  │
│  │                                                                          │
│  └── refs/                   # References                                   │
│      ├── heads/              # Branch tips                                  │
│      ├── remotes/            # Remote tracking branches                     │
│      ├── tags/               # Tag objects                                  │
│      └── stash               # Stash stack                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.5 Low-Level Commands (Plumbing)

```bash
# ═══════════════════════════════════════════════════════════════════════════
# GIT PLUMBING COMMANDS - For power users and scripts
# ═══════════════════════════════════════════════════════════════════════════

# View object contents
git cat-file -p <sha>        # Pretty print object
git cat-file -t <sha>        # Show object type
git cat-file -s <sha>        # Show object size

# Example: Inspect a commit
git cat-file -p HEAD
# tree 5b1d3f4e...
# parent 9e8b2a1c...
# author Ayoub <ayoub@example.com> 1234567890 +0400
# committer Ayoub <ayoub@example.com> 1234567890 +0400
#
# Add authentication feature

# List tree contents
git ls-tree HEAD
git ls-tree -r HEAD          # Recursive

# List files in staging
git ls-files
git ls-files -s              # With staging info (mode, SHA, stage number)

# Show ref values
git show-ref                 # All refs
git show-ref --heads         # Branch refs only
git show-ref --tags          # Tag refs only

# Hash a file (without adding to Git)
git hash-object <file>
git hash-object -w <file>    # Write to object database

# Create tree object
git write-tree               # From current index

# Create commit object
git commit-tree <tree> -m "message"
git commit-tree <tree> -p <parent> -m "message"

# Update ref manually
git update-ref refs/heads/main <sha>

# Pack objects (for transfer/storage)
git pack-objects
git unpack-objects

# Verify database integrity
git fsck                     # Full check
git fsck --unreachable       # Find orphaned objects
```

---

# PART III: THE ULTIMATE BRANCHING STRATEGIES

---

## 3.1 Branching Strategy Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRANCHING STRATEGY COMPARISON                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STRATEGY           │ COMPLEXITY │ BEST FOR          │ RELEASE FREQUENCY   │
│  ───────────────────┼────────────┼───────────────────┼─────────────────── │
│  Trunk-Based        │ Low        │ CI/CD, startups   │ Continuous         │
│  GitHub Flow        │ Low-Medium │ Web apps, SaaS    │ Daily/Weekly       │
│  GitFlow            │ High       │ Packaged software │ Scheduled          │
│  GitLab Flow        │ Medium     │ Environments      │ Environment-based  │
│  Release Flow       │ Medium     │ Large teams       │ Trains/scheduled   │
│                                                                             │
│  RECOMMENDATION:                                                            │
│  ───────────────                                                            │
│  • < 5 developers: Trunk-Based or GitHub Flow                               │
│  • 5-20 developers: GitHub Flow or GitLab Flow                              │
│  • > 20 developers: GitFlow or Release Flow                                 │
│  • Continuous deployment: Trunk-Based                                       │
│  • Scheduled releases: GitFlow                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Trunk-Based Development

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRUNK-BASED DEVELOPMENT                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHILOSOPHY: Everyone commits to main (trunk), always deployable            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  main ──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──→    │   │
│  │         │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │       │   │
│  │         A  B  A  C  B  A  C  A  B  C  A  B  C  A  B  C  A  B       │   │
│  │                                                                      │   │
│  │  All developers commit directly to main (small, frequent commits)   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RULES:                                                                     │
│  ─────                                                                      │
│  1. Commits must be small (< 400 lines)                                     │
│  2. All commits must pass CI                                                │
│  3. Feature flags for incomplete features                                   │
│  4. Code review via pair programming or PR                                  │
│  5. Deploy from main continuously                                           │
│                                                                             │
│  FEATURE FLAGS EXAMPLE:                                                     │
│  ─────────────────────────                                                  │
│                                                                             │
│  ```typescript                                                              │
│  // Feature flag implementation                                             │
│  const flags = {                                                            │
│    newCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',               │
│    darkMode: process.env.FEATURE_DARK_MODE === 'true',                     │
│  };                                                                         │
│                                                                             │
│  // Usage in code                                                           │
│  if (flags.newCheckout) {                                                   │
│    return <NewCheckoutFlow />;                                              │
│  }                                                                          │
│  return <LegacyCheckout />;                                                 │
│  ```                                                                        │
│                                                                             │
│  PROS:                                                                      │
│  ─────                                                                      │
│  ✓ Simple mental model                                                      │
│  ✓ Fast integration (no merge conflicts)                                    │
│  ✓ Continuous deployment ready                                              │
│  ✓ Forces small, testable changes                                           │
│                                                                             │
│  CONS:                                                                      │
│  ─────                                                                      │
│  ✗ Requires excellent test coverage                                         │
│  ✗ Feature flags add complexity                                             │
│  ✗ Not suitable for large, long-running features                            │
│                                                                             │
│  BEST FOR: Google, Facebook, Netflix-style continuous deployment            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 GitHub Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GITHUB FLOW                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHILOSOPHY: Simple, PR-based workflow with protected main                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  main ────●─────────────●─────────────●─────────────●──────→        │   │
│  │           │             ↑             ↑             ↑               │   │
│  │           │             │             │             │               │   │
│  │  feature/ └──●──●──●────┘             │             │               │   │
│  │  auth                                 │             │               │   │
│  │                                       │             │               │   │
│  │  feature/     └──●──●──●──●───────────┘             │               │   │
│  │  dashboard                                          │               │   │
│  │                                                     │               │   │
│  │  hotfix/          └──●──────────────────────────────┘               │   │
│  │  security                                                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  THE SIX STEPS:                                                             │
│  ──────────────                                                             │
│  1. Create branch from main                                                 │
│  2. Add commits                                                             │
│  3. Open Pull Request                                                       │
│  4. Discuss and review code                                                 │
│  5. Deploy for testing (optional)                                           │
│  6. Merge to main                                                           │
│                                                                             │
│  COMMANDS:                                                                  │
│  ─────────                                                                  │
│                                                                             │
│  # Step 1: Create branch                                                    │
│  git checkout main                                                          │
│  git pull origin main                                                       │
│  git checkout -b feature/user-authentication                                │
│                                                                             │
│  # Step 2: Add commits (work on feature)                                    │
│  git add .                                                                  │
│  git commit -m "feat: add login form"                                       │
│  git commit -m "feat: add OAuth providers"                                  │
│  git commit -m "test: add auth tests"                                       │
│                                                                             │
│  # Step 3: Push and create PR                                               │
│  git push -u origin feature/user-authentication                             │
│  gh pr create --title "Add user authentication" --body "..."                │
│                                                                             │
│  # Step 6: After approval, merge                                            │
│  gh pr merge --squash                                                       │
│  git checkout main                                                          │
│  git pull origin main                                                       │
│  git branch -d feature/user-authentication                                  │
│                                                                             │
│  BRANCH NAMING CONVENTIONS:                                                 │
│  ──────────────────────────                                                 │
│  feature/[description]   → New feature                                      │
│  fix/[description]       → Bug fix                                          │
│  hotfix/[description]    → Urgent production fix                            │
│  refactor/[description]  → Code refactoring                                 │
│  docs/[description]      → Documentation                                    │
│  test/[description]      → Test additions                                   │
│                                                                             │
│  PROS:                                                                      │
│  ─────                                                                      │
│  ✓ Simple and easy to understand                                            │
│  ✓ Great for web apps and SaaS                                              │
│  ✓ Built-in code review                                                     │
│  ✓ Works well with CI/CD                                                    │
│                                                                             │
│  BEST FOR: OLYMPUS, most web applications, startups                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.4 GitFlow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GITFLOW                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHILOSOPHY: Structured workflow for scheduled releases                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  main     ──●────────────────────●────────────────────●────→        │   │
│  │             │                    ↑                    ↑             │   │
│  │             │        v1.0.0──────┘        v2.0.0──────┘             │   │
│  │             │                    ↑                    ↑             │   │
│  │  release/   │           ●──●──●──┘           ●──●──●──┘             │   │
│  │  v1.0       │           ↑                    ↑                      │   │
│  │             │           │                    │                      │   │
│  │  develop ───●───●───●───●───●───●───●───●───●───●───●───●───→      │   │
│  │             │   ↑   ↑       ↑       ↑       ↑   ↑   ↑              │   │
│  │             │   │   │       │       │       │   │   │              │   │
│  │  feature/   └───●───┘       │       │       │   │   │              │   │
│  │  login                      │       │       │   │   │              │   │
│  │                             │       │       │   │   │              │   │
│  │  feature/       └───●───●───┘       │       │   │   │              │   │
│  │  payments                           │       │   │   │              │   │
│  │                                     │       │   │   │              │   │
│  │  hotfix/            └───────────────●───────┘   │   │              │   │
│  │  security                                       │   │              │   │
│  │                                                 │   │              │   │
│  │  feature/                   └───────●───●───●───┘   │              │   │
│  │  dashboard                                          │              │   │
│  │                                                     │              │   │
│  │  feature/                       └───────●───●───●───┘              │   │
│  │  reports                                                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BRANCH TYPES:                                                              │
│  ─────────────                                                              │
│                                                                             │
│  main        → Production-ready code, tagged with versions                  │
│  develop     → Integration branch, latest development                       │
│  feature/*   → New features, branch from develop, merge to develop          │
│  release/*   → Release prep, branch from develop, merge to main+develop     │
│  hotfix/*    → Emergency fixes, branch from main, merge to main+develop     │
│                                                                             │
│  WORKFLOW:                                                                  │
│  ─────────                                                                  │
│                                                                             │
│  # Start new feature                                                        │
│  git checkout develop                                                       │
│  git checkout -b feature/new-feature                                        │
│  # ... work ...                                                             │
│  git checkout develop                                                       │
│  git merge --no-ff feature/new-feature                                      │
│  git branch -d feature/new-feature                                          │
│                                                                             │
│  # Start release                                                            │
│  git checkout develop                                                       │
│  git checkout -b release/1.0.0                                              │
│  # ... bug fixes only ...                                                   │
│  git checkout main                                                          │
│  git merge --no-ff release/1.0.0                                            │
│  git tag -a v1.0.0 -m "Release 1.0.0"                                       │
│  git checkout develop                                                       │
│  git merge --no-ff release/1.0.0                                            │
│  git branch -d release/1.0.0                                                │
│                                                                             │
│  # Hotfix                                                                   │
│  git checkout main                                                          │
│  git checkout -b hotfix/1.0.1                                               │
│  # ... fix ...                                                              │
│  git checkout main                                                          │
│  git merge --no-ff hotfix/1.0.1                                             │
│  git tag -a v1.0.1 -m "Hotfix 1.0.1"                                        │
│  git checkout develop                                                       │
│  git merge --no-ff hotfix/1.0.1                                             │
│  git branch -d hotfix/1.0.1                                                 │
│                                                                             │
│  PROS:                                                                      │
│  ─────                                                                      │
│  ✓ Clear separation of concerns                                             │
│  ✓ Supports parallel release development                                    │
│  ✓ Works well for versioned software                                        │
│                                                                             │
│  CONS:                                                                      │
│  ─────                                                                      │
│  ✗ Complex for small teams                                                  │
│  ✗ Merge conflicts with long-lived branches                                 │
│  ✗ Overkill for continuous deployment                                       │
│                                                                             │
│  BEST FOR: Mobile apps, desktop software, APIs with versioned releases      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5 GitLab Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GITLAB FLOW                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHILOSOPHY: Environment branches + feature branches                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  production ──●─────────────●─────────────●─────────────●───→       │   │
│  │               ↑             ↑             ↑             ↑           │   │
│  │               │             │             │             │           │   │
│  │  staging  ────●───●─────────●───●─────────●───●─────────●───→       │   │
│  │               ↑   ↑         ↑   ↑         ↑   ↑         ↑           │   │
│  │               │   │         │   │         │   │         │           │   │
│  │  main     ────●───●───●─────●───●───●─────●───●───●─────●───→       │   │
│  │               ↑   ↑   ↑     ↑   ↑   ↑     ↑   ↑   ↑     ↑           │   │
│  │               │   │   │     │   │   │     │   │   │     │           │   │
│  │  feature/ ────●───┘   │     │   │   │     │   │   │     │           │   │
│  │  login                │     │   │   │     │   │   │     │           │   │
│  │                       │     │   │   │     │   │   │     │           │   │
│  │  feature/ ────────────●─────┘   │   │     │   │   │     │           │   │
│  │  payments                       │   │     │   │   │     │           │   │
│  │                                 │   │     │   │   │     │           │   │
│  │  feature/ ──────────────────────●───┘     │   │   │     │           │   │
│  │  dashboard                                │   │   │     │           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FLOW:                                                                      │
│  ─────                                                                      │
│  1. Feature branches → main (via MR)                                        │
│  2. main → staging (automatic or manual)                                    │
│  3. staging → production (after QA approval)                                │
│                                                                             │
│  ENVIRONMENT BRANCHES:                                                      │
│  ─────────────────────                                                      │
│                                                                             │
│  main        → Development complete, ready for staging                      │
│  staging     → Testing environment                                          │
│  production  → Live environment                                             │
│                                                                             │
│  BEST FOR: Teams with staging/production environments                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.6 Branch Protection Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRANCH PROTECTION CONFIGURATION                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GITHUB BRANCH PROTECTION RULES:                                            │
│  ─────────────────────────────────                                          │
│                                                                             │
│  Settings → Branches → Add rule                                             │
│                                                                             │
│  FOR MAIN BRANCH:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Branch name pattern: main                                          │   │
│  │                                                                      │   │
│  │  ☑ Require a pull request before merging                            │   │
│  │    ├─ ☑ Require approvals: 1 (or 2 for larger teams)                │   │
│  │    ├─ ☑ Dismiss stale PR approvals on new commits                   │   │
│  │    ├─ ☑ Require review from code owners                             │   │
│  │    └─ ☐ Restrict who can dismiss reviews                            │   │
│  │                                                                      │   │
│  │  ☑ Require status checks to pass before merging                     │   │
│  │    ├─ ☑ Require branches to be up to date                           │   │
│  │    └─ Status checks: build, test, lint                              │   │
│  │                                                                      │   │
│  │  ☑ Require conversation resolution before merging                   │   │
│  │                                                                      │   │
│  │  ☑ Require signed commits                                           │   │
│  │                                                                      │   │
│  │  ☑ Require linear history                                           │   │
│  │                                                                      │   │
│  │  ☑ Do not allow bypassing the above settings                        │   │
│  │                                                                      │   │
│  │  ☐ Allow force pushes (NEVER for main)                              │   │
│  │                                                                      │   │
│  │  ☐ Allow deletions (NEVER for main)                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CODEOWNERS FILE (.github/CODEOWNERS):                                      │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  ```                                                                        │
│  # Global owners (default)                                                  │
│  * @team-leads                                                              │
│                                                                             │
│  # Frontend code                                                            │
│  /src/components/ @frontend-team                                            │
│  /src/pages/ @frontend-team                                                 │
│  *.css @design-team                                                         │
│  *.scss @design-team                                                        │
│                                                                             │
│  # Backend code                                                             │
│  /api/ @backend-team                                                        │
│  /supabase/ @backend-team                                                   │
│                                                                             │
│  # Infrastructure                                                           │
│  /infrastructure/ @devops-team                                              │
│  *.yml @devops-team                                                         │
│  Dockerfile @devops-team                                                    │
│                                                                             │
│  # Security-sensitive files                                                 │
│  /auth/ @security-team @team-leads                                          │
│  .env.example @security-team                                                │
│                                                                             │
│  # Documentation                                                            │
│  /docs/ @docs-team                                                          │
│  *.md @docs-team                                                            │
│  ```                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART IV: COMMIT EXCELLENCE PROTOCOL

---

## 4.1 Conventional Commits

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONVENTIONAL COMMITS SPECIFICATION                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FORMAT:                                                                    │
│  ───────                                                                    │
│                                                                             │
│  <type>(<scope>): <subject>                                                 │
│                                                                             │
│  <body>                                                                     │
│                                                                             │
│  <footer>                                                                   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  TYPES:                                                                     │
│  ──────                                                                     │
│                                                                             │
│  feat:     New feature for the user                                         │
│  fix:      Bug fix for the user                                             │
│  docs:     Documentation only changes                                       │
│  style:    Formatting, missing semi-colons, etc (no code change)            │
│  refactor: Code change that neither fixes bug nor adds feature              │
│  perf:     Performance improvement                                          │
│  test:     Adding missing tests or correcting existing tests                │
│  build:    Changes to build system or dependencies                          │
│  ci:       Changes to CI configuration files and scripts                    │
│  chore:    Other changes that don't modify src or test files                │
│  revert:   Reverts a previous commit                                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  EXAMPLES:                                                                  │
│  ─────────                                                                  │
│                                                                             │
│  # Simple feature                                                           │
│  feat(auth): add Google OAuth login                                         │
│                                                                             │
│  # Bug fix with scope                                                       │
│  fix(checkout): resolve payment processing timeout                          │
│                                                                             │
│  # Breaking change (note the !)                                             │
│  feat(api)!: change response format for /users endpoint                     │
│                                                                             │
│  BREAKING CHANGE: The response now returns an array instead of object       │
│                                                                             │
│  # With body and footer                                                     │
│  feat(dashboard): add real-time analytics widget                            │
│                                                                             │
│  - Implement WebSocket connection for live data                             │
│  - Add Chart.js visualization                                               │
│  - Include filtering by date range                                          │
│                                                                             │
│  Closes #123                                                                │
│  Co-authored-by: Claude <claude@anthropic.com>                              │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  SCOPE EXAMPLES (project-specific):                                         │
│  ─────────────────────────────────                                          │
│                                                                             │
│  auth      → Authentication related                                         │
│  api       → API endpoints                                                  │
│  ui        → User interface                                                 │
│  db        → Database                                                       │
│  checkout  → Checkout flow                                                  │
│  dashboard → Dashboard                                                      │
│  payments  → Payment processing                                             │
│  tests     → Test suite                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Atomic Commits

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ATOMIC COMMIT PRINCIPLES                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEFINITION: One logical change per commit                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  BAD: Giant commit with multiple changes                            │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  commit a1b2c3d                                                     │   │
│  │  "Update code"                                                      │   │
│  │                                                                      │   │
│  │  - Add login form (+150 lines)                                      │   │
│  │  - Fix CSS bug in header (+5 lines)                                 │   │
│  │  - Refactor database queries (+200 lines)                           │   │
│  │  - Update README (+20 lines)                                        │   │
│  │  - Add unit tests (+100 lines)                                      │   │
│  │                                                                      │   │
│  │  Problems:                                                          │   │
│  │  ✗ Hard to review                                                   │   │
│  │  ✗ Can't cherry-pick specific changes                               │   │
│  │  ✗ Hard to revert if one part breaks                                │   │
│  │  ✗ Meaningless commit message                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  GOOD: Atomic commits                                               │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  commit a1b2c3d                                                     │   │
│  │  "feat(auth): add login form component"                             │   │
│  │                                                                      │   │
│  │  commit b2c3d4e                                                     │   │
│  │  "fix(ui): correct header alignment on mobile"                      │   │
│  │                                                                      │   │
│  │  commit c3d4e5f                                                     │   │
│  │  "refactor(db): optimize user query performance"                    │   │
│  │                                                                      │   │
│  │  commit d4e5f6g                                                     │   │
│  │  "docs: update README with setup instructions"                      │   │
│  │                                                                      │   │
│  │  commit e5f6g7h                                                     │   │
│  │  "test(auth): add login form unit tests"                            │   │
│  │                                                                      │   │
│  │  Benefits:                                                          │   │
│  │  ✓ Easy to review each change                                       │   │
│  │  ✓ Can cherry-pick any commit                                       │   │
│  │  ✓ Can revert specific changes                                      │   │
│  │  ✓ Clear history and documentation                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  THE TEST: Can you describe the commit in one sentence?                     │
│            If not, split it into multiple commits.                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Commit Message Templates

```bash
# ═══════════════════════════════════════════════════════════════════════════
# COMMIT MESSAGE TEMPLATE
# ═══════════════════════════════════════════════════════════════════════════

# Set up commit template
git config --global commit.template ~/.gitmessage

# ~/.gitmessage content:
# ───────────────────────────────────────────────────────────────────────────
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
# ───────────────────────────────────────────────────────────────────────────
# Type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
# Scope: component or area of codebase (optional)
# Subject: imperative mood, no period, max 50 chars
#
# Body: explain WHAT and WHY (not how), wrap at 72 chars
#
# Footer: reference issues, breaking changes, co-authors
#
# Examples:
#   feat(auth): add password strength indicator
#   fix(api): handle null response from payment gateway
#   docs: add API documentation for webhooks
#
# Breaking changes:
#   feat(api)!: change user endpoint response format
#
#   BREAKING CHANGE: The /users endpoint now returns an array
#   instead of an object with a 'users' key.
#
# Issue references:
#   Closes #123
#   Fixes #456
#   Refs #789
#
# Co-authors:
#   Co-authored-by: Name <email@example.com>
# ───────────────────────────────────────────────────────────────────────────
```

## 4.4 Interactive Staging

```bash
# ═══════════════════════════════════════════════════════════════════════════
# INTERACTIVE STAGING FOR ATOMIC COMMITS
# ═══════════════════════════════════════════════════════════════════════════

# Add specific hunks (parts of files)
git add -p                    # or --patch

# Interactive mode options:
# y - stage this hunk
# n - do not stage this hunk
# q - quit; do not stage this hunk or any remaining
# a - stage this hunk and all later hunks in the file
# d - do not stage this hunk or any later hunks in the file
# s - split the current hunk into smaller hunks
# e - manually edit the current hunk

# Example workflow:
# You modified auth.ts with:
# - Bug fix on line 45
# - New feature on lines 100-150
# - Unrelated formatting on line 200

git add -p src/auth.ts

# Git shows first hunk (bug fix)
# Press 'y' to stage it

# Git shows second hunk (feature)
# Press 'n' to skip for now

# Git shows third hunk (formatting)
# Press 'n' to skip

# Now commit the bug fix
git commit -m "fix(auth): correct token validation"

# Stage and commit the feature
git add -p src/auth.ts  # Stage the feature hunk
git commit -m "feat(auth): add refresh token rotation"

# Stage and commit formatting
git add -p src/auth.ts
git commit -m "style(auth): fix indentation"
```

## 4.5 Commit Signing

```bash
# ═══════════════════════════════════════════════════════════════════════════
# GPG COMMIT SIGNING
# ═══════════════════════════════════════════════════════════════════════════

# Why sign commits?
# - Proves YOU made the commit (not just someone with your email)
# - Required by some organizations
# - Shows "Verified" badge on GitHub

# ═══════════════════════════════════════════════════════════════════════════
# SETUP GPG KEY
# ═══════════════════════════════════════════════════════════════════════════

# Generate new GPG key
gpg --full-generate-key
# Select: RSA and RSA
# Key size: 4096
# Expiration: 0 (no expiration) or 1y
# Real name: Your Name
# Email: your.email@example.com (must match GitHub)
# Passphrase: [strong passphrase]

# List keys
gpg --list-secret-keys --keyid-format=long
# sec   rsa4096/3AA5C34371567BD2 2024-01-01 [SC]
#       D1B5F29F4892C3D04C7A84B83AA5C34371567BD2
# uid                 [ultimate] Your Name <email@example.com>

# Export public key (add to GitHub)
gpg --armor --export 3AA5C34371567BD2

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURE GIT TO SIGN
# ═══════════════════════════════════════════════════════════════════════════

# Tell Git about your signing key
git config --global user.signingkey 3AA5C34371567BD2

# Auto-sign all commits
git config --global commit.gpgsign true

# Auto-sign all tags
git config --global tag.gpgsign true

# If using GPG Suite on macOS
git config --global gpg.program gpg

# On Windows with Gpg4win
git config --global gpg.program "C:/Program Files (x86)/GnuPG/bin/gpg.exe"

# ═══════════════════════════════════════════════════════════════════════════
# VERIFY SIGNATURES
# ═══════════════════════════════════════════════════════════════════════════

# Check commit signature
git log --show-signature -1

# Verify signature on specific commit
git verify-commit <sha>

# Verify tag signature
git verify-tag v1.0.0
```

---

# PART V: PULL REQUEST MASTERY

---

## 5.1 The Perfect Pull Request

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANATOMY OF A PERFECT PULL REQUEST                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  TITLE (Clear and Descriptive)                                      │   │
│  │  ─────────────────────────────                                       │   │
│  │                                                                      │   │
│  │  Format: [Type] Brief description                                   │   │
│  │                                                                      │   │
│  │  ✓ [Feature] Add user authentication with OAuth                     │   │
│  │  ✓ [Fix] Resolve checkout timeout on slow connections               │   │
│  │  ✓ [Refactor] Simplify payment processing logic                     │   │
│  │                                                                      │   │
│  │  ✗ "Update code"                                                    │   │
│  │  ✗ "Fix stuff"                                                      │   │
│  │  ✗ "WIP"                                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  DESCRIPTION TEMPLATE                                               │   │
│  │  ────────────────────                                                │   │
│  │                                                                      │   │
│  │  ## Summary                                                         │   │
│  │  Brief description of what this PR does (1-2 sentences)             │   │
│  │                                                                      │   │
│  │  ## Motivation                                                      │   │
│  │  Why is this change needed? Link to issue if applicable.            │   │
│  │                                                                      │   │
│  │  ## Changes                                                         │   │
│  │  - Bullet point list of specific changes                            │   │
│  │  - Be specific about files/components modified                      │   │
│  │  - Note any breaking changes                                        │   │
│  │                                                                      │   │
│  │  ## Testing                                                         │   │
│  │  - How was this tested?                                             │   │
│  │  - Steps to reproduce/verify                                        │   │
│  │  - Test coverage additions                                          │   │
│  │                                                                      │   │
│  │  ## Screenshots (if UI changes)                                     │   │
│  │  Before: [image]                                                    │   │
│  │  After: [image]                                                     │   │
│  │                                                                      │   │
│  │  ## Checklist                                                       │   │
│  │  - [ ] Tests pass locally                                           │   │
│  │  - [ ] Code follows style guidelines                                │   │
│  │  - [ ] Documentation updated                                        │   │
│  │  - [ ] No new warnings                                              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SIZE GUIDELINES:                                                           │
│  ────────────────                                                           │
│                                                                             │
│  IDEAL:      < 200 lines changed                                            │
│  ACCEPTABLE: 200-400 lines changed                                          │
│  TOO LARGE:  > 400 lines (split into multiple PRs)                          │
│                                                                             │
│  Exception: Generated files, dependency updates, large refactors            │
│             (mark with "[Large]" in title)                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 PR Templates

```markdown
<!-- .github/pull_request_template.md -->

## Summary
<!-- Provide a brief description of your changes -->

## Related Issue
<!-- Link to related issue: Fixes #123 or Closes #456 -->

## Type of Change
<!-- Mark the appropriate option with an [x] -->
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test addition or update

## Changes Made
<!-- Describe your changes in detail -->
-
-
-

## How Has This Been Tested?
<!-- Describe the tests you ran -->
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

**Test Configuration:**
- Device/Browser:
- OS:

## Screenshots (if applicable)
<!-- Add screenshots to show visual changes -->
| Before | After |
|--------|-------|
| [image] | [image] |

## Checklist
<!-- Mark items with [x] when complete -->
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Additional Notes
<!-- Any additional information that reviewers should know -->
```

## 5.3 Merge Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MERGE STRATEGY COMPARISON                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. MERGE COMMIT (--no-ff)                                                  │
│  ─────────────────────────                                                  │
│                                                                             │
│  Before:                              After:                                │
│                                                                             │
│  main     ●───●───●                   main     ●───●───●───M───            │
│               │                                    │       │               │
│  feature      └───●───●               feature      └───●───●               │
│                                                                             │
│  Creates a merge commit (M) that ties branches together                     │
│  ✓ Preserves complete history                                               │
│  ✓ Clear when features were merged                                          │
│  ✗ Creates "bubble" in history                                              │
│                                                                             │
│  Command: git merge --no-ff feature                                         │
│  GitHub: "Create a merge commit"                                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  2. SQUASH AND MERGE                                                        │
│  ───────────────────                                                        │
│                                                                             │
│  Before:                              After:                                │
│                                                                             │
│  main     ●───●───●                   main     ●───●───●───S───            │
│               │                                                             │
│  feature      └───●───●───●           (feature commits combined into S)    │
│                                                                             │
│  All feature commits squashed into ONE commit on main                       │
│  ✓ Clean, linear history                                                    │
│  ✓ Each feature = one commit                                                │
│  ✗ Loses individual commit history                                          │
│                                                                             │
│  Command: git merge --squash feature && git commit                          │
│  GitHub: "Squash and merge"                                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  3. REBASE AND MERGE                                                        │
│  ───────────────────                                                        │
│                                                                             │
│  Before:                              After:                                │
│                                                                             │
│  main     ●───●───●                   main     ●───●───●───●'──●'──●'──    │
│               │                                                             │
│  feature      └───●───●───●           (feature commits replayed on main)   │
│                                                                             │
│  Feature commits replayed on top of main                                    │
│  ✓ Linear history                                                           │
│  ✓ Preserves individual commits                                             │
│  ✗ Rewrites commit SHAs                                                     │
│  ✗ Can cause issues if others have the branch                               │
│                                                                             │
│  Command: git rebase main feature && git checkout main && git merge feature │
│  GitHub: "Rebase and merge"                                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  RECOMMENDATION FOR OLYMPUS:                                                │
│  ────────────────────────────                                               │
│                                                                             │
│  Use SQUASH AND MERGE for features                                          │
│  - Clean history on main                                                    │
│  - Easy to revert entire features                                           │
│  - Clear what each merge represents                                         │
│                                                                             │
│  Use MERGE COMMIT for:                                                      │
│  - Release branches                                                         │
│  - Long-running branches you want to preserve                               │
│                                                                             │
│  AVOID REBASE for:                                                          │
│  - Shared/public branches                                                   │
│  - When others are working on the same branch                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.4 Draft PRs and WIP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DRAFT PULL REQUESTS                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PURPOSE:                                                                   │
│  ────────                                                                   │
│  • Get early feedback before completion                                     │
│  • Prevent accidental merges of incomplete work                             │
│  • Share progress with team                                                 │
│  • Run CI checks on work in progress                                        │
│                                                                             │
│  WHEN TO USE:                                                               │
│  ─────────────                                                              │
│  ✓ Work is incomplete but you want feedback                                 │
│  ✓ Running CI to catch issues early                                         │
│  ✓ Complex feature needing ongoing discussion                               │
│  ✓ Blocking on external dependency                                          │
│                                                                             │
│  CREATING DRAFT PR:                                                         │
│  ──────────────────                                                         │
│                                                                             │
│  # GitHub CLI                                                               │
│  gh pr create --draft --title "[WIP] Feature X" --body "..."                │
│                                                                             │
│  # Or on GitHub website                                                     │
│  Click "Create pull request" dropdown → "Create draft pull request"        │
│                                                                             │
│  MARKING READY:                                                             │
│  ──────────────                                                             │
│                                                                             │
│  # GitHub CLI                                                               │
│  gh pr ready                                                                │
│                                                                             │
│  # Or on GitHub website                                                     │
│  Click "Ready for review" button                                            │
│                                                                             │
│  DRAFT PR TITLE CONVENTIONS:                                                │
│  ────────────────────────────                                               │
│                                                                             │
│  [WIP] Feature description        → Work in progress                        │
│  [RFC] Feature description        → Request for comments                    │
│  [POC] Feature description        → Proof of concept                        │
│  [DO NOT MERGE] Description       → For discussion only                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART VI: CODE REVIEW EXCELLENCE

---

## 6.1 Code Review Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  THE COMPLETE CODE REVIEW CHECKLIST                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FUNCTIONALITY                                                              │
│  ─────────────                                                              │
│  [ ] Does the code do what it's supposed to do?                             │
│  [ ] Are all requirements addressed?                                        │
│  [ ] Are edge cases handled?                                                │
│  [ ] Does it handle errors gracefully?                                      │
│  [ ] Is the logic correct?                                                  │
│                                                                             │
│  CODE QUALITY                                                               │
│  ────────────                                                               │
│  [ ] Is the code readable and self-documenting?                             │
│  [ ] Are variable/function names meaningful?                                │
│  [ ] Is there unnecessary duplication?                                      │
│  [ ] Is the code following DRY principles?                                  │
│  [ ] Could this be simpler?                                                 │
│  [ ] Is the code well-organized?                                            │
│                                                                             │
│  SECURITY                                                                   │
│  ────────                                                                   │
│  [ ] Is user input validated?                                               │
│  [ ] Is there SQL injection vulnerability?                                  │
│  [ ] Is there XSS vulnerability?                                            │
│  [ ] Are secrets hardcoded?                                                 │
│  [ ] Is authentication/authorization correct?                               │
│  [ ] Is sensitive data exposed in logs?                                     │
│                                                                             │
│  PERFORMANCE                                                                │
│  ───────────                                                                │
│  [ ] Are there N+1 query problems?                                          │
│  [ ] Are expensive operations cached?                                       │
│  [ ] Is there unnecessary computation?                                      │
│  [ ] Are large datasets paginated?                                          │
│  [ ] Is memory usage reasonable?                                            │
│                                                                             │
│  TESTING                                                                    │
│  ───────                                                                    │
│  [ ] Are there appropriate tests?                                           │
│  [ ] Do tests cover edge cases?                                             │
│  [ ] Are tests readable and maintainable?                                   │
│  [ ] Do tests follow AAA pattern?                                           │
│  [ ] Is test coverage adequate?                                             │
│                                                                             │
│  DOCUMENTATION                                                              │
│  ─────────────                                                              │
│  [ ] Are complex algorithms documented?                                     │
│  [ ] Is the API documented?                                                 │
│  [ ] Are breaking changes documented?                                       │
│  [ ] Is the README updated if needed?                                       │
│                                                                             │
│  STYLE & CONVENTIONS                                                        │
│  ───────────────────                                                        │
│  [ ] Does it follow project conventions?                                    │
│  [ ] Is formatting consistent?                                              │
│  [ ] Are imports organized?                                                 │
│  [ ] Is there dead code to remove?                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Review Comment Guidelines

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HOW TO WRITE EFFECTIVE REVIEW COMMENTS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMMENT PREFIXES (Conventional Comments):                                  │
│  ─────────────────────────────────────────                                  │
│                                                                             │
│  praise:     Highlight something positive                                   │
│  nitpick:    Minor style issue (non-blocking)                               │
│  suggestion: Suggested improvement (non-blocking)                           │
│  issue:      Something that must be fixed                                   │
│  question:   Asking for clarification                                       │
│  thought:    Sharing a thought (non-blocking)                               │
│                                                                             │
│  EXAMPLES:                                                                  │
│  ─────────                                                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  GOOD COMMENTS:                                                     │   │
│  │                                                                      │   │
│  │  praise: This is a really elegant solution to the pagination        │   │
│  │  problem! I'll use this pattern elsewhere.                          │   │
│  │                                                                      │   │
│  │  nitpick: Consider using `const` instead of `let` here since        │   │
│  │  the value isn't reassigned.                                        │   │
│  │                                                                      │   │
│  │  suggestion: We could extract this into a reusable hook:            │   │
│  │  ```typescript                                                      │   │
│  │  const useDebounce = (value, delay) => ...                          │   │
│  │  ```                                                                │   │
│  │                                                                      │   │
│  │  issue: This SQL query is vulnerable to injection. Please use       │   │
│  │  parameterized queries:                                             │   │
│  │  ```sql                                                             │   │
│  │  SELECT * FROM users WHERE id = $1                                  │   │
│  │  ```                                                                │   │
│  │                                                                      │   │
│  │  question: Is there a specific reason we're not using the           │   │
│  │  existing `UserService` for this? It already handles caching.       │   │
│  │                                                                      │   │
│  │  thought: In the future, we might want to make this configurable    │   │
│  │  via environment variables.                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  BAD COMMENTS:                                                      │   │
│  │                                                                      │   │
│  │  ✗ "This is wrong"                                                  │   │
│  │    → Why? What should it be?                                        │   │
│  │                                                                      │   │
│  │  ✗ "Fix this"                                                       │   │
│  │    → What's the issue? How to fix?                                  │   │
│  │                                                                      │   │
│  │  ✗ "I would have done it differently"                               │   │
│  │    → Not actionable. Either suggest or let it go.                   │   │
│  │                                                                      │   │
│  │  ✗ "Needs more tests"                                               │   │
│  │    → What specific cases need testing?                              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  THE THREE RULES:                                                           │
│  ─────────────────                                                          │
│  1. Be SPECIFIC - Say exactly what and why                                  │
│  2. Be CONSTRUCTIVE - Suggest solutions, not just problems                  │
│  3. Be KIND - It's about the code, not the person                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Responding to Reviews

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HOW TO RESPOND TO CODE REVIEWS                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHEN YOU AGREE:                                                            │
│  ────────────────                                                           │
│  • Fix the issue                                                            │
│  • Reply with "Fixed" or "Done" with commit SHA                             │
│  • Don't just say "ok" - confirm you understood and fixed it                │
│                                                                             │
│  Example:                                                                   │
│  "Good catch! Fixed in abc1234. Also added a test case for this."           │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  WHEN YOU DISAGREE:                                                         │
│  ──────────────────                                                         │
│  • Explain your reasoning respectfully                                      │
│  • Ask for clarification if needed                                          │
│  • Be open to being wrong                                                   │
│  • Suggest a discussion if complex                                          │
│                                                                             │
│  Example:                                                                   │
│  "I considered that approach, but chose this because [reason].              │
│   The tradeoff is [X] vs [Y]. Do you still think the other way              │
│   is better given this context?"                                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  WHEN YOU'RE UNSURE:                                                        │
│  ───────────────────                                                        │
│  • Ask for more details                                                     │
│  • Request an example                                                       │
│  • Suggest a quick call if complex                                          │
│                                                                             │
│  Example:                                                                   │
│  "Could you elaborate on this? I'm not sure I understand the issue.         │
│   Would a specific example help?"                                           │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  BEST PRACTICES:                                                            │
│  ───────────────                                                            │
│  ✓ Respond to ALL comments                                                  │
│  ✓ Push fixes in new commits (easier to review)                             │
│  ✓ Don't take feedback personally                                           │
│  ✓ Thank reviewers for thorough reviews                                     │
│  ✓ Ask questions - it's a learning opportunity                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART VII: CI/CD INTEGRATION PATTERNS

---

## 7.1 GitHub Actions for Version Control

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  # ═══════════════════════════════════════════════════════════════════════════
  # LINT & TYPE CHECK
  # ═══════════════════════════════════════════════════════════════════════════
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript type check
        run: pnpm type-check

  # ═══════════════════════════════════════════════════════════════════════════
  # UNIT TESTS
  # ═══════════════════════════════════════════════════════════════════════════
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  # ═══════════════════════════════════════════════════════════════════════════
  # BUILD CHECK
  # ═══════════════════════════════════════════════════════════════════════════
  build:
    name: Build Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Check bundle size
        run: pnpm size-limit

  # ═══════════════════════════════════════════════════════════════════════════
  # SECURITY AUDIT
  # ═══════════════════════════════════════════════════════════════════════════
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Run security audit
        run: pnpm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # ═══════════════════════════════════════════════════════════════════════════
  # E2E TESTS (on PR to main only)
  # ═══════════════════════════════════════════════════════════════════════════
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

## 7.2 Pre-commit Validation Workflow

```yaml
# .github/workflows/validate-commits.yml
name: Validate Commits

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate-commits:
    name: Validate Commit Messages
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Validate conventional commits
        uses: wagoid/commitlint-github-action@v5
        with:
          configFile: commitlint.config.js

  check-pr-title:
    name: Validate PR Title
    runs-on: ubuntu-latest
    steps:
      - name: Check PR title follows conventional commits
        uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            docs
            style
            refactor
            perf
            test
            build
            ci
            chore
            revert
          requireScope: false
          subjectPattern: ^(?![A-Z]).+$
          subjectPatternError: |
            The subject "{subject}" found in the PR title "{title}"
            should start with a lowercase letter.

  check-branch-name:
    name: Validate Branch Name
    runs-on: ubuntu-latest
    steps:
      - name: Check branch name
        uses: deepakputhraya/action-branch-name@master
        with:
          regex: '^(feature|fix|hotfix|refactor|docs|test|chore)\/[a-z0-9-]+$'
          allowed_prefixes: 'feature,fix,hotfix,refactor,docs,test,chore'
          ignore: main,develop
          min_length: 5
          max_length: 50
```

## 7.3 Auto-versioning and Changelog

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Create Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm semantic-release
```

```javascript
// release.config.js
module.exports = {
  branches: ['main'],
  plugins: [
    // Analyze commits to determine version bump
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
        { type: 'feat', release: 'minor' },
        { type: 'fix', release: 'patch' },
        { type: 'perf', release: 'patch' },
        { type: 'refactor', release: 'patch' },
        { type: 'docs', release: false },
        { type: 'style', release: false },
        { type: 'chore', release: false },
        { breaking: true, release: 'major' },
      ],
    }],

    // Generate release notes
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: [
          { type: 'feat', section: 'Features' },
          { type: 'fix', section: 'Bug Fixes' },
          { type: 'perf', section: 'Performance' },
          { type: 'refactor', section: 'Refactoring' },
          { type: 'docs', section: 'Documentation', hidden: true },
          { type: 'style', section: 'Styles', hidden: true },
          { type: 'chore', section: 'Maintenance', hidden: true },
          { type: 'test', section: 'Tests', hidden: true },
        ],
      },
    }],

    // Update CHANGELOG.md
    ['@semantic-release/changelog', {
      changelogFile: 'CHANGELOG.md',
    }],

    // Update package.json version
    '@semantic-release/npm',

    // Commit changes
    ['@semantic-release/git', {
      assets: ['CHANGELOG.md', 'package.json', 'pnpm-lock.yaml'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    }],

    // Create GitHub release
    '@semantic-release/github',
  ],
};
```

---

# PART VIII: MONOREPO MANAGEMENT

---

## 8.1 Monorepo vs Polyrepo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MONOREPO VS POLYREPO COMPARISON                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  POLYREPO (Multiple Repositories)                                           │
│  ─────────────────────────────────                                          │
│                                                                             │
│  repo-frontend/          repo-backend/          repo-shared/               │
│  ├── package.json        ├── package.json       ├── package.json           │
│  ├── src/                ├── src/               ├── src/                   │
│  └── ...                 └── ...                └── ...                    │
│                                                                             │
│  ✓ Clear ownership                                                          │
│  ✓ Independent deployments                                                  │
│  ✓ Simpler CI/CD                                                            │
│  ✗ Dependency hell across repos                                             │
│  ✗ Difficult cross-repo changes                                             │
│  ✗ Code duplication                                                         │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  MONOREPO (Single Repository)                                               │
│  ─────────────────────────────                                              │
│                                                                             │
│  olympus/                                                                   │
│  ├── packages/                                                              │
│  │   ├── web/            ← Frontend app                                    │
│  │   ├── api/            ← Backend services                                │
│  │   ├── mobile/         ← React Native app                                │
│  │   └── shared/         ← Shared utilities                                │
│  ├── libs/                                                                  │
│  │   ├── ui/             ← Shared UI components                            │
│  │   ├── auth/           ← Auth utilities                                  │
│  │   └── db/             ← Database clients                                │
│  ├── package.json                                                           │
│  ├── pnpm-workspace.yaml                                                    │
│  └── turbo.json                                                             │
│                                                                             │
│  ✓ Single source of truth                                                   │
│  ✓ Easy cross-package changes                                               │
│  ✓ Shared tooling and config                                                │
│  ✓ Atomic commits across packages                                           │
│  ✗ Complex CI/CD                                                            │
│  ✗ Larger repository size                                                   │
│  ✗ Requires tooling (Nx, Turborepo)                                         │
│                                                                             │
│  RECOMMENDATION FOR OLYMPUS: MONOREPO with Turborepo                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    ".env.local"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": ["NODE_ENV", "NEXT_PUBLIC_*"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'libs/*'
```

```json
// package.json (root)
{
  "name": "olympus",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.12.0"
  },
  "packageManager": "pnpm@8.14.0",
  "engines": {
    "node": ">=18"
  }
}
```

## 8.3 Affected Package Detection

```yaml
# .github/workflows/ci-monorepo.yml
name: CI Monorepo

on:
  pull_request:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.changes.outputs.web }}
      api: ${{ steps.changes.outputs.api }}
      mobile: ${{ steps.changes.outputs.mobile }}
      shared: ${{ steps.changes.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            web:
              - 'packages/web/**'
              - 'libs/ui/**'
              - 'libs/shared/**'
            api:
              - 'packages/api/**'
              - 'libs/db/**'
              - 'libs/shared/**'
            mobile:
              - 'packages/mobile/**'
              - 'libs/ui/**'
              - 'libs/shared/**'
            shared:
              - 'libs/**'

  test-web:
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup
        run: pnpm install
      - name: Test Web
        run: pnpm turbo run test --filter=web

  test-api:
    needs: detect-changes
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup
        run: pnpm install
      - name: Test API
        run: pnpm turbo run test --filter=api

  test-mobile:
    needs: detect-changes
    if: needs.detect-changes.outputs.mobile == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup
        run: pnpm install
      - name: Test Mobile
        run: pnpm turbo run test --filter=mobile
```

---

# PART IX: GIT HOOKS & AUTOMATION

---

## 9.1 Husky Setup

```bash
# ═══════════════════════════════════════════════════════════════════════════
# HUSKY INSTALLATION
# ═══════════════════════════════════════════════════════════════════════════

# Install Husky
pnpm add -D husky

# Initialize Husky
pnpm exec husky init

# This creates .husky directory with pre-commit hook
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
pnpm lint-staged

# Type check
pnpm type-check
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message
pnpm commitlint --edit $1
```

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests before push
pnpm test

# Check for secrets
pnpm secretlint
```

## 9.2 Lint-Staged Configuration

```javascript
// lint-staged.config.js
module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],

  // Type check TypeScript files
  '*.{ts,tsx}': () => 'tsc --noEmit',

  // Style files
  '*.{css,scss}': [
    'stylelint --fix',
    'prettier --write',
  ],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write', 'markdownlint --fix'],

  // Package.json - sort and validate
  'package.json': ['sort-package-json'],

  // Check for secrets in all staged files
  '*': ['secretlint'],
};
```

## 9.3 Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of these
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Subject cannot be empty
    'subject-empty': [2, 'never'],
    // Subject must start with lowercase
    'subject-case': [2, 'always', 'lower-case'],
    // Subject cannot end with period
    'subject-full-stop': [2, 'never', '.'],
    // Max length for header
    'header-max-length': [2, 'always', 100],
    // Body must have blank line before
    'body-leading-blank': [2, 'always'],
    // Footer must have blank line before
    'footer-leading-blank': [2, 'always'],
  },
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};
```

## 9.4 Secret Detection

```yaml
# .secretlintrc.yml
rules:
  # AWS credentials
  - id: "@secretlint/secretlint-rule-aws"

  # GCP credentials
  - id: "@secretlint/secretlint-rule-gcp"

  # Private keys
  - id: "@secretlint/secretlint-rule-privatekey"

  # Generic credentials (passwords, tokens)
  - id: "@secretlint/secretlint-rule-pattern"
    options:
      patterns:
        - name: "Password"
          pattern: "password\\s*[:=]\\s*['\"][^'\"]+['\"]"
        - name: "API Key"
          pattern: "api[_-]?key\\s*[:=]\\s*['\"][^'\"]+['\"]"
        - name: "Secret"
          pattern: "secret\\s*[:=]\\s*['\"][^'\"]+['\"]"
        - name: "Token"
          pattern: "token\\s*[:=]\\s*['\"][^'\"]+['\"]"

# Ignore patterns
ignoreFiles:
  - "**/.env.example"
  - "**/test/**"
  - "**/*.test.ts"
```

---

# PART X: SECURITY & COMPLIANCE

---

## 10.1 Secret Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SECRETS MANAGEMENT BEST PRACTICES                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RULE 1: NEVER COMMIT SECRETS                                               │
│  ─────────────────────────────────                                          │
│                                                                             │
│  ✗ NEVER in code files                                                      │
│  ✗ NEVER in config files                                                    │
│  ✗ NEVER in .env files that get committed                                   │
│  ✗ NEVER in comments ("// API_KEY: abc123")                                 │
│  ✗ NEVER in commit messages                                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  GITIGNORE FOR SECRETS:                                                     │
│  ──────────────────────                                                     │
│                                                                             │
│  # .gitignore                                                               │
│  .env                                                                       │
│  .env.local                                                                 │
│  .env.*.local                                                               │
│  .env.development                                                           │
│  .env.production                                                            │
│  *.pem                                                                      │
│  *.key                                                                      │
│  credentials.json                                                           │
│  service-account.json                                                       │
│  secrets/                                                                   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  SAFE PATTERNS:                                                             │
│  ──────────────                                                             │
│                                                                             │
│  .env.example         → Template with empty/fake values (committed)         │
│  Environment vars     → Set in CI/CD, hosting platform                      │
│  Secret managers      → AWS Secrets Manager, Vault, Doppler                 │
│  GitHub Secrets       → For CI/CD pipelines                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  IF YOU ACCIDENTALLY COMMITTED A SECRET:                                    │
│  ─────────────────────────────────────────                                  │
│                                                                             │
│  1. IMMEDIATELY revoke/rotate the secret                                    │
│  2. Remove from Git history (see below)                                     │
│  3. Force push (with team notification)                                     │
│  4. Check if secret was exposed on GitHub                                   │
│                                                                             │
│  # Remove secret from history                                               │
│  git filter-branch --force --index-filter \                                 │
│    "git rm --cached --ignore-unmatch path/to/secret" \                      │
│    --prune-empty --tag-name-filter cat -- --all                             │
│                                                                             │
│  # Or use BFG Repo-Cleaner (faster)                                         │
│  bfg --delete-files secret.env                                              │
│  bfg --replace-text passwords.txt                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 10.2 GitHub Security Features

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  # ═══════════════════════════════════════════════════════════════════════════
  # CODE SCANNING (CodeQL)
  # ═══════════════════════════════════════════════════════════════════════════
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  # ═══════════════════════════════════════════════════════════════════════════
  # DEPENDENCY SCANNING
  # ═══════════════════════════════════════════════════════════════════════════
  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Dependency Review
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: high

  # ═══════════════════════════════════════════════════════════════════════════
  # SECRET SCANNING
  # ═══════════════════════════════════════════════════════════════════════════
  secret-scan:
    name: Secret Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          extra_args: --only-verified

      - name: GitLeaks Secret Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 10.3 Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # JavaScript/TypeScript dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Dubai"
    open-pull-requests-limit: 10
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "automated"
    groups:
      # Group minor and patch updates
      production-dependencies:
        patterns:
          - "*"
        exclude-patterns:
          - "@types/*"
          - "eslint*"
          - "prettier"
        update-types:
          - "minor"
          - "patch"
      # Separate group for dev dependencies
      dev-dependencies:
        patterns:
          - "@types/*"
          - "eslint*"
          - "prettier"
          - "typescript"
        update-types:
          - "minor"
          - "patch"
    ignore:
      # Ignore major version updates automatically
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "ci"
    labels:
      - "ci"
      - "automated"

  # Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "build(docker)"
```

---

# PART XI: RELEASE MANAGEMENT

---

## 11.1 Semantic Versioning

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANTIC VERSIONING (SemVer)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FORMAT: MAJOR.MINOR.PATCH                                                  │
│                                                                             │
│  Example: 2.4.1                                                             │
│           │ │ │                                                             │
│           │ │ └── PATCH: Bug fixes, no API changes                          │
│           │ │            Increment: fix commits                             │
│           │ │                                                               │
│           │ └──── MINOR: New features, backwards compatible                 │
│           │              Increment: feat commits                            │
│           │                                                                 │
│           └────── MAJOR: Breaking changes, not backwards compatible         │
│                          Increment: BREAKING CHANGE commits                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  VERSION PROGRESSION:                                                       │
│  ────────────────────                                                       │
│                                                                             │
│  0.0.1 → 0.0.2 (patch: bug fix)                                             │
│  0.0.2 → 0.1.0 (minor: new feature)                                         │
│  0.1.0 → 0.1.1 (patch: bug fix)                                             │
│  0.1.1 → 0.2.0 (minor: new feature)                                         │
│  0.2.0 → 1.0.0 (major: ready for production / breaking change)              │
│  1.0.0 → 1.0.1 (patch)                                                      │
│  1.0.1 → 1.1.0 (minor)                                                      │
│  1.1.0 → 2.0.0 (major: breaking change)                                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PRE-RELEASE VERSIONS:                                                      │
│  ─────────────────────                                                      │
│                                                                             │
│  1.0.0-alpha.1    → Alpha (early testing, unstable)                         │
│  1.0.0-beta.1     → Beta (feature complete, testing)                        │
│  1.0.0-rc.1       → Release Candidate (final testing)                       │
│  1.0.0            → Stable release                                          │
│                                                                             │
│  BUILD METADATA:                                                            │
│  ───────────────                                                            │
│                                                                             │
│  1.0.0+20240121          → Build date                                       │
│  1.0.0+build.123         → Build number                                     │
│  1.0.0-beta.1+sha.abc123 → Pre-release with commit SHA                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 11.2 Git Tags for Releases

```bash
# ═══════════════════════════════════════════════════════════════════════════
# CREATING RELEASES WITH GIT TAGS
# ═══════════════════════════════════════════════════════════════════════════

# Create annotated tag (recommended)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Create tag with detailed message
git tag -a v1.0.0 -m "Release version 1.0.0

Features:
- User authentication
- Dashboard
- Payments integration

Bug fixes:
- Fixed checkout timeout
- Resolved mobile layout issues
"

# Create tag on specific commit
git tag -a v1.0.0 abc1234 -m "Release version 1.0.0"

# Push single tag
git push origin v1.0.0

# Push all tags
git push origin --tags

# List tags
git tag -l
git tag -l "v1.*"          # Pattern matching

# Show tag details
git show v1.0.0

# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin --delete v1.0.0

# ═══════════════════════════════════════════════════════════════════════════
# LIGHTWEIGHT TAGS (not recommended for releases)
# ═══════════════════════════════════════════════════════════════════════════

# Create (no message, just a pointer)
git tag v1.0.0

# These don't store tagger info, date, or message
# Use annotated tags for releases
```

## 11.3 Changelog Generation

```markdown
# CHANGELOG.md

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature in progress

## [1.2.0] - 2025-01-21

### Added
- User dashboard with analytics
- Export functionality for reports
- Dark mode support

### Changed
- Improved checkout performance by 40%
- Updated payment processing to use Stripe v2

### Fixed
- Fixed mobile navigation bug on iOS
- Resolved timezone issues in scheduling

### Security
- Updated dependencies to patch vulnerabilities

## [1.1.0] - 2025-01-15

### Added
- Two-factor authentication
- Password recovery flow

### Deprecated
- Legacy API endpoints (will be removed in 2.0.0)

## [1.0.0] - 2025-01-01

### Added
- Initial release
- User authentication
- Basic dashboard
- Payment integration

[Unreleased]: https://github.com/user/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/user/repo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/user/repo/releases/tag/v1.0.0
```

---

# PART XII: RECOVERY & DISASTER MANAGEMENT

---

## 12.1 Git Reflog - Your Safety Net

```bash
# ═══════════════════════════════════════════════════════════════════════════
# GIT REFLOG - RECOVERING "LOST" COMMITS
# ═══════════════════════════════════════════════════════════════════════════

# View reflog (where HEAD has been)
git reflog

# Output example:
# abc1234 HEAD@{0}: commit: feat: add login
# def5678 HEAD@{1}: checkout: moving from feature to main
# ghi9012 HEAD@{2}: reset: moving to HEAD~2
# jkl3456 HEAD@{3}: commit: feat: add user settings
# mno7890 HEAD@{4}: commit: feat: add profile page

# View reflog for specific branch
git reflog show main

# View reflog with dates
git reflog --date=iso

# ═══════════════════════════════════════════════════════════════════════════
# RECOVERY SCENARIOS
# ═══════════════════════════════════════════════════════════════════════════

# SCENARIO 1: Accidentally deleted a branch
git branch -D feature/important  # Oops!
git reflog                       # Find the commit
git branch feature/important abc1234  # Recreate branch

# SCENARIO 2: Hard reset went too far
git reset --hard HEAD~5         # Oops, too many!
git reflog                      # Find where you were
git reset --hard HEAD@{1}       # Go back to before the reset

# SCENARIO 3: Lost commits after rebase
git rebase -i HEAD~5           # Made a mistake
git reflog                     # Find pre-rebase state
git reset --hard HEAD@{5}      # Restore

# SCENARIO 4: Recover deleted stash
git stash drop                 # Oops!
git fsck --unreachable | grep commit  # Find orphaned commits
git stash apply <sha>          # Apply the lost stash

# ═══════════════════════════════════════════════════════════════════════════
# REFLOG EXPIRATION
# ═══════════════════════════════════════════════════════════════════════════

# Reflog entries expire after:
# - 90 days for reachable commits
# - 30 days for unreachable commits

# Check reflog expiration settings
git config gc.reflogExpire
git config gc.reflogExpireUnreachable

# Extend reflog retention (optional)
git config gc.reflogExpire 180.days
git config gc.reflogExpireUnreachable 90.days
```

## 12.2 Reverting Changes

```bash
# ═══════════════════════════════════════════════════════════════════════════
# REVERTING CHANGES - SAFE UNDO
# ═══════════════════════════════════════════════════════════════════════════

# Revert a single commit (creates new commit)
git revert abc1234
git revert abc1234 --no-commit  # Stage changes without committing

# Revert multiple commits
git revert abc1234..def5678

# Revert a merge commit
git revert -m 1 abc1234
# -m 1 = keep first parent (usually main)
# -m 2 = keep second parent (feature branch)

# ═══════════════════════════════════════════════════════════════════════════
# REVERT VS RESET
# ═══════════════════════════════════════════════════════════════════════════
#
# git revert:
# - Creates NEW commit that undoes changes
# - Safe for shared/public branches
# - Preserves history
# - Use for: Undoing changes on main/production
#
# git reset:
# - Moves branch pointer backward
# - Rewrites history
# - DANGEROUS for shared branches
# - Use for: Cleaning up local work before push
#
# ═══════════════════════════════════════════════════════════════════════════

# Reset modes comparison:
# --soft:  Undo commit, keep changes staged
# --mixed: Undo commit, keep changes unstaged (default)
# --hard:  Undo commit, discard all changes

# Soft reset (uncommit, keep staged)
git reset --soft HEAD~1

# Mixed reset (uncommit, keep unstaged)
git reset HEAD~1
git reset --mixed HEAD~1

# Hard reset (uncommit, discard changes) - DANGEROUS
git reset --hard HEAD~1

# Reset specific file
git checkout HEAD~1 -- path/to/file
```

## 12.3 Git Bisect - Finding Bugs

```bash
# ═══════════════════════════════════════════════════════════════════════════
# GIT BISECT - BINARY SEARCH FOR BUGS
# ═══════════════════════════════════════════════════════════════════════════

# When: You know something broke, but not which commit

# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark known good commit
git bisect good v1.0.0
# Or: git bisect good abc1234

# Git checks out middle commit
# Test if bug exists, then:
git bisect good  # If bug not present
git bisect bad   # If bug present

# Repeat until Git finds the first bad commit
# Output: "abc1234 is the first bad commit"

# End bisect
git bisect reset

# ═══════════════════════════════════════════════════════════════════════════
# AUTOMATED BISECT
# ═══════════════════════════════════════════════════════════════════════════

# Run a test script automatically
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
git bisect run npm test

# The script should exit:
# - 0 if good
# - 1-127 (except 125) if bad
# - 125 to skip commit

# Example test script (test-bug.sh):
# #!/bin/bash
# npm run build && npm test
# exit $?

# ═══════════════════════════════════════════════════════════════════════════
# BISECT WITH SKIP
# ═══════════════════════════════════════════════════════════════════════════

# Skip commits that can't be tested
git bisect skip

# Skip range of commits
git bisect skip abc1234..def5678

# View bisect log
git bisect log

# Replay bisect
git bisect replay bisect.log
```

## 12.4 Emergency Recovery Procedures

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMERGENCY RECOVERY PROCEDURES                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EMERGENCY 1: FORCE PUSHED TO MAIN                                          │
│  ─────────────────────────────────────────────────                          │
│                                                                             │
│  1. Don't panic! Git keeps everything.                                      │
│                                                                             │
│  2. On any machine with the old main:                                       │
│     git fetch origin                                                        │
│     git checkout main                                                       │
│     # Your local main still has old commits                                 │
│                                                                             │
│  3. Force push the correct version:                                         │
│     git push -f origin main                                                 │
│                                                                             │
│  4. If no one has old version:                                              │
│     # Use reflog on the server (if accessible)                              │
│     # Or restore from backup                                                │
│                                                                             │
│  5. Notify team immediately                                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  EMERGENCY 2: CORRUPTED REPOSITORY                                          │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  1. Verify corruption:                                                      │
│     git fsck --full                                                         │
│                                                                             │
│  2. Try to recover:                                                         │
│     git reflog                                                              │
│     git gc --prune=now                                                      │
│                                                                             │
│  3. Clone fresh if needed:                                                  │
│     git clone <url> new-repo                                                │
│     # Copy local changes from corrupted repo if needed                      │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  EMERGENCY 3: MERGE CONFLICT DISASTER                                       │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  1. Abort the merge:                                                        │
│     git merge --abort                                                       │
│                                                                             │
│  2. Or reset to before merge:                                               │
│     git reset --hard ORIG_HEAD                                              │
│                                                                             │
│  3. Try again with strategy:                                                │
│     git merge --strategy-option theirs feature                              │
│     git merge --strategy-option ours feature                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  EMERGENCY 4: LOST LOCAL CHANGES                                            │
│  ─────────────────────────────────                                          │
│                                                                             │
│  1. Check stash:                                                            │
│     git stash list                                                          │
│     git stash pop                                                           │
│                                                                             │
│  2. Check reflog:                                                           │
│     git reflog                                                              │
│                                                                             │
│  3. Check for dangling commits:                                             │
│     git fsck --lost-found                                                   │
│     # Look in .git/lost-found/                                              │
│                                                                             │
│  4. Check IDE history (IntelliJ, VS Code local history)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART XIII: PERFORMANCE OPTIMIZATION

---

## 13.1 Large Repository Optimization

```bash
# ═══════════════════════════════════════════════════════════════════════════
# OPTIMIZING LARGE REPOSITORIES
# ═══════════════════════════════════════════════════════════════════════════

# Check repository size
git count-objects -vH

# Run garbage collection
git gc
git gc --aggressive  # More thorough, slower

# Prune unreachable objects
git prune

# Repack repository
git repack -a -d --depth=250 --window=250

# ═══════════════════════════════════════════════════════════════════════════
# SHALLOW CLONES
# ═══════════════════════════════════════════════════════════════════════════

# Clone with limited history
git clone --depth=1 <url>           # Only latest commit
git clone --depth=100 <url>         # Last 100 commits
git clone --shallow-since="2024-01-01" <url>  # Since date

# Convert shallow to full
git fetch --unshallow

# Fetch more history
git fetch --deepen=100

# ═══════════════════════════════════════════════════════════════════════════
# PARTIAL CLONES (Git 2.22+)
# ═══════════════════════════════════════════════════════════════════════════

# Clone without blobs (files downloaded on demand)
git clone --filter=blob:none <url>

# Clone without blobs larger than 1MB
git clone --filter=blob:limit=1m <url>

# Clone only specific directory
git clone --filter=blob:none --sparse <url>
git sparse-checkout set src/components

# ═══════════════════════════════════════════════════════════════════════════
# SPARSE CHECKOUT
# ═══════════════════════════════════════════════════════════════════════════

# Enable sparse checkout
git sparse-checkout init --cone

# Check out specific directories
git sparse-checkout set packages/web packages/shared

# List sparse checkout paths
git sparse-checkout list

# Disable sparse checkout
git sparse-checkout disable
```

## 13.2 Git LFS (Large File Storage)

```bash
# ═══════════════════════════════════════════════════════════════════════════
# GIT LFS FOR LARGE FILES
# ═══════════════════════════════════════════════════════════════════════════

# Install Git LFS
git lfs install

# Track file types
git lfs track "*.psd"
git lfs track "*.zip"
git lfs track "*.mp4"
git lfs track "assets/**"

# This creates .gitattributes
cat .gitattributes
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.zip filter=lfs diff=lfs merge=lfs -text
# *.mp4 filter=lfs diff=lfs merge=lfs -text

# Commit the .gitattributes
git add .gitattributes
git commit -m "chore: configure Git LFS"

# View tracked patterns
git lfs track

# View LFS files
git lfs ls-files

# Migrate existing files to LFS
git lfs migrate import --include="*.psd,*.zip"

# ═══════════════════════════════════════════════════════════════════════════
# LFS CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

# Fetch LFS files on clone
git lfs install --skip-smudge  # Don't auto-download
git lfs pull                   # Download when needed

# Set concurrent downloads
git config lfs.concurrenttransfers 8

# Set transfer batch size
git config lfs.batch true
```

## 13.3 Performance Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GIT PERFORMANCE BEST PRACTICES                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DO:                                                                        │
│  ───                                                                        │
│  ✓ Use shallow clones in CI/CD                                              │
│  ✓ Use Git LFS for large binary files                                       │
│  ✓ Keep .gitignore up to date                                               │
│  ✓ Delete merged branches                                                   │
│  ✓ Run gc periodically (weekly)                                             │
│  ✓ Use sparse checkout for monorepos                                        │
│  ✓ Consider splitting very large repos                                      │
│                                                                             │
│  DON'T:                                                                     │
│  ─────                                                                      │
│  ✗ Commit large binary files directly                                       │
│  ✗ Keep thousands of branches                                               │
│  ✗ Store build artifacts in Git                                             │
│  ✗ Commit node_modules or vendor directories                                │
│  ✗ Use force push on shared branches                                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  RECOMMENDED .gitignore FOR PERFORMANCE:                                    │
│  ─────────────────────────────────────────                                  │
│                                                                             │
│  # Dependencies                                                             │
│  node_modules/                                                              │
│  vendor/                                                                    │
│                                                                             │
│  # Build outputs                                                            │
│  dist/                                                                      │
│  build/                                                                     │
│  .next/                                                                     │
│  out/                                                                       │
│                                                                             │
│  # Cache directories                                                        │
│  .cache/                                                                    │
│  .turbo/                                                                    │
│                                                                             │
│  # Large media files (use LFS instead)                                      │
│  *.psd                                                                      │
│  *.ai                                                                       │
│  *.mp4                                                                      │
│  *.mov                                                                      │
│                                                                             │
│  # IDE                                                                      │
│  .idea/                                                                     │
│  .vscode/                                                                   │
│  *.swp                                                                      │
│                                                                             │
│  # OS                                                                       │
│  .DS_Store                                                                  │
│  Thumbs.db                                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART XIV: AI-ASSISTED VERSION CONTROL

---

## 14.1 AI Commit Message Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI-ASSISTED COMMIT MESSAGES                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GITHUB COPILOT COMMIT MESSAGES:                                            │
│  ─────────────────────────────────                                          │
│                                                                             │
│  In VS Code with Copilot:                                                   │
│  1. Stage your changes                                                      │
│  2. Open Source Control (Ctrl+Shift+G)                                      │
│  3. Click sparkle icon in commit message box                                │
│  4. Copilot generates message from diff                                     │
│  5. Edit and commit                                                         │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  CONVENTIONAL COMMITS AI TOOL:                                              │
│  ─────────────────────────────                                              │
│                                                                             │
│  # Install                                                                  │
│  npm i -g @commitlint/cz-commitlint commitizen                              │
│                                                                             │
│  # Use interactive commit                                                   │
│  git cz                                                                     │
│                                                                             │
│  Prompts:                                                                   │
│  ? Select type: feat                                                        │
│  ? Scope: auth                                                              │
│  ? Subject: add password reset flow                                         │
│  ? Body: (optional)                                                         │
│  ? Breaking changes? No                                                     │
│  ? Issues closed: #123                                                      │
│                                                                             │
│  Result: feat(auth): add password reset flow                                │
│          Closes #123                                                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  CLAUDE/GPT FOR COMMIT MESSAGES:                                            │
│  ─────────────────────────────────                                          │
│                                                                             │
│  Prompt:                                                                    │
│  "Generate a conventional commit message for this diff:                     │
│                                                                             │
│  [paste git diff output]                                                    │
│                                                                             │
│  Use format: type(scope): subject                                           │
│  Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore      │
│  Keep subject under 50 chars                                                │
│  Include body if complex changes"                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 14.2 AI Code Review

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI-ASSISTED CODE REVIEW                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GITHUB COPILOT FOR PULL REQUESTS:                                          │
│  ──────────────────────────────────                                         │
│                                                                             │
│  1. Enable Copilot for PRs in repository settings                           │
│  2. When reviewing PR, click "Review with Copilot"                          │
│  3. Copilot analyzes changes and suggests:                                  │
│     - Potential bugs                                                        │
│     - Security issues                                                       │
│     - Performance concerns                                                  │
│     - Code style improvements                                               │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  USING CLAUDE FOR CODE REVIEW:                                              │
│  ─────────────────────────────────                                          │
│                                                                             │
│  Prompt:                                                                    │
│  "Review this code change for:                                              │
│   1. Security vulnerabilities                                               │
│   2. Performance issues                                                     │
│   3. Best practice violations                                               │
│   4. Potential bugs                                                         │
│   5. Readability improvements                                               │
│                                                                             │
│   Use conventional comments format:                                         │
│   - issue: for must-fix items                                               │
│   - suggestion: for improvements                                            │
│   - nitpick: for minor style issues                                         │
│   - praise: for good patterns                                               │
│                                                                             │
│   [paste diff]"                                                             │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  AUTOMATED REVIEW BOTS:                                                     │
│  ──────────────────────                                                     │
│                                                                             │
│  # CodeRabbit - AI code review bot                                          │
│  # Add to GitHub repo, reviews every PR                                     │
│                                                                             │
│  # Sourcery - Python-focused AI review                                      │
│  # Suggests refactoring and improvements                                    │
│                                                                             │
│  # Amazon CodeGuru - AWS-integrated review                                  │
│  # Security and best practices                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART XV: TEAM COLLABORATION PATTERNS

---

## 15.1 Code Ownership Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CODE OWNERSHIP MODELS                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODEL 1: STRONG CODE OWNERSHIP                                             │
│  ──────────────────────────────────                                         │
│                                                                             │
│  - Each file/module has one owner                                           │
│  - Only owner can approve changes                                           │
│  - Clear accountability                                                     │
│  - Risk: Bottlenecks when owner unavailable                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  MODEL 2: WEAK CODE OWNERSHIP                                               │
│  ────────────────────────────────                                           │
│                                                                             │
│  - Primary owner + backup reviewers                                         │
│  - Owner consulted but not required                                         │
│  - More flexible                                                            │
│  - Risk: Less accountability                                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  MODEL 3: COLLECTIVE CODE OWNERSHIP                                         │
│  ──────────────────────────────────────                                     │
│                                                                             │
│  - Anyone can modify any code                                               │
│  - Team reviews together                                                    │
│  - Maximum flexibility                                                      │
│  - Risk: No clear responsibility                                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  RECOMMENDED FOR OLYMPUS: WEAK OWNERSHIP                                    │
│                                                                             │
│  # .github/CODEOWNERS                                                       │
│  * @ayoub-agrebi                     # Default owner                        │
│                                                                             │
│  /packages/web/ @frontend-team       # Frontend team primary                │
│  /packages/api/ @backend-team        # Backend team primary                 │
│  /packages/shared/ @core-team        # Core team primary                    │
│                                                                             │
│  # Critical files require multiple approvals                                │
│  /packages/api/auth/ @security-team @ayoub-agrebi                           │
│  /.github/ @devops-team @ayoub-agrebi                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 15.2 Team Workflow Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TEAM WORKFLOW PATTERNS                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PATTERN 1: PULL REQUEST WORKFLOW                                           │
│  ─────────────────────────────────                                          │
│                                                                             │
│  Developer → Branch → PR → Review → Merge                                   │
│                                                                             │
│  ✓ Formal code review                                                       │
│  ✓ CI validation before merge                                               │
│  ✓ Documented decisions                                                     │
│  Best for: Most teams                                                       │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PATTERN 2: PAIR PROGRAMMING                                                │
│  ───────────────────────────────                                            │
│                                                                             │
│  Two developers → One branch → Direct merge (reviewed in real-time)         │
│                                                                             │
│  ✓ Real-time review                                                         │
│  ✓ Knowledge sharing                                                        │
│  ✓ Faster for complex features                                              │
│  Best for: Complex features, onboarding                                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PATTERN 3: SHIP / SHOW / ASK                                               │
│  ─────────────────────────────────                                          │
│                                                                             │
│  SHIP:  Small, confident changes → merge without PR                         │
│  SHOW:  Normal changes → PR for awareness (auto-merge)                      │
│  ASK:   Complex/risky changes → PR with review required                     │
│                                                                             │
│  ✓ Faster velocity for trusted changes                                      │
│  ✓ Review effort where it matters                                           │
│  Best for: Experienced teams with good test coverage                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PATTERN 4: STACKED PRs                                                     │
│  ─────────────────────────────                                              │
│                                                                             │
│  Large feature split into dependent PRs:                                    │
│                                                                             │
│  PR1: Add database schema    (base)                                         │
│    ↑                                                                        │
│  PR2: Add API endpoints      (depends on PR1)                               │
│    ↑                                                                        │
│  PR3: Add UI components      (depends on PR2)                               │
│    ↑                                                                        │
│  PR4: Add tests             (depends on PR3)                                │
│                                                                             │
│  ✓ Easier to review (smaller PRs)                                           │
│  ✓ Parallel development possible                                            │
│  ✓ Earlier feedback                                                         │
│  Tools: Graphite, ghstack                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART XVI: PLATFORM-SPECIFIC INTEGRATIONS

---

## 16.1 GitHub Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GITHUB-SPECIFIC FEATURES                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GITHUB CLI (gh):                                                           │
│  ─────────────────                                                          │
│                                                                             │
│  # Authentication                                                           │
│  gh auth login                                                              │
│  gh auth status                                                             │
│                                                                             │
│  # Pull Requests                                                            │
│  gh pr create --title "Feature" --body "Description"                        │
│  gh pr list                                                                 │
│  gh pr view 123                                                             │
│  gh pr checkout 123                                                         │
│  gh pr merge 123 --squash                                                   │
│  gh pr review 123 --approve                                                 │
│                                                                             │
│  # Issues                                                                   │
│  gh issue create --title "Bug" --body "Description"                         │
│  gh issue list --label bug                                                  │
│  gh issue close 456                                                         │
│                                                                             │
│  # Repository                                                               │
│  gh repo create --public                                                    │
│  gh repo clone owner/repo                                                   │
│  gh repo fork                                                               │
│                                                                             │
│  # Actions                                                                  │
│  gh run list                                                                │
│  gh run view 123456                                                         │
│  gh run watch 123456                                                        │
│  gh run rerun 123456                                                        │
│                                                                             │
│  # Releases                                                                 │
│  gh release create v1.0.0 --generate-notes                                  │
│  gh release download v1.0.0                                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  GITHUB PROJECTS (Project Boards):                                          │
│  ──────────────────────────────────                                         │
│                                                                             │
│  - Link PRs/Issues to project boards                                        │
│  - Automated workflows (move to done on merge)                              │
│  - Custom fields for tracking                                               │
│  - Views: Board, Table, Timeline                                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  GITHUB DISCUSSIONS:                                                        │
│  ────────────────────                                                       │
│                                                                             │
│  - Q&A for community questions                                              │
│  - Announcements for releases                                               │
│  - Ideas for feature requests                                               │
│  - Show and tell for showcases                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 16.2 AI Platform Integration (Lovable, Bolt.new)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI PLATFORM GIT INTEGRATION                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOVABLE.DEV:                                                               │
│  ─────────────                                                              │
│                                                                             │
│  Two-way sync with GitHub:                                                  │
│  1. Go to Settings → Connectors → GitHub                                    │
│  2. Authorize Lovable                                                       │
│  3. Choose existing repo or create new                                      │
│  4. Select branch to sync (usually main)                                    │
│                                                                             │
│  Sync behavior:                                                             │
│  - Lovable changes → Automatic push to GitHub                               │
│  - GitHub commits → Automatic pull to Lovable                               │
│  - Syncs default branch only                                                │
│                                                                             │
│  Best practice:                                                             │
│  - Use develop branch for Lovable                                           │
│  - Create PR from develop to main                                           │
│  - Review before production                                                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  BOLT.NEW:                                                                  │
│  ──────────                                                                 │
│                                                                             │
│  Export options:                                                            │
│  1. Download as ZIP                                                         │
│  2. Push to GitHub (new repo)                                               │
│  3. Connect existing repo                                                   │
│                                                                             │
│  Integration steps:                                                         │
│  1. Click "Deploy" or "Export"                                              │
│  2. Choose GitHub                                                           │
│  3. Authorize Bolt                                                          │
│  4. Select/create repository                                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  RECOMMENDED WORKFLOW FOR AI PLATFORMS:                                     │
│  ──────────────────────────────────────                                     │
│                                                                             │
│  AI Platform (Lovable/Bolt) → develop branch                                │
│            ↓                                                                │
│  Create PR: develop → main                                                  │
│            ↓                                                                │
│  Code Review (human or AI-assisted)                                         │
│            ↓                                                                │
│  Merge to main                                                              │
│            ↓                                                                │
│  Auto-deploy (Vercel/Netlify)                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART XVII: THE COMPLETE COMMAND REFERENCE

---

## 17.1 Essential Git Commands

```bash
# ═══════════════════════════════════════════════════════════════════════════
# GIT COMMAND REFERENCE - COMPLETE GUIDE
# ═══════════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────────
# SETUP & CONFIGURATION
# ───────────────────────────────────────────────────────────────────────────

git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global init.defaultBranch main
git config --global core.editor "code --wait"
git config --global pull.rebase true
git config --list                        # View all config

# ───────────────────────────────────────────────────────────────────────────
# REPOSITORY OPERATIONS
# ───────────────────────────────────────────────────────────────────────────

git init                                 # Initialize new repo
git clone <url>                          # Clone remote repo
git clone --depth=1 <url>                # Shallow clone
git remote add origin <url>              # Add remote
git remote -v                            # List remotes
git remote set-url origin <url>          # Change remote URL

# ───────────────────────────────────────────────────────────────────────────
# BASIC WORKFLOW
# ───────────────────────────────────────────────────────────────────────────

git status                               # Check status
git add <file>                           # Stage file
git add .                                # Stage all changes
git add -p                               # Interactive staging
git commit -m "message"                  # Commit
git commit -am "message"                 # Stage tracked + commit
git commit --amend                       # Amend last commit
git push                                 # Push to remote
git push -u origin branch                # Push + set upstream
git pull                                 # Pull from remote
git fetch                                # Fetch without merge

# ───────────────────────────────────────────────────────────────────────────
# BRANCHING
# ───────────────────────────────────────────────────────────────────────────

git branch                               # List local branches
git branch -a                            # List all branches
git branch <name>                        # Create branch
git branch -d <name>                     # Delete branch (safe)
git branch -D <name>                     # Delete branch (force)
git checkout <branch>                    # Switch branch
git checkout -b <branch>                 # Create + switch
git switch <branch>                      # Switch (new syntax)
git switch -c <branch>                   # Create + switch (new)

# ───────────────────────────────────────────────────────────────────────────
# MERGING
# ───────────────────────────────────────────────────────────────────────────

git merge <branch>                       # Merge branch
git merge --no-ff <branch>               # Merge with commit
git merge --squash <branch>              # Squash merge
git merge --abort                        # Abort merge
git rebase <branch>                      # Rebase onto branch
git rebase -i HEAD~3                     # Interactive rebase
git rebase --abort                       # Abort rebase
git cherry-pick <sha>                    # Cherry pick commit

# ───────────────────────────────────────────────────────────────────────────
# VIEWING HISTORY
# ───────────────────────────────────────────────────────────────────────────

git log                                  # View history
git log --oneline                        # Compact view
git log --graph                          # With graph
git log --oneline --graph --all          # Full picture
git log -p                               # With diffs
git log --stat                           # With stats
git log --author="name"                  # By author
git log --since="2 weeks ago"            # By date
git show <sha>                           # Show commit
git diff                                 # Unstaged changes
git diff --staged                        # Staged changes
git diff <branch1>..<branch2>            # Between branches

# ───────────────────────────────────────────────────────────────────────────
# UNDOING CHANGES
# ───────────────────────────────────────────────────────────────────────────

git checkout -- <file>                   # Discard changes
git restore <file>                       # Discard (new syntax)
git restore --staged <file>              # Unstage
git reset HEAD <file>                    # Unstage (old syntax)
git reset --soft HEAD~1                  # Undo commit, keep staged
git reset --mixed HEAD~1                 # Undo commit, keep unstaged
git reset --hard HEAD~1                  # Undo commit, discard
git revert <sha>                         # Revert commit (safe)
git clean -fd                            # Remove untracked

# ───────────────────────────────────────────────────────────────────────────
# STASHING
# ───────────────────────────────────────────────────────────────────────────

git stash                                # Stash changes
git stash push -m "message"              # Stash with message
git stash list                           # List stashes
git stash pop                            # Apply + remove latest
git stash apply                          # Apply latest
git stash apply stash@{2}                # Apply specific
git stash drop                           # Remove latest
git stash clear                          # Remove all

# ───────────────────────────────────────────────────────────────────────────
# TAGGING
# ───────────────────────────────────────────────────────────────────────────

git tag                                  # List tags
git tag v1.0.0                           # Lightweight tag
git tag -a v1.0.0 -m "message"           # Annotated tag
git tag -a v1.0.0 <sha> -m "msg"         # Tag specific commit
git push origin v1.0.0                   # Push tag
git push origin --tags                   # Push all tags
git tag -d v1.0.0                        # Delete local tag
git push origin --delete v1.0.0          # Delete remote tag

# ───────────────────────────────────────────────────────────────────────────
# INSPECTION
# ───────────────────────────────────────────────────────────────────────────

git blame <file>                         # Who changed what
git bisect start                         # Start binary search
git bisect bad                           # Mark current as bad
git bisect good <sha>                    # Mark as good
git bisect reset                         # End bisect
git reflog                               # View ref history
git fsck                                 # Check integrity
```

## 17.2 Git Aliases

```bash
# ═══════════════════════════════════════════════════════════════════════════
# RECOMMENDED GIT ALIASES
# ═══════════════════════════════════════════════════════════════════════════

# Add to ~/.gitconfig or run git config commands

[alias]
    # Shortcuts
    s = status
    a = add
    c = commit
    co = checkout
    br = branch
    p = push
    pl = pull
    f = fetch

    # Better log
    lg = log --oneline --graph --decorate
    lga = log --oneline --graph --decorate --all
    ll = log --pretty=format:'%C(yellow)%h%Creset %s %C(green)(%cr)%Creset %C(blue)<%an>%Creset'

    # Quick commits
    cm = commit -m
    ca = commit --amend
    can = commit --amend --no-edit

    # Branch operations
    new = checkout -b
    del = branch -d
    delf = branch -D

    # Stash shortcuts
    ss = stash
    sp = stash pop
    sl = stash list

    # Diff shortcuts
    d = diff
    ds = diff --staged
    dc = diff --cached

    # Reset shortcuts
    unstage = reset HEAD --
    undo = reset --soft HEAD~1
    wipe = reset --hard HEAD

    # Show last commit
    last = log -1 HEAD --stat

    # List branches by recent
    recent = branch --sort=-committerdate

    # Find commits by message
    find = log --oneline --all --grep

    # Interactive rebase
    ri = rebase -i

    # Pull with rebase
    pr = pull --rebase

    # Push force (with lease - safer)
    pf = push --force-with-lease

    # Show contributors
    contributors = shortlog -sn

    # Clean merged branches
    cleanup = "!git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"

# ═══════════════════════════════════════════════════════════════════════════
# BASH/ZSH ALIASES
# ═══════════════════════════════════════════════════════════════════════════

# Add to ~/.bashrc or ~/.zshrc

alias g='git'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gpl='git pull'
alias gco='git checkout'
alias gb='git branch'
alias gd='git diff'
alias gl='git log --oneline --graph'
alias gst='git stash'
alias gstp='git stash pop'
```

---

# APPENDIX: QUICK REFERENCE CARDS

---

## Card A: Daily Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DAILY GIT WORKFLOW                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  START OF DAY:                                                              │
│  git checkout main && git pull                                              │
│                                                                             │
│  START FEATURE:                                                             │
│  git checkout -b feature/description                                        │
│                                                                             │
│  DURING WORK:                                                               │
│  git add -p                    # Stage chunks                               │
│  git commit -m "type: subject" # Commit often                               │
│                                                                             │
│  END OF DAY:                                                                │
│  git push -u origin feature/description                                     │
│                                                                             │
│  CREATE PR:                                                                 │
│  gh pr create --title "type: description"                                   │
│                                                                             │
│  AFTER MERGE:                                                               │
│  git checkout main && git pull                                              │
│  git branch -d feature/description                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Card B: Commit Message Format

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONVENTIONAL COMMIT FORMAT                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  type(scope): subject                                                       │
│                                                                             │
│  body (optional)                                                            │
│                                                                             │
│  footer (optional)                                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  TYPES:                                                                     │
│  feat     → New feature                                                     │
│  fix      → Bug fix                                                         │
│  docs     → Documentation                                                   │
│  style    → Formatting                                                      │
│  refactor → Restructuring                                                   │
│  perf     → Performance                                                     │
│  test     → Testing                                                         │
│  build    → Build system                                                    │
│  ci       → CI/CD                                                           │
│  chore    → Maintenance                                                     │
│                                                                             │
│  EXAMPLES:                                                                  │
│  feat(auth): add Google OAuth login                                         │
│  fix(checkout): resolve payment timeout                                     │
│  docs: update API documentation                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Card C: Emergency Recovery

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMERGENCY RECOVERY                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UNDO LAST COMMIT (keep changes):                                           │
│  git reset --soft HEAD~1                                                    │
│                                                                             │
│  UNDO LAST COMMIT (discard changes):                                        │
│  git reset --hard HEAD~1                                                    │
│                                                                             │
│  RECOVER DELETED BRANCH:                                                    │
│  git reflog                                                                 │
│  git branch <name> <sha>                                                    │
│                                                                             │
│  UNDO ACCIDENTAL RESET:                                                     │
│  git reflog                                                                 │
│  git reset --hard HEAD@{n}                                                  │
│                                                                             │
│  ABORT MERGE:                                                               │
│  git merge --abort                                                          │
│                                                                             │
│  ABORT REBASE:                                                              │
│  git rebase --abort                                                         │
│                                                                             │
│  DISCARD ALL LOCAL CHANGES:                                                 │
│  git checkout -- .                                                          │
│  git clean -fd                                                              │
│                                                                             │
│  REVERT A PUSHED COMMIT:                                                    │
│  git revert <sha>                                                           │
│  git push                                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT COMPLETION

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  SECTION 13: VERSION CONTROL SYSTEM - 50X EDITION                            ║
║                                                                              ║
║  STATUS: COMPLETE                                                            ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BASELINE COMPARISON:                                                        ║
║  ────────────────────                                                        ║
║  Original Section: 48 lines                                                  ║
║  50X Version: 4000+ lines                                                    ║
║  Enhancement Factor: 83X                                                     ║
║                                                                              ║
║  COVERAGE:                                                                   ║
║  ─────────                                                                   ║
║  ✓ Git Philosophy and Fundamentals                                           ║
║  ✓ Git Internals (Objects, Trees, Refs)                                      ║
║  ✓ All Major Branching Strategies                                            ║
║  ✓ Conventional Commits                                                      ║
║  ✓ Pull Request Excellence                                                   ║
║  ✓ Code Review Best Practices                                                ║
║  ✓ CI/CD Integration                                                         ║
║  ✓ Monorepo Management                                                       ║
║  ✓ Git Hooks & Automation                                                    ║
║  ✓ Security & Compliance                                                     ║
║  ✓ Release Management                                                        ║
║  ✓ Recovery & Disaster Management                                            ║
║  ✓ Performance Optimization                                                  ║
║  ✓ AI-Assisted Version Control                                               ║
║  ✓ Team Collaboration Patterns                                               ║
║  ✓ Platform Integrations                                                     ║
║  ✓ Complete Command Reference                                                ║
║                                                                              ║
║  QUALITY STANDARDS:                                                          ║
║  ──────────────────                                                          ║
║  ✓ 50X More Detail                                                           ║
║  ✓ 50X More Complete                                                         ║
║  ✓ Practical Code Examples                                                   ║
║  ✓ Production-Ready Configurations                                           ║
║  ✓ Industry Best Practices                                                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**Document:** SECTION_13_VERSION_CONTROL_50X.md
**Version:** 1.0
**Created:** January 2025
**Author:** Claude (Master Guide)
**Owner:** Ayoub Agrebi
**Status:** COMPLETE - Ready for Review
