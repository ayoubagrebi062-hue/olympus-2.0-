/**
 * OLYMPUS 2.0 - Permission Definitions
 *
 * Role-Based Access Control (RBAC) system with:
 * - Role hierarchy (owner > admin > developer > viewer)
 * - Permission matrix
 * - Helper functions for permission checks
 */

import type { Permission, TenantRole, ProjectRole, RoleDefinition, PlanTier } from './types';

// ============================================
// ROLE DEFINITIONS
// ============================================

/**
 * Role hierarchy levels (higher = more permissions)
 */
export const ROLE_HIERARCHY: Record<TenantRole, number> = {
  owner: 100,
  admin: 75,
  developer: 50,
  viewer: 25,
} as const;

/**
 * Complete role definitions with permissions
 */
export const ROLE_DEFINITIONS: Record<TenantRole, RoleDefinition> = {
  owner: {
    name: 'owner',
    displayName: 'Owner',
    description: 'Full control over the organization including billing and deletion',
    hierarchyLevel: 100,
    permissions: ['*'],
  },

  admin: {
    name: 'admin',
    displayName: 'Admin',
    description: 'Manage team members, settings, and all projects',
    hierarchyLevel: 75,
    permissions: [
      'tenant:read',
      'tenant:update',
      'tenant:manage_members',
      'tenant:manage_settings',
      'tenant:view_audit_logs',
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:manage_collaborators',
      'project:manage_env_vars',
      'project:export',
      'build:create',
      'build:read',
      'build:cancel',
      'build:view_logs',
      'build:view_costs',
      'deployment:create',
      'deployment:read',
      'deployment:rollback',
      'deployment:manage_domains',
      'file:upload',
      'file:read',
      'file:delete',
      'analytics:read',
      'analytics:export',
      'api:read_keys',
      'api:create_keys',
      'api:delete_keys',
    ],
  },

  developer: {
    name: 'developer',
    displayName: 'Developer',
    description: 'Create and manage projects, builds, and deployments',
    hierarchyLevel: 50,
    isDefault: true,
    permissions: [
      'tenant:read',
      'project:create',
      'project:read',
      'project:update',
      'project:manage_env_vars',
      'project:export',
      'build:create',
      'build:read',
      'build:cancel',
      'build:view_logs',
      'deployment:create',
      'deployment:read',
      'deployment:rollback',
      'file:upload',
      'file:read',
      'analytics:read',
      'api:read_keys',
    ],
  },

  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to projects and builds',
    hierarchyLevel: 25,
    permissions: [
      'tenant:read',
      'project:read',
      'build:read',
      'build:view_logs',
      'deployment:read',
      'file:read',
      'analytics:read',
    ],
  },
};

/**
 * Project-level role permissions
 */
export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  admin: [
    'project:read',
    'project:update',
    'project:delete',
    'project:manage_collaborators',
    'project:manage_env_vars',
    'project:export',
    'build:create',
    'build:read',
    'build:cancel',
    'build:view_logs',
    'deployment:create',
    'deployment:read',
    'deployment:rollback',
    'file:upload',
    'file:read',
    'file:delete',
  ],
  editor: [
    'project:read',
    'project:update',
    'project:manage_env_vars',
    'project:export',
    'build:create',
    'build:read',
    'build:cancel',
    'build:view_logs',
    'deployment:create',
    'deployment:read',
    'file:upload',
    'file:read',
  ],
  viewer: ['project:read', 'build:read', 'build:view_logs', 'deployment:read', 'file:read'],
};

// ============================================
// PLAN-BASED PERMISSIONS
// ============================================

/**
 * Permissions restricted by plan tier
 */
