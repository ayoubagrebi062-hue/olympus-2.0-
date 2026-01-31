/**
 * Repository Pattern Implementation (STUB)
 *
 * STATUS: This file contains stub implementations for type compatibility.
 * ACTUAL DATA ACCESS: Uses Supabase client directly in auth/ and db/ modules.
 *
 * This file exists for legacy compatibility and may be removed when
 * all consumers are migrated to direct Supabase access.
 *
 * @deprecated Use Supabase client from @/lib/auth/clients or @/lib/db instead
 */

import { Project, User } from './models';

// Simple in-memory cache stub
const cacheStore: Map<string, unknown> = new Map();

const cache = {
  get<T>(key: string): T | undefined {
    return cacheStore.get(key) as T | undefined;
  },
  set<T>(key: string, value: T): void {
    cacheStore.set(key, value);
  },
  invalidate(key: string): void {
    cacheStore.delete(key);
  },
};

/**
 * @deprecated Use Supabase client directly instead
 */
export class Repository {
  async getUserById(id: string): Promise<User | null> {
    const cacheKey = `user_${id}`;
    const cachedUser = cache.get<User>(cacheKey);
    if (cachedUser) return cachedUser;

    // Stub: Returns null. Use Supabase client for actual queries.
    console.log(`[Repository] getUserById(${id}) - stub returning null`);
    return null;
  }

  async createUser(data: User): Promise<User> {
    // Stub: Returns input unchanged. Use Supabase client for actual mutations.
    console.log(`[Repository] createUser - stub passthrough`);
    cache.invalidate(`user_${data.id}`);
    return data;
  }

  async getProjectById(id: string): Promise<Project | null> {
    const cacheKey = `project_${id}`;
    const cachedProject = cache.get<Project>(cacheKey);
    if (cachedProject) return cachedProject;

    // Stub: Returns null. Use Supabase client for actual queries.
    console.log(`[Repository] getProjectById(${id}) - stub returning null`);
    return null;
  }

  async createProject(data: Project): Promise<Project> {
    // Stub: Returns input unchanged. Use Supabase client for actual mutations.
    console.log(`[Repository] createProject - stub passthrough`);
    cache.invalidate(`project_${data.id}`);
    return data;
  }

  async softDeleteUser(id: string): Promise<void> {
    // Stub: No-op. Use Supabase client for actual mutations.
    console.log(`[Repository] softDeleteUser(${id}) - stub no-op`);
    cache.invalidate(`user_${id}`);
  }

  async softDeleteProject(id: string): Promise<void> {
    // Stub: No-op. Use Supabase client for actual mutations.
    console.log(`[Repository] softDeleteProject(${id}) - stub no-op`);
    cache.invalidate(`project_${id}`);
  }
}

export const repository = new Repository();
