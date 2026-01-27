/**
 * OLYMPUS 2.0 - API Client Auth
 */

import { getApiClient } from './core';
import type { User, LoginResponse } from './types';

export const auth = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return getApiClient().post('/api/auth/login', { email, password });
  },

  async signup(email: string, password: string, name: string): Promise<{ user: User; message: string }> {
    return getApiClient().post('/api/auth/signup', { email, password, name, acceptTerms: true });
  },

  async logout(): Promise<void> {
    await getApiClient().post('/api/auth/logout');
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return getApiClient().post('/api/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return getApiClient().post('/api/auth/reset-password', { token, password, confirmPassword: password });
  },

  async verifyEmail(token: string): Promise<{ message: string; user?: User }> {
    return getApiClient().post('/api/auth/verify-email', { token });
  },

  async refresh(): Promise<{ session: { accessToken: string; refreshToken: string; expiresAt: number } }> {
    return getApiClient().post('/api/auth/refresh');
  },

  async me(): Promise<{ user: User; tenants: Array<{ id: string; name: string; slug: string; role: string }> }> {
    return getApiClient().get('/api/auth/me');
  },

  async updateProfile(data: { name?: string; avatar?: string; timezone?: string }): Promise<{ user: User }> {
    return getApiClient().patch('/api/auth/me', data);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return getApiClient().post('/api/auth/change-password', { currentPassword, newPassword, confirmPassword: newPassword });
  },
};
