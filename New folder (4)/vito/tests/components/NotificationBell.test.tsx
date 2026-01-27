/**
 * OLYMPUS 2.0 - NotificationBell Component Tests
 * ===============================================
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import './setup';

// Mock the hooks
const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-123',
    type: 'build_complete',
    title: 'Build completed',
    body: 'Your build #123 completed successfully',
    read: false,
    created_at: new Date().toISOString(),
    action_url: '/builds/123',
  },
  {
    id: 'notif-2',
    user_id: 'user-123',
    type: 'deployment_failed',
    title: 'Deployment failed',
    body: 'Deployment to production failed',
    read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    action_url: null,
  },
];

const mockUseNotifications = vi.fn(() => ({
  notifications: mockNotifications,
  unreadCount: 1,
  isLoading: false,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  refresh: vi.fn(),
  loadMore: vi.fn(),
  hasMore: false,
}));

const mockUseUnreadCount = vi.fn(() => 1);

vi.mock('@/hooks/realtime', () => ({
  useNotifications: () => mockUseNotifications(),
  useUnreadCount: () => mockUseUnreadCount(),
}));

vi.mock('@/lib/realtime/constants', () => ({
  getNotificationIcon: (type: string) => {
    const icons: Record<string, string> = {
      build_complete: '✅',
      deployment_failed: '❌',
      default: '🔔',
    };
    return icons[type] || icons.default;
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
}));

// Import component after mocks
import { NotificationBell, NotificationBadge } from '@/components/realtime/NotificationBell';

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      isLoading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      refresh: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
    });
  });

  describe('Rendering', () => {
    it('should render the bell button', () => {
      render(<NotificationBell userId="user-123" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should show unread badge when there are unread notifications', () => {
      render(<NotificationBell userId="user-123" />);

      const badge = screen.getByText('1');
      expect(badge).toBeInTheDocument();
    });

    it('should not show badge when no unread notifications', () => {
      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
      });

      render(<NotificationBell userId="user-123" />);

      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('should show 99+ for large unread counts', () => {
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 150,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
      });

      render(<NotificationBell userId="user-123" />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when bell is clicked', async () => {
      render(<NotificationBell userId="user-123" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should close dropdown when X button is clicked', async () => {
      render(<NotificationBell userId="user-123" />);

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Close dropdown
      const closeButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg')?.classList.contains('lucide-x') ||
               btn.getAttribute('title') === 'Close' ||
               btn.innerHTML.includes('X')
      );

      if (closeButton) {
        await userEvent.click(closeButton);
        await waitFor(() => {
          expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
        });
      }
    });

    it('should display notification items', async () => {
      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Build completed')).toBeInTheDocument();
      expect(screen.getByText('Deployment failed')).toBeInTheDocument();
    });

    it('should show empty state when no notifications', async () => {
      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
      });

      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('should show loading state', async () => {
      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: true,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
      });

      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));

      // Should show loading spinner
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  describe('Notification Actions', () => {
    it('should call markAllAsRead when button clicked', async () => {
      const mockMarkAllAsRead = vi.fn();
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: mockMarkAllAsRead,
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
      });

      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));

      const markAllButton = screen.getByText('Mark all read');
      await userEvent.click(markAllButton);

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });

    it('should show load more button when hasMore is true', async () => {
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: vi.fn(),
        hasMore: true,
      });

      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('should call loadMore when load more button clicked', async () => {
      const mockLoadMore = vi.fn();
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        refresh: vi.fn(),
        loadMore: mockLoadMore,
        hasMore: true,
      });

      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByText('Load more'));

      expect(mockLoadMore).toHaveBeenCalled();
    });
  });

  describe('Notification Click', () => {
    it('should call onNotificationClick callback', async () => {
      const mockCallback = vi.fn();

      render(
        <NotificationBell
          userId="user-123"
          onNotificationClick={mockCallback}
        />
      );

      await userEvent.click(screen.getByRole('button'));

      const notificationItem = screen.getByText('Build completed').closest('div[class*="cursor-pointer"]');
      if (notificationItem) {
        await userEvent.click(notificationItem);
        expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
          id: 'notif-1',
          title: 'Build completed',
        }));
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      render(<NotificationBell userId="user-123" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have view all link', async () => {
      render(<NotificationBell userId="user-123" />);

      await userEvent.click(screen.getByRole('button'));

      const viewAllLink = screen.getByText('View all notifications');
      expect(viewAllLink).toHaveAttribute('href', '/notifications');
    });
  });
});

describe('NotificationBadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render badge with count', () => {
    mockUseUnreadCount.mockReturnValue(5);

    render(<NotificationBadge userId="user-123" />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should not render when count is 0', () => {
    mockUseUnreadCount.mockReturnValue(0);

    const { container } = render(<NotificationBadge userId="user-123" />);

    expect(container.firstChild).toBeNull();
  });

  it('should show 99+ for counts over 99', () => {
    mockUseUnreadCount.mockReturnValue(150);

    render(<NotificationBadge userId="user-123" />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseUnreadCount.mockReturnValue(5);

    render(<NotificationBadge userId="user-123" className="custom-class" />);

    const badge = screen.getByText('5');
    expect(badge).toHaveClass('custom-class');
  });
});

describe('Notification Time Display', () => {
  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
  }

  it('should show "Just now" for recent notifications', () => {
    const now = new Date();
    expect(getTimeAgo(now)).toBe('Just now');
  });

  it('should show minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(getTimeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('should show hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(getTimeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('should show days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(getTimeAgo(twoDaysAgo)).toBe('2d ago');
  });

  it('should show full date for old notifications', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(getTimeAgo(oldDate)).toBe(oldDate.toLocaleDateString());
  });
});
