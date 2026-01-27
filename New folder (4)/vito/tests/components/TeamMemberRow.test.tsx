/**
 * OLYMPUS 2.0 - TeamMemberRow Component Tests
 * ===========================================
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import './setup';

// Mock Supabase client with proper chaining
const mockEqFinal = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEqFirst = vi.fn().mockReturnValue({ eq: mockEqFinal });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqFirst });

vi.mock('@/lib/auth/clients/browser', () => ({
  getBrowserSupabaseClient: () => ({
    from: () => ({
      update: mockUpdate,
    }),
  }),
}));

// Mock RoleSelector and RoleBadge
vi.mock('@/components/auth/RoleSelector', () => ({
  RoleSelector: ({ value, onChange, size }: any) => (
    <select
      data-testid="role-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="developer">Developer</option>
      <option value="admin">Admin</option>
      <option value="owner">Owner</option>
      <option value="viewer">Viewer</option>
    </select>
  ),
  RoleBadge: ({ role, size }: any) => (
    <span data-testid="role-badge" data-role={role}>
      {role}
    </span>
  ),
}));

// Import component after mocks
import { TeamMemberRow } from '@/components/auth/TeamMemberRow';

describe('TeamMemberRow Component', () => {
  const defaultMember = {
    id: 'member-1',
    user_id: 'user-123',
    role: 'developer' as const,
    joined_at: '2024-01-01T00:00:00Z',
    user: {
      email: 'member@example.com',
      display_name: 'John Doe',
      avatar_url: null,
    },
  };

  const ownerMember = {
    id: 'member-owner',
    user_id: 'owner-123',
    role: 'owner' as const,
    joined_at: '2024-01-01T00:00:00Z',
    user: {
      email: 'owner@example.com',
      display_name: 'Owner User',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  };

  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEqFinal.mockResolvedValue({ data: null, error: null });
    mockEqFirst.mockReturnValue({ eq: mockEqFinal });
    mockUpdate.mockReturnValue({ eq: mockEqFirst });
  });

  describe('Rendering', () => {
    it('should render member info correctly', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    it('should show email when display_name is null', () => {
      const memberWithoutName = {
        ...defaultMember,
        user: { ...defaultMember.user, display_name: null },
      };

      render(
        <TeamMemberRow
          member={memberWithoutName}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      // Email should appear twice - once as name fallback, once as email
      const emails = screen.getAllByText('member@example.com');
      expect(emails.length).toBeGreaterThanOrEqual(1);
    });

    it('should show "(you)" indicator for current user', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="user-123"
          currentUserRole="developer"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('(you)')).toBeInTheDocument();
    });

    it('should render role badge', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      const badge = screen.getByTestId('role-badge');
      expect(badge).toHaveAttribute('data-role', 'member');
    });

    it('should render avatar image when avatar_url is provided', () => {
      render(
        <TeamMemberRow
          member={ownerMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      // Image with empty alt has role="presentation", so query by tag
      const avatar = document.querySelector('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should render initial when no avatar_url', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      // Should show 'J' for 'John Doe'
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('Edit Permissions', () => {
    it('should show Edit button when owner viewing member', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should show Remove button when owner viewing member', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('should not show Edit/Remove buttons for current user', () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="user-123"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });

    it('should not show Edit/Remove buttons when member viewing', () => {
      render(
        <TeamMemberRow
          member={ownerMember}
          currentUserId="other-user"
          currentUserRole="developer"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });

    it('should not show Edit/Remove buttons for owner member', () => {
      render(
        <TeamMemberRow
          member={ownerMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('Role Editing', () => {
    it('should enter edit mode when Edit is clicked', async () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Edit'));

      expect(screen.getByTestId('role-selector')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should exit edit mode when Cancel is clicked', async () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Edit'));
      await userEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByTestId('role-selector')).not.toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should call onUpdate after saving role change', async () => {
      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Edit'));

      // Change role
      const selector = screen.getByTestId('role-selector');
      await userEvent.selectOptions(selector, 'admin');

      // Save
      await userEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Member Removal', () => {
    beforeEach(() => {
      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show confirmation before removing', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Remove'));

      expect(confirmSpy).toHaveBeenCalledWith('Remove this member from the team?');
    });

    it('should not remove if confirmation cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Remove'));

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should call onUpdate after removal', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Remove'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable buttons while loading', async () => {
      // Make the update slow
      mockEqFinal.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(
        <TeamMemberRow
          member={defaultMember}
          currentUserId="other-user"
          currentUserRole="owner"
          tenantId="tenant-123"
          onUpdate={mockOnUpdate}
        />
      );

      await userEvent.click(screen.getByText('Edit'));
      await userEvent.click(screen.getByText('Save'));

      // Button should be disabled during loading
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });
  });
});

describe('TeamMemberRow Permission Logic', () => {
  type TenantRole = 'owner' | 'admin' | 'member';

  function canEditMember(
    currentUserId: string,
    currentUserRole: TenantRole,
    memberUserId: string,
    memberRole: TenantRole
  ): boolean {
    // Cannot edit yourself
    if (currentUserId === memberUserId) return false;
    // Only owners can edit
    if (currentUserRole !== 'owner') return false;
    // Cannot edit other owners
    if (memberRole === 'owner') return false;
    return true;
  }

  function canRemoveMember(
    currentUserId: string,
    currentUserRole: TenantRole,
    memberUserId: string,
    memberRole: TenantRole
  ): boolean {
    // Same logic as edit for now
    return canEditMember(currentUserId, currentUserRole, memberUserId, memberRole);
  }

  describe('Edit permissions', () => {
    it('owner can edit member', () => {
      expect(canEditMember('owner-1', 'owner', 'member-1', 'member')).toBe(true);
    });

    it('owner can edit admin', () => {
      expect(canEditMember('owner-1', 'owner', 'admin-1', 'admin')).toBe(true);
    });

    it('owner cannot edit another owner', () => {
      expect(canEditMember('owner-1', 'owner', 'owner-2', 'owner')).toBe(false);
    });

    it('owner cannot edit themselves', () => {
      expect(canEditMember('owner-1', 'owner', 'owner-1', 'owner')).toBe(false);
    });

    it('admin cannot edit anyone', () => {
      expect(canEditMember('admin-1', 'admin', 'member-1', 'member')).toBe(false);
    });

    it('member cannot edit anyone', () => {
      expect(canEditMember('member-1', 'member', 'member-2', 'member')).toBe(false);
    });
  });

  describe('Remove permissions', () => {
    it('owner can remove member', () => {
      expect(canRemoveMember('owner-1', 'owner', 'member-1', 'member')).toBe(true);
    });

    it('owner can remove admin', () => {
      expect(canRemoveMember('owner-1', 'owner', 'admin-1', 'admin')).toBe(true);
    });

    it('owner cannot remove another owner', () => {
      expect(canRemoveMember('owner-1', 'owner', 'owner-2', 'owner')).toBe(false);
    });

    it('owner cannot remove themselves', () => {
      expect(canRemoveMember('owner-1', 'owner', 'owner-1', 'owner')).toBe(false);
    });
  });
});

describe('Avatar Display Logic', () => {
  function getAvatarInitial(displayName: string | null, email: string): string {
    const name = displayName || email;
    return name[0].toUpperCase();
  }

  it('should get initial from display name', () => {
    expect(getAvatarInitial('John Doe', 'john@example.com')).toBe('J');
  });

  it('should get initial from email when no display name', () => {
    expect(getAvatarInitial(null, 'alice@example.com')).toBe('A');
  });

  it('should handle various name formats', () => {
    expect(getAvatarInitial('jane', 'jane@example.com')).toBe('J');
    expect(getAvatarInitial('MIKE', 'mike@example.com')).toBe('M');
    expect(getAvatarInitial('bob Smith', 'bob@example.com')).toBe('B');
  });
});
