/**
 * OLYMPUS 2.0 - Permission Middleware
 *
 * Supports both P7 (ctx with params) and P8 native patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthorizationError } from '../errors';
import type { TenantRole, Permission, RouteParams } from '../types';
import type { P7TenantContext } from './tenant';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyParams = RouteParams | any;

type P7PermissionHandler = (req: NextRequest, ctx: P7TenantContext, params?: AnyParams) => Promise<NextResponse>;

/**
 * Role-based permission matrix.
 */
const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  owner: [
    'read:tenant', 'write:tenant', 'delete:tenant',
    'manage:members', 'manage:billing',
    'read:project', 'write:project', 'delete:project',
    'create:build', 'cancel:build',
    'create:deploy', 'manage:domains',
    'read:analytics', 'manage:settings',
    'admin:api_keys',
  ],
  admin: [
    'read:tenant', 'write:tenant',
    'manage:members',
    'read:project', 'write:project', 'delete:project',
    'create:build', 'cancel:build',
    'create:deploy', 'manage:domains',
    'read:analytics', 'manage:settings',
    'admin:api_keys',
  ],
  member: [
    'read:tenant',
    'read:project', 'write:project',
    'create:build', 'cancel:build',
    'create:deploy',
    'read:analytics',
  ],
  viewer: [
    'read:tenant',
    'read:project',
    'read:analytics',
  ],
};

/**
 * Check if role has permission.
 */
export function hasPermission(role: TenantRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Permission middleware supporting both curried and direct usage:
 * - withPermission('read:project', handler)
 * - withPermission('read:project')(handler)
 */
export function withPermission(permission: Permission, handler?: P7PermissionHandler): any {
  const middleware = (h: P7PermissionHandler): P7PermissionHandler => {
    return async (request: NextRequest, ctx: P7TenantContext, params?: AnyParams) => {
      if (!hasPermission(ctx.tenantRole, permission)) {
        throw new AuthorizationError('AUTHZ_003', {
          message: `Permission denied: ${permission}`,
          details: { required: permission, role: ctx.tenantRole },
        });
      }
      return h(request, ctx, params);
    };
  };

  // If handler provided, apply directly. Otherwise return curried function.
  return handler ? middleware(handler) : middleware;
}

/**
 * Middleware that requires any of the specified permissions.
 */
export function withAnyPermission(permissions: Permission[], handler: P7PermissionHandler): P7PermissionHandler {
  return async (request: NextRequest, ctx: P7TenantContext, params?: AnyParams) => {
    const hasAny = permissions.some((p) => hasPermission(ctx.tenantRole, p));
    if (!hasAny) {
      throw new AuthorizationError('AUTHZ_003', {
        message: 'Permission denied',
        details: { required: permissions, role: ctx.tenantRole },
      });
    }
    return handler(request, ctx, params);
  };
}

/**
 * Middleware that requires all specified permissions.
 */
export function withAllPermissions(permissions: Permission[], handler: P7PermissionHandler): P7PermissionHandler {
  return async (request: NextRequest, ctx: P7TenantContext, params?: AnyParams) => {
    const missing = permissions.filter((p) => !hasPermission(ctx.tenantRole, p));
    if (missing.length > 0) {
      throw new AuthorizationError('AUTHZ_003', {
        message: 'Permission denied',
        details: { missing, role: ctx.tenantRole },
      });
    }
    return handler(request, ctx, params);
  };
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: TenantRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can perform action on resource.
 */
export function canPerform(ctx: P7TenantContext, permission: Permission): boolean {
  return hasPermission(ctx.tenantRole, permission);
}
