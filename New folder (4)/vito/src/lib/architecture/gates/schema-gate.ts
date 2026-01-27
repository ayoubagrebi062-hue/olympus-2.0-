/**
 * OLYMPUS 2.1 - Schema Validation Gate
 * Validates Prisma schemas against DATUM constraints.
 */

interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
}

interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats: {
    tablesChecked: number;
    hasRequiredFields: boolean;
    hasForeignKeyIndexes: boolean;
  };
}

export const schemaValidationGate = {
  name: 'Schema Gate',
  description: 'Validates Prisma schemas against DATUM constraints',
  type: 'schema',
};

function parseModels(schema: string): { name: string; content: string; line: number }[] {
  const models: { name: string; content: string; line: number }[] = [];
  const lines = schema.split('\n');
  let currentModel: { name: string; content: string; line: number } | null = null;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Allow leading whitespace before 'model' keyword
    const modelMatch = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = { name: modelMatch[1], content: line + '\n', line: i + 1 };
      braceCount = 1;
      continue;
    }
    if (currentModel) {
      currentModel.content += line + '\n';
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      if (braceCount === 0) {
        models.push(currentModel);
        currentModel = null;
      }
    }
  }
  return models;
}

function checkTableNaming(modelName: string): GateIssue | null {
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(modelName)) {
    return {
      rule: 'table-naming',
      message: `Table name "${modelName}" must be PascalCase`,
      severity: 'error',
      found: modelName,
      expected: 'PascalCase (e.g., User, OrderItem)',
      autoFixable: false,
    };
  }
  return null;
}

function checkRequiredFields(modelName: string, content: string): GateIssue[] {
  const issues: GateIssue[] = [];

  if (!content.includes('@id')) {
    issues.push({
      rule: 'required-id',
      message: `Table "${modelName}" missing id field with @id`,
      severity: 'error',
      expected: 'id String @id @default(cuid())',
      autoFixable: true,
    });
  } else if (!content.includes('cuid()') && !content.includes('uuid()')) {
    issues.push({
      rule: 'required-id',
      message: `Table "${modelName}" should use cuid() for id`,
      severity: 'warning',
      expected: '@default(cuid())',
      autoFixable: true,
    });
  }

  if (!content.includes('createdAt')) {
    issues.push({
      rule: 'required-timestamps',
      message: `Table "${modelName}" missing createdAt field`,
      severity: 'error',
      expected: 'createdAt DateTime @default(now())',
      autoFixable: true,
    });
  }

  if (!content.includes('updatedAt')) {
    issues.push({
      rule: 'required-timestamps',
      message: `Table "${modelName}" missing updatedAt field`,
      severity: 'error',
      expected: 'updatedAt DateTime @updatedAt',
      autoFixable: true,
    });
  }

  return issues;
}

function checkForeignKeyIndexes(modelName: string, content: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const fkPattern = /(\w+Id)\s+String/g;
  let match;

  while ((match = fkPattern.exec(content)) !== null) {
    const fkField = match[1];
    const indexPattern = new RegExp(`@@index\\(\\[${fkField}`, 'g');
    if (!indexPattern.test(content)) {
      issues.push({
        rule: 'foreign-key-index',
        message: `Table "${modelName}" missing index on foreign key "${fkField}"`,
        severity: 'error',
        expected: `@@index([${fkField}])`,
        autoFixable: true,
      });
    }
  }
  return issues;
}

function checkEnumValues(schema: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const enumPattern = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = enumPattern.exec(schema)) !== null) {
    const enumName = match[1];
    const values = match[2].trim().split(/\s+/);
    for (const value of values) {
      if (value && !/^[A-Z][A-Z0-9_]*$/.test(value)) {
        issues.push({
          rule: 'enum-uppercase',
          message: `Enum "${enumName}" value "${value}" must be SCREAMING_SNAKE_CASE`,
          severity: 'error',
          found: value,
          expected: value.toUpperCase().replace(/-/g, '_'),
          autoFixable: true,
        });
      }
    }
  }
  return issues;
}

export async function schemaGate(prismaSchema: string): Promise<GateResult> {
  const issues: GateIssue[] = [];
  const models = parseModels(prismaSchema);
  let hasAllRequiredFields = true;
  let hasAllForeignKeyIndexes = true;

  for (const model of models) {
    const namingIssue = checkTableNaming(model.name);
    if (namingIssue) {
      namingIssue.line = model.line;
      issues.push(namingIssue);
    }

    const fieldIssues = checkRequiredFields(model.name, model.content);
    if (fieldIssues.length > 0) {
      hasAllRequiredFields = false;
      for (const issue of fieldIssues) {
        issue.line = model.line;
        issues.push(issue);
      }
    }

    const fkIssues = checkForeignKeyIndexes(model.name, model.content);
    if (fkIssues.length > 0) {
      hasAllForeignKeyIndexes = false;
      for (const issue of fkIssues) {
        issue.line = model.line;
        issues.push(issue);
      }
    }
  }

  const enumIssues = checkEnumValues(prismaSchema);
  issues.push(...enumIssues);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 2));

  return {
    passed: errorCount === 0,
    score,
    issues,
    stats: {
      tablesChecked: models.length,
      hasRequiredFields: hasAllRequiredFields,
      hasForeignKeyIndexes: hasAllForeignKeyIndexes,
    },
  };
}

export default schemaGate;
