// Full component code here...
'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '../src/lib/utils';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export interface NotificationsHandle {
  dismissAll: () => void;
}

const Notifications = forwardRef<NotificationsHandle, NotificationsProps>(({ notifications, onDismiss }, ref) => {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  useImperativeHandle(ref, () => ({
    dismissAll: () => setVisibleNotifications([]),
  }), []);

  const handleDismiss = (id: string) => {
    setVisibleNotifications((prev) => prev.filter((n) => n.id !== id));
    onDismiss(id);
  };

  return (
    <div className="fixed bottom-4 right-4 gap-4">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'p-4 rounded-lg shadow-[0_0_30px_rgba(124,58,237,0.2)] transition-all duration-200',
            'bg-white/[0.03] backdrop-blur-xl hover:bg-white/10 hover:-translate-y-0.5 focus:ring-2 focus:ring-violet-500',
            {
              'bg-green-600': notification.type === 'success',
              'bg-yellow-600': notification.type === 'warning',
              'bg-red-600': notification.type === 'error',
              'bg-violet-600': notification.type === 'info',
            }
          )}
          role="alert"
          aria-live="assertive"
          tabIndex={0}
        >
          <div className="flex justify-between items-center">
            <span className="text-white text-base font-medium">
              {notification.message}
            </span>
            <button
              onClick={() => handleDismiss(notification.id)}
              className="ml-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});

Notifications.displayName = 'Notifications';

export { Notifications };
export type { NotificationsProps, Notification };
