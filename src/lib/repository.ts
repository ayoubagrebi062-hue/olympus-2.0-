// Repository pattern implementation - stub
// This project uses Supabase instead of Prisma

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

export class Repository {
  // Stub implementations - replace with Supabase queries
  async getUserById(id: string): Promise<User | null> {
    const cacheKey = `user_${id}`;
    const cachedUser = cache.get<User>(cacheKey);
    if (cachedUser) return cachedUser;

    // TODO: Replace with Supabase query
    console.log(`[Repository] getUserById(${id}) - stub`);
    return null;
  }

  async createUser(data: User): Promise<User> {
    // TODO: Replace with Supabase query
    console.log(`[Repository] createUser - stub`);
    cache.invalidate(`user_${data.id}`);
    return data;
  }

  async getProjectById(id: string): Promise<Project | null> {
    const cacheKey = `project_${id}`;
    const cachedProject = cache.get<Project>(cacheKey);
    if (cachedProject) return cachedProject;

    // TODO: Replace with Supabase query
    console.log(`[Repository] getProjectById(${id}) - stub`);
    return null;
  }

  async createProject(data: Project): Promise<Project> {
    // TODO: Replace with Supabase query
    console.log(`[Repository] createProject - stub`);
    cache.invalidate(`project_${data.id}`);
    return data;
  }

  async softDeleteUser(id: string): Promise<void> {
    // TODO: Replace with Supabase query
    console.log(`[Repository] softDeleteUser(${id}) - stub`);
    cache.invalidate(`user_${id}`);
  }

  async softDeleteProject(id: string): Promise<void> {
    // TODO: Replace with Supabase query
    console.log(`[Repository] softDeleteProject(${id}) - stub`);
    cache.invalidate(`project_${id}`);
  }
}

export const repository = new Repository();