export const PLAN_RESTRICTED_PERMISSIONS: Record<Permission, PlanTier[]> = {
  'tenant:view_audit_logs': ['business', 'enterprise'],
  'analytics:export': ['pro', 'business', 'enterprise'],
  'api:create_keys': ['starter', 'pro', 'business', 'enterprise'],
  'api:delete_keys': ['starter', 'pro', 'business', 'enterprise'],
  'deployment:manage_domains': ['starter', 'pro', 'business', 'enterprise'],
  'tenant:read': [],
  'tenant:update': [],
  'tenant:delete': [],
  'tenant:manage_billing': [],
  'tenant:manage_members': [],
  'tenant:manage_settings': [],
  'project:create': [],
  'project:read': [],
  'project:update': [],
  'project:delete': [],
  'project:manage_collaborators': [],
  'project:manage_env_vars': [],
  'project:export': [],
  'build:create': [],
  'build:read': [],
  'build:cancel': [],
  'build:view_logs': [],
  'build:view_costs': [],
  'deployment:create': [],
  'deployment:read': [],
  'deployment:rollback': [],
  'file:upload': [],
  'file:read': [],
  'file:delete': [],
  'analytics:read': [],
  'api:read_keys': [],
  '*': [],
};

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: TenantRole, permission: Permission): boolean {
  const roleDefinition = ROLE_DEFINITIONS[role];

  if (!roleDefinition) {
    return false;
  }

  if (roleDefinition.permissions.includes('*')) {
    return true;
  }

  return roleDefinition.permissions.includes(permission);
}

/**
 * Check if a role meets the minimum role requirement
 */
export function hasMinimumRole(role: TenantRole, minRole: TenantRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: TenantRole): Permission[] {
  const roleDefinition = ROLE_DEFINITIONS[role];

  if (!roleDefinition) {
    return [];
  }

  if (roleDefinition.permissions.includes('*')) {
    return getAllPermissions();
  }

  return [...roleDefinition.permissions];
}

/**
 * Get all possible permissions
 */
export function getAllPermissions(): Permission[] {
  return [
    'tenant:read',
    'tenant:update',
    'tenant:delete',
    'tenant:manage_billing',
    'tenant:manage_members',
    'tenant:manage_settings',
    'tenant:view_audit_logs',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'project:manage_collaborators',
    'project:manage_env_vars',
    'project:export',
    'build:create',
    'build:read',
    'build:cancel',
    'build:view_logs',
    'build:view_costs',
    'deployment:create',
    'deployment:read',
    'deployment:rollback',
    'deployment:manage_domains',
    'file:upload',
    'file:read',
    'file:delete',
    'analytics:read',
    'analytics:export',
    'api:read_keys',
    'api:create_keys',
    'api:delete_keys',
  ];
}

/**
 * Check if permission is allowed for a plan tier
 */
export function isPlanAllowed(permission: Permission, planTier: PlanTier): boolean {
  const allowedPlans = PLAN_RESTRICTED_PERMISSIONS[permission];

  if (!allowedPlans || allowedPlans.length === 0) {
    return true;
  }

  return allowedPlans.includes(planTier);
}

/**
 * Get effective permissions considering role and plan
 */
export function getEffectivePermissions(
  role: TenantRole,
  planTier: PlanTier,
  customPermissions?: Permission[]
): Permission[] {
  const rolePermissions = getRolePermissions(role);

  const planFilteredPermissions = rolePermissions.filter(permission =>
    isPlanAllowed(permission, planTier)
  );

  if (customPermissions) {
    const validCustomPermissions = customPermissions.filter(permission =>
      isPlanAllowed(permission, planTier)
    );

    return Array.from(new Set([...planFilteredPermissions, ...validCustomPermissions]));
  }

  return planFilteredPermissions;
}

/**
 * Check if user can perform action considering role, plan, and custom permissions
 */
export function canPerformAction(
  permission: Permission,
  role: TenantRole,
  planTier: PlanTier,
  customPermissions?: Permission[]
): boolean {
  if (!isPlanAllowed(permission, planTier)) {
    return false;
  }

  if (roleHasPermission(role, permission)) {
    return true;
  }

  if (customPermissions?.includes(permission)) {
    return true;
  }

  return false;
}

/**
 * Get roles that can be assigned by a given role
 */
