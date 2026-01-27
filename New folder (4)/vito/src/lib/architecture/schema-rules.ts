/**
 * OLYMPUS 2.1 - ARCHITECTURE BLUEPRINT
 * Schema Rules - DATUM Agent Constraints
 * 
 * All Prisma schemas MUST follow these rules.
 * DATUM agent outputs are validated against these constraints.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// NAMING CONVENTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const SCHEMA_NAMING = {
  // Table/Model names: PascalCase
  tables: {
    case: 'PascalCase',
    examples: ['User', 'Order', 'OrderItem', 'ProductCategory'],
    forbidden: ['user', 'users', 'order_item', 'USERS'],
  },

  // Column names: camelCase
  columns: {
    case: 'camelCase',
    examples: ['createdAt', 'userId', 'isActive', 'totalAmount'],
    forbidden: ['created_at', 'user_id', 'CreatedAt', 'CREATED_AT'],
  },

  // Junction tables: EntityAEntityB (alphabetical order)
  junctions: {
    pattern: '{EntityA}{EntityB}',
    examples: ['ProductCategory', 'RoleUser', 'OrderProduct'],
    forbidden: ['product_category', 'UserRole', 'Products_Categories'],
  },

  // Enum names: PascalCase
  enums: {
    case: 'PascalCase',
    examples: ['OrderStatus', 'UserRole', 'PaymentMethod'],
  },

  // Enum values: SCREAMING_SNAKE_CASE
  enumValues: {
    case: 'SCREAMING_SNAKE_CASE',
    examples: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_FAILED'],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIRED FIELDS (Every table MUST have these)
// ═══════════════════════════════════════════════════════════════════════════════

export const REQUIRED_FIELDS = {
  // Primary key
  id: {
    type: 'String',
    attributes: '@id @default(cuid())',
    required: true,
    reason: 'CUID is URL-safe, sortable, and collision-resistant',
  },

  // Timestamps
  createdAt: {
    type: 'DateTime',
    attributes: '@default(now())',
    required: true,
    reason: 'Audit trail, sorting, analytics',
  },

  updatedAt: {
    type: 'DateTime',
    attributes: '@updatedAt',
    required: true,
    reason: 'Change tracking, cache invalidation',
  },

  // Soft delete (optional but recommended)
  deletedAt: {
    type: 'DateTime?',
    attributes: '',
    required: false,
    reason: 'Soft delete preserves data for recovery/audit',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-TENANCY RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const MULTI_TENANCY = {
  strategy: 'Row-Level Security (RLS)',
  provider: 'Supabase',

  // Tables that MUST have tenant isolation
  userFacingTables: [
    'Project',
    'Build',
    'Document',
    'Upload',
    'Setting',
    'Team',
    'Invoice',
    // Any table containing user data
  ],

  // Required field for tenant isolation
  tenantField: {
    name: 'tenantId',
    type: 'String',
    required: true,
    index: true,
  },

  // RLS policy template
  rlsPolicyTemplate: `
    CREATE POLICY "tenant_isolation" ON {table_name}
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_members
          WHERE user_id = auth.uid()
        )
      );
  `,

  // Tables that DON'T need tenant isolation
  globalTables: [
    'User', // Users can belong to multiple tenants
    'Plan', // Subscription plans are global
    'Feature', // Feature flags are global
    'AuditLog', // System-wide audit
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const RELATIONSHIP_PATTERNS = {
  // One-to-Many (most common)
  oneToMany: {
    pattern: `
      model User {
        id     String  @id @default(cuid())
        posts  Post[]  // One user has many posts
      }

      model Post {
        id       String @id @default(cuid())
        userId   String
        user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
        @@index([userId])
      }
    `,
    rules: [
      'Foreign key field MUST be named {relation}Id (e.g., userId)',
      'MUST have explicit @relation with fields and references',
      'MUST have @@index on foreign key field',
      'MUST specify onDelete behavior',
    ],
  },

  // Many-to-Many (via junction table)
  manyToMany: {
    pattern: `
      model Product {
        id         String            @id @default(cuid())
        categories ProductCategory[]
      }

      model Category {
        id       String            @id @default(cuid())
        products ProductCategory[]
      }

      model ProductCategory {
        productId  String
        categoryId String
        product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
        category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
        assignedAt DateTime @default(now())
        
        @@id([productId, categoryId])
        @@index([categoryId])
      }
    `,
    rules: [
      'Junction table named {EntityA}{EntityB} (alphabetical)',
      'Composite primary key: @@id([entityAId, entityBId])',
      'Index on second foreign key (first is part of PK)',
      'Optional: include metadata (assignedAt, assignedBy)',
    ],
  },

  // Self-referential (trees, hierarchies)
  selfReferential: {
    pattern: `
      model Category {
        id        String     @id @default(cuid())
        name      String
        parentId  String?
        parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
        children  Category[] @relation("CategoryTree")
        
        @@index([parentId])
      }
    `,
    rules: [
      'Use named relation to avoid ambiguity',
      'Parent reference is optional (nullable) for root nodes',
      'Index on parentId for tree traversal performance',
    ],
  },

  // Cascade delete rules
  cascadeRules: {
    'Cascade': 'Owned entities (User → Posts, Order → OrderItems)',
    'SetNull': 'Optional references (Post → Category nullable)',
    'Restrict': 'Critical references (Order → User - preserve history)',
    'NoAction': 'Let database decide (rarely used)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const INDEX_RULES = {
  // Auto-index these fields
  autoIndex: [
    'All foreign key fields (userId, tenantId, etc.)',
    'All fields used in WHERE clauses frequently',
    'All fields used in ORDER BY',
    'All enum/status fields',
    'Email and other unique lookup fields',
  ],

  // Common index patterns
  patterns: {
    foreignKey: '@@index([userId])',
    timestamp: '@@index([createdAt])',
    status: '@@index([status])',
    compound: '@@index([tenantId, status])',
    compoundSort: '@@index([userId, createdAt])',
    unique: '@unique',
    uniqueCompound: '@@unique([tenantId, email])',
  },

  // Index naming (for raw SQL migrations)
  naming: {
    pattern: 'idx_{table}_{columns}',
    examples: [
      'idx_post_userId',
      'idx_order_tenantId_status',
      'idx_user_email',
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const DATA_TYPES = {
  // Preferred types
  preferred: {
    id: 'String @id @default(cuid())',
    foreignKey: 'String',
    email: 'String @unique',
    url: 'String',
    text: 'String',
    longText: 'String @db.Text',
    boolean: 'Boolean @default(false)',
    integer: 'Int',
    decimal: 'Decimal @db.Decimal(10, 2)',
    money: 'Int', // Store in cents
    datetime: 'DateTime',
    json: 'Json',
    enum: 'EnumName',
  },

  // Avoid these
  avoid: {
    'Float': 'Use Decimal for precision',
    'BigInt': 'Use String for very large numbers',
    'Bytes': 'Store files in Supabase Storage, not DB',
  },

  // Money handling
  money: {
    storage: 'Int (cents)',
    reason: 'Avoid floating point precision issues',
    example: '$19.99 → 1999',
    display: 'amount / 100',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const COMMON_SCHEMAS = {
  // User (always needed)
  User: `
    model User {
      id        String   @id @default(cuid())
      email     String   @unique
      name      String?
      avatarUrl String?
      role      UserRole @default(USER)
      
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
      deletedAt DateTime?
      
      // Relations
      tenants   TenantMember[]
      
      @@index([email])
    }
    
    enum UserRole {
      USER
      ADMIN
      SUPER_ADMIN
    }
  `,

  // Tenant (for multi-tenancy)
  Tenant: `
    model Tenant {
      id        String   @id @default(cuid())
      name      String
      slug      String   @unique
      plan      Plan     @default(STARTER)
      
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
      
      // Relations
      members   TenantMember[]
      
      @@index([slug])
    }
    
    enum Plan {
      STARTER
      PRO
      ENTERPRISE
    }
  `,

  // TenantMember (junction)
  TenantMember: `
    model TenantMember {
      userId    String
      tenantId  String
      role      MemberRole @default(MEMBER)
      
      user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
      tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
      
      joinedAt  DateTime @default(now())
      
      @@id([userId, tenantId])
      @@index([tenantId])
    }
    
    enum MemberRole {
      OWNER
      ADMIN
      MEMBER
      VIEWER
    }
  `,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES (for Schema Gate)
// ═══════════════════════════════════════════════════════════════════════════════

export const SCHEMA_VALIDATION_RULES = [
  {
    id: 'table-naming',
    description: 'Table names must be PascalCase',
    severity: 'error',
    check: (tableName: string) => /^[A-Z][a-zA-Z0-9]*$/.test(tableName),
  },
  {
    id: 'column-naming',
    description: 'Column names must be camelCase',
    severity: 'error',
    check: (columnName: string) => /^[a-z][a-zA-Z0-9]*$/.test(columnName),
  },
  {
    id: 'required-id',
    description: 'Every table must have id field with @id @default(cuid())',
    severity: 'error',
  },
  {
    id: 'required-timestamps',
    description: 'Every table must have createdAt and updatedAt',
    severity: 'error',
  },
  {
    id: 'foreign-key-index',
    description: 'Every foreign key must have an index',
    severity: 'error',
  },
  {
    id: 'tenant-isolation',
    description: 'User-facing tables must have tenantId with RLS',
    severity: 'warning',
  },
  {
    id: 'relation-explicit',
    description: 'Relations must have explicit @relation with fields/references',
    severity: 'error',
  },
  {
    id: 'cascade-defined',
    description: 'Relations must specify onDelete behavior',
    severity: 'warning',
  },
  {
    id: 'no-float-money',
    description: 'Money fields must use Int (cents) not Float/Decimal',
    severity: 'warning',
  },
  {
    id: 'enum-uppercase',
    description: 'Enum values must be SCREAMING_SNAKE_CASE',
    severity: 'error',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DATUM OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface DatumOutput {
  tables: {
    name: string;
    fields: {
      name: string;
      type: string;
      attributes: string[];
      required: boolean;
    }[];
    indexes: string[];
    relations: {
      field: string;
      target: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-many';
      onDelete: 'Cascade' | 'SetNull' | 'Restrict';
    }[];
  }[];
  enums: {
    name: string;
    values: string[];
  }[];
  prismaSchema: string; // The actual schema.prisma content
  mockData: Record<string, any[]>; // Sample data for each table
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const SCHEMA_RULES = {
  naming: SCHEMA_NAMING,
  required: REQUIRED_FIELDS,
  multiTenancy: MULTI_TENANCY,
  relationships: RELATIONSHIP_PATTERNS,
  indexes: INDEX_RULES,
  dataTypes: DATA_TYPES,
  common: COMMON_SCHEMAS,
  validation: SCHEMA_VALIDATION_RULES,
};
