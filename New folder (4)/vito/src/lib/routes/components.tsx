/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    OLYMPUS ROUTE COMPONENTS                               ║
 * ║                                                                           ║
 * ║  World-Class Developer Experience                                         ║
 * ║                                                                           ║
 * ║  • AppLink: Type-safe navigation with autocomplete                        ║
 * ║  • useRoute: Reactive current route info                                  ║
 * ║  • useBreadcrumbs: Auto-generated breadcrumb trail                        ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, {
  forwardRef,
  useMemo,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ROUTE_TREE,
  route,
  routes,
  matchRoute,
  getBreadcrumbs,
  type RouteKey,
  type RouteMatch,
  type Breadcrumb,
} from './index';

// =============================================================================
// TYPE EXTRACTION - The Magic That Powers Autocomplete
// =============================================================================

/**
 * Extract param names from a route path.
 * '/projects/:projectId/files/:fileId' → 'projectId' | 'fileId'
 */
type ExtractParamNames<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParamNames<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Get the path type for a route key.
 */
type RoutePath<K extends RouteKey> = typeof ROUTE_TREE[K]['path'];

/**
 * Get required params for a route.
 */
type RouteParams<K extends RouteKey> =
  ExtractParamNames<RoutePath<K>> extends never
    ? Record<string, never>
    : { [P in ExtractParamNames<RoutePath<K>>]: string };

/**
 * Check if a route has params.
 */
type HasParams<K extends RouteKey> =
  ExtractParamNames<RoutePath<K>> extends never ? false : true;

// =============================================================================
// AppLink COMPONENT - The Star of the Show
// =============================================================================

/**
 * Props for routes WITHOUT params (like 'dashboard', 'settings')
 */
type AppLinkPropsNoParams<K extends RouteKey> = {
  to: K;
  activeClassName?: string;
  inactiveClassName?: string;
  matchChildren?: boolean;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'href'>;

/**
 * Props for routes WITH params (like 'project', 'blogPost')
 */
type AppLinkPropsWithParams<K extends RouteKey> = {
  to: K;
  activeClassName?: string;
  inactiveClassName?: string;
  matchChildren?: boolean;
  children: ReactNode;
} & RouteParams<K> & Omit<ComponentPropsWithoutRef<typeof Link>, 'href'>;

/**
 * Combined props type with conditional params requirement.
 */
type AppLinkProps<K extends RouteKey> =
  HasParams<K> extends true
    ? AppLinkPropsWithParams<K>
    : AppLinkPropsNoParams<K>;

/**
 * Type-safe navigation component with IDE autocomplete.
 *
 * @example
 * // Static route - no params needed
 * <AppLink to="dashboard">Dashboard</AppLink>
 *
 * @example
 * // Dynamic route - params required (IDE will show which ones!)
 * <AppLink to="project" projectId={project.id}>
 *   {project.name}
 * </AppLink>
 *
 * @example
 * // With active styling
 * <AppLink
 *   to="settings"
 *   activeClassName="bg-violet-600 text-white"
 *   inactiveClassName="text-gray-500"
 * >
 *   Settings
 * </AppLink>
 *
 * @example
 * // Match child routes too
 * <AppLink to="settings" matchChildren>
 *   Settings {/* Active when on /settings/account too *}
 * </AppLink>
 */
function AppLinkInner<K extends RouteKey>(
  props: AppLinkProps<K>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const {
    to,
    activeClassName,
    inactiveClassName,
    matchChildren = false,
    children,
    className,
    ...linkProps
  } = props as AppLinkPropsWithParams<K>;

  const pathname = usePathname();

  // Extract route params from props
  const routeDef = ROUTE_TREE[to];
  const paramNames = [...routeDef.path.matchAll(/:(\w+)/g)].map(m => m[1]);

  // Build params object from props
  const params: Record<string, string> = {};
  for (const name of paramNames) {
    const value = (props as Record<string, unknown>)[name];
    if (typeof value === 'string') {
      params[name] = value;
    }
  }

  // Generate href using the route builder
  const href = useMemo(() => {
    if (paramNames.length === 0) {
      return (route as unknown as Record<string, () => string>)[to]();
    }
    return (route as unknown as Record<string, (p: Record<string, string>) => string>)[to](params);
  }, [to, params, paramNames.length]);

  // Check if active
  const isActive = useMemo(() => {
    return routes.isActive(href, pathname || '', matchChildren);
  }, [href, pathname, matchChildren]);

  // Compute final className
  const finalClassName = useMemo(() => {
    const classes: string[] = [];
    if (className) classes.push(className);
    if (isActive && activeClassName) classes.push(activeClassName);
    if (!isActive && inactiveClassName) classes.push(inactiveClassName);
    return classes.join(' ') || undefined;
  }, [className, isActive, activeClassName, inactiveClassName]);

  return (
    <Link
      ref={ref}
      href={href}
      className={finalClassName}
      data-active={isActive || undefined}
      aria-current={isActive ? 'page' : undefined}
      {...linkProps}
    >
      {children}
    </Link>
  );
}

/**
 * Type-safe navigation component.
 *
 * IDE will autocomplete route names and show required params!
 */
export const AppLink = forwardRef(AppLinkInner) as unknown as <K extends RouteKey>(
  props: AppLinkProps<K> & { ref?: React.ForwardedRef<HTMLAnchorElement> }
) => React.ReactElement;

// =============================================================================
// useRoute HOOK - Current Route Info
// =============================================================================

/**
 * Subscribe to pathname changes.
 */
function subscribeToPathname(callback: () => void): () => void {
  // Listen for popstate (back/forward)
  window.addEventListener('popstate', callback);

  // Listen for custom navigation events
  window.addEventListener('olympus:navigate', callback);

  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('olympus:navigate', callback);
  };
}