export function getAssignableRoles(role: TenantRole): TenantRole[] {
  const roleLevel = ROLE_HIERARCHY[role];

  return (Object.keys(ROLE_HIERARCHY) as TenantRole[]).filter(r => ROLE_HIERARCHY[r] < roleLevel);
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: TenantRole, targetRole: TenantRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get display-friendly role information
 */
export function getRoleInfo(role: TenantRole): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

/**
 * Get all roles sorted by hierarchy (highest first)
 */
export function getRolesSortedByHierarchy(): TenantRole[] {
  return (Object.keys(ROLE_HIERARCHY) as TenantRole[]).sort(
    (a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]
  );
}

// ============================================
// PERMISSION GROUPS (for UI display)
// ============================================

export const PERMISSION_GROUPS = {
  tenant: {
    label: 'Organization',
    permissions: [
      {
        permission: 'tenant:read',
        label: 'View organization',
        description: 'View organization details',
      },
      {
        permission: 'tenant:update',
        label: 'Update organization',
        description: 'Edit organization settings',
      },
      {
        permission: 'tenant:delete',
        label: 'Delete organization',
        description: 'Permanently delete the organization',
      },
      {
        permission: 'tenant:manage_billing',
        label: 'Manage billing',
        description: 'Update payment methods and subscription',
      },
      {
        permission: 'tenant:manage_members',
        label: 'Manage members',
        description: 'Invite, remove, and change member roles',
      },
      {
        permission: 'tenant:manage_settings',
        label: 'Manage settings',
        description: 'Configure organization settings',
      },
      {
        permission: 'tenant:view_audit_logs',
        label: 'View audit logs',
        description: 'Access security and activity logs',
      },
    ],
  },
  project: {
    label: 'Projects',
    permissions: [
      {
        permission: 'project:create',
        label: 'Create projects',
        description: 'Create new projects',
      },
      { permission: 'project:read', label: 'View projects', description: 'View project details' },
      {
        permission: 'project:update',
        label: 'Edit projects',
        description: 'Modify project settings and code',
      },
      {
        permission: 'project:delete',
        label: 'Delete projects',
        description: 'Permanently delete projects',
      },
      {
        permission: 'project:manage_collaborators',
        label: 'Manage collaborators',
        description: 'Add or remove project collaborators',
      },
      {
        permission: 'project:manage_env_vars',
        label: 'Manage environment',
        description: 'Configure environment variables',
      },
      {
        permission: 'project:export',
        label: 'Export projects',
        description: 'Download project source code',
      },
    ],
  },
  build: {
    label: 'Builds',
    permissions: [
      { permission: 'build:create', label: 'Start builds', description: 'Initiate new builds' },
      {
        permission: 'build:read',
        label: 'View builds',
        description: 'View build status and details',
      },
      { permission: 'build:cancel', label: 'Cancel builds', description: 'Stop running builds' },
      { permission: 'build:view_logs', label: 'View logs', description: 'Access build logs' },
      {
        permission: 'build:view_costs',
        label: 'View costs',
        description: 'See build cost information',
      },
    ],
  },
  deployment: {
    label: 'Deployments',
    permissions: [
      {
        permission: 'deployment:create',
        label: 'Deploy',
        description: 'Deploy projects to production',
      },
      {
        permission: 'deployment:read',
        label: 'View deployments',
        description: 'View deployment status',
      },
      {
        permission: 'deployment:rollback',
        label: 'Rollback',
        description: 'Revert to previous deployments',
      },
      {
        permission: 'deployment:manage_domains',
        label: 'Manage domains',
        description: 'Configure custom domains',
      },
    ],
  },
  file: {
    label: 'Files',
    permissions: [
      { permission: 'file:upload', label: 'Upload files', description: 'Upload assets and files' },
      { permission: 'file:read', label: 'View files', description: 'Access uploaded files' },
      { permission: 'file:delete', label: 'Delete files', description: 'Remove uploaded files' },
    ],
  },
  analytics: {
    label: 'Analytics',
    permissions: [
      {
        permission: 'analytics:read',
        label: 'View analytics',
        description: 'Access usage analytics',
      },
      {
        permission: 'analytics:export',
        label: 'Export analytics',
        description: 'Download analytics reports',
      },
    ],
  },
  api: {
    label: 'API Access',
    permissions: [
      {
        permission: 'api:read_keys',
        label: 'View API keys',
        description: 'View API key information',
      },
      {
        permission: 'api:create_keys',
        label: 'Create API keys',
        description: 'Generate new API keys',
      },
      { permission: 'api:delete_keys', label: 'Delete API keys', description: 'Revoke API keys' },
    ],
  },
} as const;

/**
 * Get permission description
 */
export function getPermissionDescription(permission: Permission): string {
  for (const group of Object.values(PERMISSION_GROUPS)) {
    const found = group.permissions.find(p => p.permission === permission);
    if (found) {
      return found.description;
    }
  }
  return permission;
}

/**
 * Get permission label
 */
export function getPermissionLabel(permission: Permission): string {
  for (const group of Object.values(PERMISSION_GROUPS)) {
    const found = group.permissions.find(p => p.permission === permission);
    if (found) {
      return found.label;
    }
  }
  return permission;
}
