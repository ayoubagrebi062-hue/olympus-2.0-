-- ═══════════════════════════════════════════════════════════════════════════════
-- OLYMPUS 2.0 - DATABASE SCHEMA
-- File: 00_extensions.sql
-- Purpose: PostgreSQL extensions required for the platform
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- EXECUTION ORDER: Run this FIRST before any other schema files
-- ENVIRONMENT: Supabase PostgreSQL 15+
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- EXTENSION: uuid-ossp
-- Purpose: UUID generation functions
-- Used by: All tables with UUID primary keys
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: pgcrypto
-- Purpose: Cryptographic functions (encryption, hashing)
-- Used by: Password hashing, token generation, encrypted fields
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: pg_trgm
-- Purpose: Trigram matching for fuzzy text search
-- Used by: Project search, user search, full-text queries
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: btree_gin
-- Purpose: GIN indexes on scalar types
-- Used by: Composite indexes combining JSONB with other columns
-- ============================================
CREATE EXTENSION IF NOT EXISTS "btree_gin" WITH SCHEMA extensions;

-- ============================================
-- EXTENSION: citext
-- Purpose: Case-insensitive text type
-- Used by: Email fields, slugs, domain names
-- ============================================
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHUNK 2.1 COMPLETION: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
-- [x] uuid-ossp for UUID generation
-- [x] pgcrypto for encryption
-- [x] pg_trgm for text search
-- [x] btree_gin for composite indexes
-- [x] citext for case-insensitive text
-- ═══════════════════════════════════════════════════════════════════════════════