/**
 * Get current pathname (SSR-safe).
 */
function getPathnameSnapshot(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

/**
 * Server snapshot for SSR.
 */
function getServerSnapshot(): string {
  return '/';
}

export interface UseRouteResult {
  /** Current URL pathname */
  pathname: string;
  /** Matched route info, or null if no match */
  match: RouteMatch | null;
  /** Current route key, or null */
  routeKey: RouteKey | null;
  /** Route params extracted from URL */
  params: Record<string, string>;
  /** Route title (from ROUTE_TREE) */
  title: string | null;
  /** Whether current route requires auth */
  requiresAuth: boolean;
  /** Check if a specific route is active */
  isActive: (routeKey: RouteKey, matchChildren?: boolean) => boolean;
}

/**
 * Hook to get current route information.
 *
 * @example
 * function Header() {
 *   const { routeKey, title, params, isActive } = useRoute();
 *
 *   return (
 *     <header>
 *       <h1>{title}</h1>
 *       {routeKey === 'project' && <span>Project: {params.projectId}</span>}
 *       <nav>
 *         <a className={isActive('dashboard') ? 'active' : ''}>Dashboard</a>
 *       </nav>
 *     </header>
 *   );
 * }
 */
export function useRoute(): UseRouteResult {
  // Use Next.js pathname for SSR compatibility
  const nextPathname = usePathname();

  // Also subscribe to browser changes for CSR updates
  const browserPathname = useSyncExternalStore(
    subscribeToPathname,
    getPathnameSnapshot,
    getServerSnapshot
  );

  // Prefer Next.js pathname (more reliable)
  const pathname = nextPathname || browserPathname;

  // Memoize the match to avoid recalculating on every render
  const match = useMemo(() => matchRoute(pathname), [pathname]);

  // Build the result object
  const result = useMemo((): UseRouteResult => {
    const routeKey = match?.key ?? null;
    const params = match?.params ?? {};
    const title = match?.title ?? null;
    const requiresAuth = match?.auth === 'authenticated' || match?.auth === 'admin';

    const isActive = (key: RouteKey, matchChildren = false): boolean => {
      const targetPath = ROUTE_TREE[key].path;
      // For static routes, use the path directly
      if (!targetPath.includes(':')) {
        return routes.isActive(targetPath, pathname, matchChildren);
      }
      // For dynamic routes, check route key hierarchy
      if (matchChildren) {
        let current: RouteKey | null = routeKey;
        while (current) {
          if (current === key) return true;
          const compiled = ROUTE_TREE[current];
          current = compiled.parent as RouteKey | null;
        }
        return false;
      }
      return routeKey === key;
    };

    return {
      pathname,
      match,
      routeKey,
      params,
      title,
      requiresAuth,
      isActive,
    };
  }, [pathname, match]);

  return result;
}

// =============================================================================
// useBreadcrumbs HOOK - Auto-generated Breadcrumb Trail
// =============================================================================

export interface UseBreadcrumbsOptions {
  /** Override titles for specific routes */
  titleOverrides?: Record<string, string>;
  /** Include home/root in breadcrumbs */
  includeHome?: boolean;
}

/**
 * Hook to get breadcrumbs for current route.
 *
 * @example
 * function Breadcrumbs() {
 *   const breadcrumbs = useBreadcrumbs({
 *     titleOverrides: { project: projectName }
 *   });
 *
 *   return (
 *     <nav aria-label="Breadcrumb">
 *       <ol className="flex gap-2">
 *         {breadcrumbs.map((crumb, i) => (
 *           <li key={crumb.key}>
 *             {crumb.isLast ? (
 *               <span aria-current="page">{crumb.title}</span>
 *             ) : (
 *               <AppLink to={crumb.key as RouteKey}>{crumb.title}</AppLink>
 *             )}
 *             {!crumb.isLast && <span>/</span>}
 *           </li>
 *         ))}
 *       </ol>
 *     </nav>
 *   );
 * }
 */
export function useBreadcrumbs(options: UseBreadcrumbsOptions = {}): Breadcrumb[] {
  const { titleOverrides, includeHome = false } = options;
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const crumbs = getBreadcrumbs(pathname || '/', titleOverrides);

    if (!includeHome) {
      // Remove 'home' from breadcrumbs if it's there
      return crumbs.filter(c => c.key !== 'home');
    }

    return crumbs;
  }, [pathname, titleOverrides, includeHome]);

  return breadcrumbs;
}

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Prefetch a route for faster navigation.
 *
 * @example
 * // Prefetch on hover
 * <div onMouseEnter={() => prefetchRoute('project', { projectId: '123' })}>
 *   <AppLink to="project" projectId="123">View Project</AppLink>
 * </div>
 */
export function prefetchRoute<K extends RouteKey>(
  routeKey: K,
  ...args: HasParams<K> extends true ? [RouteParams<K>] : []
): void {
  if (typeof window === 'undefined') return;

  const routeDef = ROUTE_TREE[routeKey];
  let href: string = routeDef.path;

  // Substitute params if provided
  if (args.length > 0 && args[0]) {
    const params = args[0] as Record<string, string>;
    for (const [key, value] of Object.entries(params)) {
      href = href.replace(`:${key}`, value);
    }
  }

  // Create a prefetch link
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'document';
  document.head.appendChild(link);
}

// =============================================================================
// NAVIGATION UTILITIES
// =============================================================================

/**
 * Programmatic navigation with type safety.
 *
 * @example
 * const { navigateTo } = useNavigation();
 *
 * // Navigate to static route
 * navigateTo('dashboard');
 *
 * // Navigate to dynamic route
 * navigateTo('project', { projectId: '123' });
 */
export function useNavigation() {
  const navigateTo = useCallback(<K extends RouteKey>(
    routeKey: K,
    ...args: HasParams<K> extends true ? [RouteParams<K>] : []
  ): void => {
    const routeDef = ROUTE_TREE[routeKey];
    let href: string = routeDef.path;

    if (args.length > 0 && args[0]) {
      const params = args[0] as Record<string, string>;
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`:${key}`, value);
      }
    }

    window.location.href = href;
  }, []);

  const navigateBack = useCallback((): void => {
    window.history.back();
  }, []);

  const navigateForward = useCallback((): void => {
    window.history.forward();
  }, []);

  return { navigateTo, navigateBack, navigateForward };
}
